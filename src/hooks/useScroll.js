import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { N } from '../data'

export function useScroll(sensitivity = 1.2, imageWidth = 320) {
  const addScrollX = useStore((s) => s.addScrollX)
  const setCurrentIndex = useStore((s) => s.setCurrentIndex)
  const step = imageWidth + 15
  const lastIdx = useRef(-1)

  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault()
      addScrollX(-e.deltaY * sensitivity * 0.5)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [sensitivity, addScrollX])

  useEffect(() => {
    return useStore.subscribe((state) => {
      // Infinite wrap: scrolling left advances the index, modulo image count.
      const raw = Math.round(-state.scrollX / step)
      const idx = ((raw % N) + N) % N
      if (idx !== lastIdx.current) {
        lastIdx.current = idx
        setCurrentIndex(idx)
      }
    })
  }, [step, setCurrentIndex])
}
