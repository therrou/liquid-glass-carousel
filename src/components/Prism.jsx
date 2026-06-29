import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshTransmissionMaterial, Environment, Lightformer } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'

// CSS-style cubic-bezier(x1,y1,x2,y2) → easing function of t in [0,1].
// y may exceed [0,1] for overshoot/anticipation curves.
function makeCubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1
  const bx = 3 * (x2 - x1) - cx
  const ax = 1 - cx - bx
  const cy = 3 * y1
  const by = 3 * (y2 - y1) - cy
  const ay = 1 - cy - by
  const sampleX = (t) => ((ax * t + bx) * t + cx) * t
  const sampleY = (t) => ((ay * t + by) * t + cy) * t
  const dX = (t) => (3 * ax * t + 2 * bx) * t + cx
  const solveX = (x) => {
    let t = x
    for (let i = 0; i < 8; i++) {
      const err = sampleX(t) - x
      if (Math.abs(err) < 1e-5) return t
      const d = dX(t)
      if (Math.abs(d) < 1e-6) break
      t -= err / d
    }
    let lo = 0, hi = 1
    t = x
    while (lo < hi) {
      const xx = sampleX(t)
      if (Math.abs(xx - x) < 1e-5) break
      if (x > xx) lo = t
      else hi = t
      t = (lo + hi) / 2
    }
    return t
  }
  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solveX(x)))
}

// Rounded-rectangle (stadium) path — radius clamped to half the shorter side.
function roundedRectShape(w, h, r) {
  const shape = new THREE.Shape()
  const x = -w / 2
  const y = -h / 2
  r = Math.min(r, w / 2, h / 2)
  shape.moveTo(x + r, y)
  shape.lineTo(x + w - r, y)
  shape.quadraticCurveTo(x + w, y, x + w, y + r)
  shape.lineTo(x + w, y + h - r)
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  shape.lineTo(x + r, y + h)
  shape.quadraticCurveTo(x, y + h, x, y + h - r)
  shape.lineTo(x, y + r)
  shape.quadraticCurveTo(x, y, x + r, y)
  return shape
}

export default function Prism({ config }) {
  const meshRef = useRef()
  const groupRef = useRef()
  const tiltRef = useRef()
  const startTime = useRef(null)
  const cursor = useStore((s) => s.cursor)

  const {
    thickness, roughness, transmission, ior, chromaticAberration,
    distortion, distortionScale, temporalDistortion,
    iridescence, iridescenceIOR,
    width, height, cornerRadius, edge, depth,
    prismScale, cursorInfluence, entryDuration,
    manualRotate, rotX, rotY, rotZ,
    easeX1, easeY1, easeX2, easeY2, introNonce,
  } = config

  const ease = useMemo(
    () => makeCubicBezier(easeX1, easeY1, easeX2, easeY2),
    [easeX1, easeY1, easeX2, easeY2]
  )
  const prevNonce = useRef(introNonce)
  const enteredSignaled = useRef(false)

  // Extruded stadium with a bevel → flat front face + a defined rim/edge.
  const geometry = useMemo(() => {
    const shape = roundedRectShape(width, height, cornerRadius)
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: edge > 0.001,
      bevelThickness: edge,
      bevelSize: edge,
      bevelSegments: 16,
      curveSegments: 64,
      steps: 1,
    })
    geo.center()
    return geo
  }, [width, height, cornerRadius, edge, depth])

  useFrame(({ clock }) => {
    if (!groupRef.current || !tiltRef.current) return

    const FINAL_Y = 0.5

    // Replay button bumped the nonce → restart the intro + re-gate the carousel.
    if (introNonce !== prevNonce.current) {
      prevNonce.current = introNonce
      startTime.current = null
      enteredSignaled.current = false
      useStore.getState().setPrismEntered(false)
    }

    // Debug mode: freeze entry + cursor and drive rotation from the sliders.
    if (manualRotate) {
      startTime.current = null
      groupRef.current.position.y = FINAL_Y
      groupRef.current.rotation.y = 0
      tiltRef.current.rotation.set(rotX, rotY, rotZ)
      return
    }

    if (startTime.current === null) startTime.current = clock.getElapsedTime()
    const elapsed = clock.getElapsedTime() - startTime.current
    const t = Math.min(elapsed / entryDuration, 1)
    const eased = ease(t)

    groupRef.current.position.y = -10 + (10 + FINAL_Y) * eased
    groupRef.current.rotation.y = Math.PI * 1.5 * (1 - eased)

    // At 70% of the entry, release the carousel reveal.
    if (t >= 0.7 && !enteredSignaled.current) {
      enteredSignaled.current = true
      useStore.getState().setPrismEntered(true)
    }

    // Front face turns to face the cursor: yaw (Y) for horizontal, pitch (X)
    // for vertical, no roll (Z).
    const targetX = -cursor.y * cursorInfluence
    const targetY = cursor.x * cursorInfluence
    tiltRef.current.rotation.x += (targetX - tiltRef.current.rotation.x) * 0.08
    tiltRef.current.rotation.y += (targetY - tiltRef.current.rotation.y) * 0.08
    tiltRef.current.rotation.z += (0 - tiltRef.current.rotation.z) * 0.08
  })

  return (
    <>
      {/* Colored softboxes instead of studio's white panels → no white blobs,
          glass reflects the scene palette and catches iridescence on the rim. */}
      <Environment resolution={256} background={false}>
        <Lightformer intensity={2.2} color="#E0651A" position={[3.5, 1.5, 2]} scale={[5, 6, 1]} />
        <Lightformer intensity={1.6} color="#1E40E0" position={[-3.5, 1, 2]} scale={[5, 6, 1]} />
        <Lightformer intensity={1.0} color="#10B0A0" position={[0, -3.5, 2]} scale={[4, 3, 1]} />
        <Lightformer intensity={0.5} color="#2a2f66" position={[0, 3.5, -3]} scale={[8, 8, 1]} />
      </Environment>

      <pointLight position={[4, 3, 4]} color="#E05010" intensity={6} />
      <pointLight position={[-4, 1, 4]} color="#1030E0" intensity={5} />
      <pointLight position={[0, -4, 5]} color="#8010C0" intensity={3} />
      <ambientLight intensity={0.12} color="#101540" />

      <group ref={groupRef} position={[0, -10, 0]}>
        <group ref={tiltRef}>
          <mesh ref={meshRef} geometry={geometry} scale={prismScale}>
            <MeshTransmissionMaterial
              backside
              backsideThickness={thickness}
              samples={16}
              resolution={1024}
              thickness={thickness}
              roughness={roughness}
              transmission={transmission}
              ior={ior}
              chromaticAberration={chromaticAberration}
              distortion={distortion}
              distortionScale={distortionScale}
              temporalDistortion={temporalDistortion}
              iridescence={iridescence}
              iridescenceIOR={iridescenceIOR}
              iridescenceThicknessRange={[100, 800]}
              clearcoat={1}
              clearcoatRoughness={0.1}
            />
          </mesh>
        </group>
      </group>
    </>
  )
}
