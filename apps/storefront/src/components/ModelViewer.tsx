'use client'

import { useEffect, useRef, useState } from 'react'

// The three.js bundle is ~600 KB and only a fraction of visitors will spin a
// shoe, so nothing here is imported at module scope — the whole renderer is
// pulled in dynamically the first time someone opens the viewer.

export function ModelViewer({ slug, name }: { slug: string; name: string }) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const mountRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    if (!open || !mountRef.current) return

    let cancelled = false
    setStatus('loading')

    ;(async () => {
      const [THREE, { GLTFLoader }, { DRACOLoader }, { OrbitControls }, { RoomEnvironment }] =
        await Promise.all([
          import('three'),
          import('three/examples/jsm/loaders/GLTFLoader.js'),
          import('three/examples/jsm/loaders/DRACOLoader.js'),
          import('three/examples/jsm/controls/OrbitControls.js'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
        ])

      const mount = mountRef.current
      if (cancelled || !mount) return

      const width = mount.clientWidth
      const height = mount.clientHeight

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(width, height)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      // ACES + sRGB output: without these the PBR result is flat and reads as a
      // game asset rather than a photograph.
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.15
      renderer.outputColorSpace = THREE.SRGBColorSpace
      mount.appendChild(renderer.domElement)

      const scene = new THREE.Scene()

      // An environment map is what makes leather look like leather. Directional
      // lights alone leave these materials matte and dead.
      const pmrem = new THREE.PMREMGenerator(renderer)
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

      const key = new THREE.DirectionalLight(0xffffff, 2.2)
      key.position.set(2.5, 4, 3)
      key.castShadow = true
      key.shadow.mapSize.set(2048, 2048)
      key.shadow.bias = -0.0004
      scene.add(key)

      const fill = new THREE.DirectionalLight(0xffe8dc, 0.5)
      fill.position.set(-3, 1.5, -2)
      scene.add(fill)

      const camera = new THREE.PerspectiveCamera(30, width / height, 0.01, 100)

      const draco = new DRACOLoader()
      draco.setDecoderPath('/draco/')
      const loader = new GLTFLoader()
      loader.setDRACOLoader(draco)

      let frame = 0
      let controls: InstanceType<typeof OrbitControls> | null = null

      loader.load(
        `/models/${slug}.glb`,
        (gltf) => {
          if (cancelled) return
          const model = gltf.scene

          model.traverse((node) => {
            const mesh = node as InstanceType<typeof THREE.Mesh>
            if (!mesh.isMesh) return
            mesh.castShadow = true
            mesh.receiveShadow = true
            const material = mesh.material as InstanceType<typeof THREE.MeshStandardMaterial>
            if (!material) return
            // Generators bake one flat roughness across the whole shoe. Real
            // leather is satin: glossier than this reads as wet vinyl.
            material.roughness = 0.72
            material.metalness = 0
            material.envMapIntensity = 0.85
            // The albedo already carries the studio highlights from the source
            // photos, so a full-strength normal map double-counts them.
            if (material.normalScale) material.normalScale.set(0.65, 0.65)
            material.needsUpdate = true
          })

          const box = new THREE.Box3().setFromObject(model)
          const centre = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          model.position.sub(centre)
          model.position.y += size.y / 2
          scene.add(model)

          const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(50, 50),
            new THREE.ShadowMaterial({ opacity: 0.35 }),
          )
          ground.rotation.x = -Math.PI / 2
          ground.receiveShadow = true
          scene.add(ground)

          const radius = Math.max(size.x, size.y, size.z)
          const distance = radius * 2.4
          camera.position.set(distance * 0.5, distance * 0.38, distance * 0.8)
          key.target.position.set(0, size.y / 2, 0)
          scene.add(key.target)

          controls = new OrbitControls(camera, renderer.domElement)
          controls.target.set(0, size.y * 0.6, 0)
          controls.enableDamping = true
          controls.dampingFactor = 0.08
          controls.enablePan = false
          controls.minDistance = distance * 0.6
          controls.maxDistance = distance * 2
          // Below the floor there is nothing to see but the shadow plane.
          controls.maxPolarAngle = Math.PI / 2.05
          controls.autoRotate = true
          controls.autoRotateSpeed = 1.2
          controls.update()

          const tick = () => {
            frame = requestAnimationFrame(tick)
            controls?.update()
            renderer.render(scene, camera)
          }
          tick()
          setStatus('ready')
        },
        undefined,
        () => {
          if (!cancelled) setStatus('error')
        },
      )

      const onResize = () => {
        if (!mount) return
        const w = mount.clientWidth
        const h = mount.clientHeight
        camera.aspect = w / h
        camera.updateProjectionMatrix()
        renderer.setSize(w, h)
      }
      window.addEventListener('resize', onResize)

      cleanupRef.current = () => {
        cancelAnimationFrame(frame)
        window.removeEventListener('resize', onResize)
        controls?.dispose()
        draco.dispose()
        pmrem.dispose()
        // Freeing GPU memory needs an explicit walk; dropping the scene alone
        // leaks every buffer and texture the model allocated.
        scene.traverse((node) => {
          const mesh = node as InstanceType<typeof THREE.Mesh>
          if (!mesh.isMesh) return
          mesh.geometry?.dispose()
          const material = mesh.material as InstanceType<typeof THREE.MeshStandardMaterial>
          if (material) {
            material.map?.dispose()
            material.normalMap?.dispose()
            material.roughnessMap?.dispose()
            material.dispose()
          }
        })
        renderer.dispose()
        renderer.domElement.remove()
      }
    })()

    return () => {
      cancelled = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [open, slug])

  if (!open) {
    return (
      <button type="button" className="model-open" onClick={() => setOpen(true)}>
        <CubeIcon />
        View in 3D
      </button>
    )
  }

  return (
    <div className="model-viewer">
      <div ref={mountRef} className="model-stage" aria-label={`3D view of ${name}`} role="img" />
      {status !== 'ready' && (
        <p className="model-status">
          {status === 'error' ? 'This view could not be loaded.' : 'Loading 3D view…'}
        </p>
      )}
      <div className="model-bar">
        <span className="model-hint">Drag to rotate · scroll to zoom</span>
        <button type="button" className="model-close" onClick={() => setOpen(false)}>
          Close
        </button>
      </div>
    </div>
  )
}

function CubeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <path
        d="M12 2.5l8 4.5v9l-8 4.5-8-4.5v-9l8-4.5z M12 11.5l8-4.5 M12 11.5v9.5 M12 11.5l-8-4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
