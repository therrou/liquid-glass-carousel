import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import Prism from './Prism'
import Carousel3D from './Carousel3D'

export default function Scene({ prismConfig, carouselConfig }) {
  return (
    <Canvas
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }}
      camera={{ fov: 65, position: [0, 0, 5.5], near: 0.1, far: 100 }}
      dpr={[1, 2]}
    >
      <Suspense fallback={null}>
        {/* Carousel must render before Prism so it's captured in the transmission buffer */}
        <Carousel3D config={carouselConfig} />
        <Prism config={prismConfig} />
      </Suspense>
    </Canvas>
  )
}
