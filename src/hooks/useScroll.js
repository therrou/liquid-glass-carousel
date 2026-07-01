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

  const snapToNearest = () => {
    if (snapTimer.current) clearTimeout(snapTimer.current)
    snapTimer.current = setTimeout(() => {
      const sx = useStore.getState().scrollX
      useStore.getState().setScrollX(Math.round(sx / step) * step)
    }, 140)
  }

  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault()
      addScrollX(-e.deltaY * sensitivity * 0.5)
      // Snap to the nearest slide once the wheel goes idle.
      snapToNearest()
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      if (snapTimer.current) clearTimeout(snapTimer.current)
    }
  }, [sensitivity, step, addScrollX])

  // Touch/pen drag: wheel never fires from a touch swipe, so mobile needs its
  // own pointer-based path to move scrollX.
  useEffect(() => {
    const dragPointerId = { current: null }
    const lastX = { current: 0 }

    const onPointerDown = (e) => {
      if (e.pointerType === 'mouse') return
      dragPointerId.current = e.pointerId
      lastX.current = e.clientX
      if (snapTimer.current) clearTimeout(snapTimer.current)
    }
    const onPointerMove = (e) => {
      if (dragPointerId.current !== e.pointerId) return
      e.preventDefault()
      const dx = e.clientX - lastX.current
      lastX.current = e.clientX
      addScrollX(dx)
    }
    const endDrag = (e) => {
      if (dragPointerId.current !== e.pointerId) return
      dragPointerId.current = null
      snapToNearest()
    }

    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('pointermove', onPointerMove, { passive: false })
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', endDrag)
      window.removeEventListener('pointercancel', endDrag)
    }
  }, [step, addScrollX])

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
