import { useRef, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '../store'
import { URLS, N } from '../data'

const STRIP = 1.0                // strip unit per image (planes meet edge-to-edge)
const PLANE_H = 2.7
const PIX_STEP = 335             // IMAGE_W(320) + GAP(15), matches useScroll
const SEG_X = 40                 // x subdivisions → smooth bend across each image
const SEG_Y = 6                  // y subdivisions → smooth ribbon twist
const LOOP = N * STRIP           // total strip length for infinite wrap
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3)
const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

/*
  Every image shares one warp evaluated in strip-space, so neighbouring plane
  edges land on the same point → one seamless ribbon.
    a   : arc angle from the lens centre (sin → x spread, cos → recede/taper)
    env : height envelope, 1 at centre → 0 at the lens points (leaf silhouette)
    phi : RIBBON TWIST — rotates each cross-section about the strip tangent.
    rev : left→right REVEAL — a wavefront at xFront sweeps across X; each column
          unfurls (height 0→full) + fades in as the front passes it.
*/
const vertHead = `
  uniform float uStripCenter, uL, uSpanX, uSpanZ, uEnvPow, uTwist, uReveal, uRevealBand;
  varying float vReveal;
`
const vertBody = `
  float sx = uStripCenter + position.x;
  float tn = clamp(sx / uL, -1.0, 1.0);
  float a  = tn * 1.5707963;
  float c  = cos(a);
  float env = pow(max(c, 0.0001), uEnvPow);
  float phi = tn * uTwist;
  float wx = uSpanX * sin(a);
  float xFront = mix(-uSpanX - uRevealBand, uSpanX + uRevealBand, uReveal);
  float rev = smoothstep(0.0, 1.0, clamp((xFront - wx) / uRevealBand, 0.0, 1.0));
  vReveal = rev;
  float h  = position.y * env * rev;
  float wy = h * cos(phi);
  float wz = -uSpanZ * (1.0 - c) + h * sin(phi);
  vec3 transformed = vec3(wx, wy, wz);
`

function makeMaterial(tex) {
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  const uniforms = {
    uStripCenter: { value: 0 },
    uL: { value: 4.6 },
    uSpanX: { value: 7.0 },
    uSpanZ: { value: 3.4 },
    uEnvPow: { value: 0.7 },
    uTwist: { value: 1.6 },
    uReveal: { value: 0 },
    uRevealBand: { value: 2.5 },
  }
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    toneMapped: false,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: false,
  })
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${vertHead}`)
      .replace('#include <begin_vertex>', vertBody)
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vReveal;')
      .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.a *= vReveal;')
  }
  mat.userData.uniforms = uniforms
  return mat
}

function Images({ config }) {
  const textures = useTexture(URLS)
  const geometry = useMemo(() => new THREE.PlaneGeometry(STRIP, PLANE_H, SEG_X, SEG_Y), [])
  const materials = useMemo(() => textures.map(makeMaterial), [textures])
  const smooth = useRef(0)
  const revStart = useRef(null)
  const prevNonce = useRef(config.revealNonce)
  const autoDone = useRef(false)

  useFrame(({ clock }) => {
    const store = useStore.getState()
    const now = clock.getElapsedTime()

    // Carousel waits for the prism to land; replay nonce forces a restart.
    if (config.revealNonce !== prevNonce.current) {
      prevNonce.current = config.revealNonce
      revStart.current = store.prismEntered ? now : null
      autoDone.current = false
      store.setScrollX(0)
    }
    if (!store.prismEntered) revStart.current = null
    else if (revStart.current === null) revStart.current = now

    // Left→right reveal, timed from when the prism released it.
    let progress = 0
    if (revStart.current !== null) {
      const tline = (now - revStart.current - config.revealDelay) / config.revealDuration
      progress = Math.min(Math.max(tline, 0), 1)

      // Auto-glide through a few slides as the carousel appears, then hand
      // control back to the user.
      if (!autoDone.current) {
        const aT = (now - revStart.current) / config.autoSlideDuration
        const p = Math.min(Math.max(aT, 0), 1)
        store.setScrollX(-config.autoSlides * PIX_STEP * easeInOutCubic(p))
        if (p >= 1) autoDone.current = true
      }
    }
    const reveal = easeOutCubic(progress)

    const target = store.scrollX / PIX_STEP
    smooth.current += (target - smooth.current) * 0.09
    const off = smooth.current

    for (let i = 0; i < N; i++) {
      const u = materials[i].userData.uniforms
      // Wrap each image's strip position into [-LOOP/2, LOOP/2] → infinite loop.
      let pos = (i * STRIP + off) % LOOP
      if (pos > LOOP / 2) pos -= LOOP
      if (pos < -LOOP / 2) pos += LOOP
      u.uStripCenter.value = pos

      u.uL.value = config.lensLength
      u.uSpanX.value = config.spanX
      u.uSpanZ.value = config.spanZ
      u.uEnvPow.value = config.envPow
      u.uTwist.value = config.twist
      u.uReveal.value = reveal
      u.uRevealBand.value = config.revealBand
    }
  })

  return (
    <group position={[0, 0.5, -0.8]}>
      {materials.map((mat, i) => (
        <mesh key={i} geometry={geometry} material={mat} />
      ))}
    </group>
  )
}

export default function Carousel3D({ config }) {
  return (
    <Suspense fallback={null}>
      <Images config={config} />
    </Suspense>
  )
}
