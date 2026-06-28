import { useEffect } from 'react'
import { useStore } from '../store'

export function useMouse() {
  const setCursor = useStore((s) => s.setCursor)

  useEffect(() => {
    const onMove = (e) => {
      const x = (e.clientX / window.innerWidth) * 2 - 1
      const y = -((e.clientY / window.innerHeight) * 2 - 1)
      setCursor(x, y)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [setCursor])
}
