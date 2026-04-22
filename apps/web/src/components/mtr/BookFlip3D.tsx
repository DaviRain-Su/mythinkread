import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

interface BookFlip3DProps {
  bookTitle: string
  bookColor: string
  onClose: () => void
}

function BookCover({ title, color, isOpen }: { title: string; color: string; isOpen: boolean }) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(() => {
    if (groupRef.current) {
      const targetRotation = isOpen ? -Math.PI / 3 : 0
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotation,
        0.05
      )

      if (hovered) {
        groupRef.current.position.z = THREE.MathUtils.lerp(
          groupRef.current.position.z,
          0.5,
          0.1
        )
      } else {
        groupRef.current.position.z = THREE.MathUtils.lerp(
          groupRef.current.position.z,
          0,
          0.1
        )
      }
    }
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Front cover */}
      <mesh
        position={[0, 0, 0.15]}
        onPointerOver={() => {
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[3, 4.5, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Title on cover */}
      <Html position={[0, 0.5, 0.18]} center distanceFactor={8}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: '#fff',
            textAlign: 'center',
            width: '200px',
            textShadow: '0 2px 4px rgba(0,0,0,0.5)',
            pointerEvents: 'none',
          }}
        >
          {title}
        </div>
      </Html>

      {/* Pages */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[2.9, 4.4, 0.25]} />
        <meshStandardMaterial color="#f5f0e8" roughness={0.9} />
      </mesh>

      {/* Back cover */}
      <mesh position={[0, 0, -0.15]}>
        <boxGeometry args={[3, 4.5, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
    </group>
  )
}

function Scene({ title, color, isOpen }: { title: string; color: string; isOpen: boolean }) {
  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-5, -5, -5]} intensity={0.4} color="#c17c53" />

      <BookCover title={title} color={color} isOpen={isOpen} />

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  )
}

export default function BookFlip3D({ bookTitle, bookColor, onClose }: BookFlip3DProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ width: '80%', height: '80%', position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 50 }}
          style={{ background: 'transparent' }}
        >
          <Scene title={bookTitle} color={bookColor} isOpen={isOpen} />
        </Canvas>

        {/* Controls */}
        <div
          style={{
            position: 'absolute',
            top: 20,
            right: 20,
            display: 'flex',
            gap: 10,
          }}
        >
          <button
            className="btn"
            onClick={() => setIsOpen(!isOpen)}
            style={{ background: '#fff', color: '#000' }}
          >
            {isOpen ? 'Close Book' : 'Open Book'}
          </button>
          <button
            className="btn ghost"
            onClick={onClose}
            style={{ color: '#fff', borderColor: '#fff' }}
          >
            Exit 3D
          </button>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            color: '#fff',
            fontSize: 12,
            opacity: 0.7,
          }}
        >
          Drag to rotate · Click Open Book to see 3D flip effect
        </div>
      </div>
    </div>
  )
}
