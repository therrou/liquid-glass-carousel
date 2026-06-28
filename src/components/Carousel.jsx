import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useStore } from '../store'

const IMAGE_W = 320
const IMAGE_H = 440
const GAP = 15
const N = 10
const SEEDS = [10, 42, 67, 23, 88, 5, 71, 33, 55, 19]

function getClipPath(shape, lensW, lensH) {
  const w = window.innerWidth
  const h = window.innerHeight
  const cx = w / 2
  const cy = h * 0.43
  const hw = (w * lensW) / 200
  const hh = (h * lensH) / 200

  if (shape === 'lens') {
    // Control points at 60% of hw for a wider, more open eye shape
    return `path('M ${cx - hw} ${cy} C ${cx - hw * 0.6} ${cy - hh * 1.05}, ${cx + hw * 0.6} ${cy - hh * 1.05}, ${cx + hw} ${cy} C ${cx + hw * 0.6} ${cy + hh * 1.05}, ${cx - hw * 0.6} ${cy + hh * 1.05}, ${cx - hw} ${cy} Z')`
  } else if (shape === 'arc') {
    const r = Math.min(hw, hh) * 0.1
    const x1 = cx - hw, y1 = cy - hh, x2 = cx + hw, y2 = cy + hh
    return `path('M ${x1 + r} ${y1} Q ${x1} ${y1} ${x1} ${y1 + r} L ${x1} ${y2 - r} Q ${x1} ${y2} ${x1 + r} ${y2} L ${x2 - r} ${y2} Q ${x2} ${y2} ${x2} ${y2 - r} L ${x2} ${y1 + r} Q ${x2} ${y1} ${x2 - r} ${y1} Z')`
  }
  return `path('M ${cx - hw} ${cy - hh} L ${cx + hw} ${cy - hh} L ${cx + hw} ${cy + hh} L ${cx - hw} ${cy + hh} Z')`
}

export default function Carousel({ shape = 'lens', lensW = 88, lensH = 55 }) {
  const scrollX = useStore((s) => s.scrollX)
  const [clipPath, setClipPath] = useState('')

  // Smooth spring for scroll
  const mvX = useMotionValue(-window.innerWidth * 0.7)
  const smoothX = useSpring(mvX, { stiffness: 55, damping: 22, mass: 0.8 })

  // Clip-path reactive to shape/size params
  useEffect(() => {
    const compute = () => setClipPath(getClipPath(shape, lensW, lensH))
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [shape, lensW, lensH])

  // Entry: delay then spring to 0, then follow scrollX
  const entryDone = useRef(false)
  useEffect(() => {
    // Short delay then release to normal scroll position
    const t = setTimeout(() => {
      entryDone.current = true
      mvX.set(scrollX)
    }, 600)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // After entry: track scrollX
  useEffect(() => {
    if (entryDone.current) mvX.set(scrollX)
  }, [scrollX, mvX])

  // Center strip: the leftmost image starts slightly left of center
  // so that ~3 images are visible centered initially
  const stripOffsetX = window.innerWidth / 2 - IMAGE_W / 2

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        clipPath,
        transition: 'clip-path 0.65s cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      {/* Vertical centering at 43% */}
      <div
        style={{
          position: 'absolute',
          top: '43%',
          left: 0,
          transform: 'translateY(-50%)',
          overflow: 'visible',
          willChange: 'transform',
        }}
      >
        <motion.div
          style={{
            display: 'flex',
            gap: GAP,
            x: smoothX,
            paddingLeft: stripOffsetX,
          }}
        >
          {SEEDS.map((seed, i) => (
            <motion.div
              key={seed}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 + i * 0.06 }}
              style={{
                width: IMAGE_W,
                height: IMAGE_H,
                flexShrink: 0,
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <img
                src={`https://picsum.photos/seed/${seed}/640/880`}
                alt={`Slide ${i + 1}`}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  display: 'block',
                  pointerEvents: 'none',
                  userSelect: 'none',
                }}
                draggable={false}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
