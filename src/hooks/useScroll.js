import { useEffect, useRef } from 'react'
import { useStore } from '../store'
import { N } from '../data'

export function useScroll(sensitivity = 1.2, imageWidth = 320) {
  const addScrollX = useStore((s) => s.addScrollX)
  const setCurrentIndex = useStore((s) => s.setCurrentIndex)
  const setDirection = useStore((s) => s.setDirection)
  const step = imageWidth + 15
  const lastIdx = useRef(-1)
  const lastRaw = useRef(0)
  const snapTimer = useRef(null)

  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault()
      addScrollX(-e.deltaY * sensitivity * 0.5)
      // Snap to the nearest slide once the wheel goes idle.
      if (snapTimer.current) clearTimeout(snapTimer.current)
      snapTimer.current = setTimeout(() => {
        const sx = useStore.getState().scrollX
        useStore.getState().setScrollX(Math.round(sx / step) * step)
      }, 140)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (snapTimer.current) clearTimeout(snapTimer.current)
    }
  }, [sensitivity, step, addScrollX])

  useEffect(() => {
    return useStore.subscribe((state) => {
      // Infinite wrap: scrolling left advances the index, modulo image count.
      const raw = Math.round(-state.scrollX / step)
      if (raw === lastRaw.current) return
      // Update refs BEFORE any set() — these setters re-trigger this subscriber,
      // so the guard above must already be satisfied to avoid infinite recursion.
      const dir = raw > lastRaw.current ? 1 : -1
      lastRaw.current = raw
      const idx = ((raw % N) + N) % N
      setDirection(dir)
      if (idx !== lastIdx.current) {
        lastIdx.current = idx
        setCurrentIndex(idx)
      }
    })
  }, [step, setCurrentIndex, setDirection])
}
