import { useRef, useEffect, useState } from 'react'
import { useControls, button, Leva } from 'leva'
import { motion, AnimatePresence } from 'framer-motion'
import Scene from './components/Scene'
import { useScroll } from './hooks/useScroll'
import { useMouse } from './hooks/useMouse'
import { useStore } from './store'
import { SEEDS, N as TOTAL } from './data'
import './App.css'

const IMAGE_W = 320
const EASE = [0.16, 1, 0.3, 1]
const DEBUG = new URLSearchParams(window.location.search).get('debug') === 'true'

export default function App() {
  useMouse()

  const glassCtrl = useControls('Glass', {
    thickness: { value: 0.6, min: 0, max: 3, step: 0.05 },
    roughness: { value: 0.05, min: 0, max: 1, step: 0.01 },
    transmission: { value: 1, min: 0, max: 1, step: 0.05 },
    ior: { value: 1.55, min: 1, max: 2.5, step: 0.05 },
    chromaticAberration: { value: 0.75, min: 0, max: 3, step: 0.05 },
    distortion: { value: 0.10, min: 0, max: 2, step: 0.05 },
    distortionScale: { value: 0, min: 0, max: 1, step: 0.05 },
    temporalDistortion: { value: 0, min: 0, max: 1, step: 0.01 },
    iridescence: { value: 1, min: 0, max: 1, step: 0.05 },
    iridescenceIOR: { value: 1.5, min: 1, max: 2.33, step: 0.05 },
  })

  const prismCtrl = useControls('Prism Shape', {
    width: { value: 1.5, min: 0.4, max: 3, step: 0.05, label: 'Width' },
    height: { value: 2.3, min: 0.6, max: 4, step: 0.05, label: 'Height' },
    cornerRadius: { value: 0.57, min: 0.01, max: 1.5, step: 0.01, label: 'Corner Radius' },
    edge: { value: 0.05, min: 0, max: 0.35, step: 0.005, label: 'Edge (Bevel)' },
    depth: { value: 0.01, min: 0, max: 2, step: 0.05, label: 'Thickness' },
    prismScale: { value: 1.35, min: 0.3, max: 2.5, step: 0.05, label: 'Scale' },
    cursorInfluence: { value: 0.06, min: 0, max: 0.4, step: 0.01, label: 'Cursor Tilt' },
    entryDuration: { value: 0.8, min: 0.3, max: 5, step: 0.1, label: 'Entry Duration' },
  })

  const prismDebug = useControls('Prism Debug', {
    manualRotate: { value: false, label: 'Manual Rotate' },
    rotX: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Rotate X' },
    rotY: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Rotate Y' },
    rotZ: { value: 0, min: -Math.PI, max: Math.PI, step: 0.01, label: 'Rotate Z' },
  })

  // Intro easing as an editable cubic-bezier; default = easeOutCubic.
  const [introNonce, setIntroNonce] = useState(0)
  const introCtrl = useControls('Prism Intro', {
    easeX1: { value: 0.215, min: 0, max: 1, step: 0.005, label: 'Ease X1' },
    easeY1: { value: 0.61, min: -1, max: 2, step: 0.005, label: 'Ease Y1' },
    easeX2: { value: 0.355, min: 0, max: 1, step: 0.005, label: 'Ease X2' },
    easeY2: { value: 1.0, min: -1, max: 2, step: 0.005, label: 'Ease Y2' },
    replay: button(() => setIntroNonce((n) => n + 1)),
  })

  const [revealNonce, setRevealNonce] = useState(0)
  const carouselCtrl = useControls('Carousel', {
    lensLength: { value: 7, min: 2, max: 7, step: 0.1, label: 'Lens Length' },
    spanX: { value: 12.0, min: 3, max: 12, step: 0.1, label: 'Span X' },
    spanZ: { value: 8, min: 0, max: 8, step: 0.1, label: 'Recede Z' },
    envPow: { value: 2, min: 0.2, max: 2, step: 0.05, label: 'Taper' },
    twist: { value: 3.5, min: 0, max: 3.5, step: 0.05, label: 'Rope Twist' },
    revealDuration: { value: 1.1, min: 0.2, max: 5, step: 0.1, label: 'Reveal Duration' },
    revealDelay: { value: 0.2, min: 0, max: 3, step: 0.1, label: 'Reveal Delay' },
    revealBand: { value: 3.0, min: 0.5, max: 8, step: 0.1, label: 'Reveal Softness' },
    autoSlides: { value: 7, min: 0, max: 20, step: 1, label: 'Auto Slides' },
    autoSlideDuration: { value: 1.6, min: 0.5, max: 6, step: 0.1, label: 'Auto Slide Time' },
    replayReveal: button(() => setRevealNonce((n) => n + 1)),
  })

  const prismConfig = { ...glassCtrl, ...prismCtrl, ...prismDebug, ...introCtrl, introNonce }

  useScroll(1.2, IMAGE_W)

  const currentIndex = useStore((s) => s.currentIndex)

  const delay = (n) => ({ initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.7, delay: n } })

  return (
    <div className="app">
      <Leva collapsed titleBar={{ title: 'Controls' }} />

      {/* R3F: 3D carousel images + glass prism in one scene for real refraction */}
      <Scene prismConfig={prismConfig} carouselConfig={{ ...carouselCtrl, revealNonce }} />

      {/* <motion.div className="edition-label" {...delay(2.0)}>
        EDITION N°1
      </motion.div> */}

      <motion.header className="header" {...delay(1.9)}>
      
        <div className="header-center">
          <div className="header-meta">
            <span>06.28.26</span>
            <span>EXP N°001</span>
          </div>
        </div>
      </motion.header>

      <motion.div className="counter-area" {...delay(2.1)}>
        <div className="counter-thumb">
          <AnimatePresence mode="popLayout">
            <motion.img
              key={SEEDS[currentIndex]}
              src={`https://picsum.photos/seed/${SEEDS[currentIndex]}/120/90`}
              alt="current slide"
              initial={{ opacity: 0, scale: 1.15 }}
              animate={{ opacity: 0.85, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.55, ease: EASE }}
            />
          </AnimatePresence>
        </div>
        <div className="counter-num">
          <div className="counter-mask">
            <AnimatePresence mode="popLayout">
              <motion.span
                key={currentIndex}
                className="counter-current"
                initial={{ y: '105%', opacity: 0 }}
                animate={{ y: '0%', opacity: 1 }}
                exit={{ y: '-105%', opacity: 0 }}
                transition={{ duration: 0.5, ease: EASE }}
              >
                {String(currentIndex + 1).padStart(2, '0')}
              </motion.span>
            </AnimatePresence>
          </div>
          <span className="counter-total">/{TOTAL}</span>
        </div>
      </motion.div>

      {/* <motion.div className="archive-label" {...delay(2.2)}>
        ARCHIVE
      </motion.div> */}

      {/* <motion.footer className="footer" {...delay(2.3)}>
        <h1 className="title">
          Silent<br />Frequency
        </h1>
      </motion.footer> */}

      <Cursor />
    </div>
  )
}

function Cursor() {
  const ref = useRef(null)

  useEffect(() => {
    const onMove = (e) => {
      if (ref.current) {
        ref.current.style.transform = `translate(${e.clientX - 6}px, ${e.clientY - 6}px)`
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  return <div ref={ref} className="custom-cursor" />
}
