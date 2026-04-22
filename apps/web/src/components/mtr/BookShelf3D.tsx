import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import * as THREE from 'three'

interface Book3D {
  id: string
  title: string
  author: string
  color: string
  aiPct: number
  height: number
  position: [number, number, number]
}

interface BookShelf3DProps {
  books: Book3D[]
  onBookClick?: (book: Book3D) => void
}

function Book3DModel({ book, onClick }: { book: Book3D; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const bookColor = useMemo(() => {
    if (book.aiPct >= 80) return '#4a3a5c'
    if (book.aiPct >= 50) return '#2d3a52'
    if (book.aiPct >= 20) return '#4a5c3f'
    return '#8a5f3a'
  }, [book.aiPct])

  useFrame((state) => {
    if (meshRef.current) {
      if (hovered) {
        meshRef.current.position.y = book.position[1] + 0.3 + Math.sin(state.clock.elapsedTime * 3) * 0.05
      } else {
        meshRef.current.position.y = THREE.MathUtils.lerp(
          meshRef.current.position.y,
          book.position[1],
          0.1
        )
      }
    }
  })

  return (
    <group position={book.position}>
      {/* Book spine */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          onClick()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = 'auto'
        }}
      >
        <boxGeometry args={[0.4, book.height, 2.5]} />
        <meshStandardMaterial
          color={bookColor}
          roughness={0.7}
          metalness={0.1}
        />
      </mesh>

      {/* Book pages (side) */}
      <mesh position={[0.21, 0, 0]}>
        <boxGeometry args={[0.02, book.height - 0.05, 2.4]} />
        <meshStandardMaterial color="#f5f0e8" />
      </mesh>

      {/* Title on spine */}
      <Html
        position={[0, 0, 1.26]}
        distanceFactor={8}
        style={{
          width: '80px',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 7,
            color: '#fff',
            fontWeight: 500,
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            letterSpacing: '0.05em',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)',
            transform: 'rotate(180deg)',
            height: `${book.height * 15}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {book.title.slice(0, 12)}
        </div>
      </Html>

      {/* AI ratio indicator */}
      <Html
        position={[0, -book.height / 2 - 0.3, 0]}
        distanceFactor={10}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            fontSize: 8,
            color: 'var(--ink-3)',
            whiteSpace: 'nowrap',
            textAlign: 'center',
          }}
        >
          {book.aiPct}% AI
        </div>
      </Html>
    </group>
  )
}

function Shelf() {
  return (
    <group>
      {/* Shelf board */}
      <mesh position={[0, -0.1, 0]}>
        <boxGeometry args={[12, 0.2, 3]} />
        <meshStandardMaterial color="#8a5f3a" roughness={0.8} />
      </mesh>
      {/* Shelf supports */}
      <mesh position={[-5.5, -1.5, 0]}>
        <boxGeometry args={[0.3, 3, 2.8]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
      <mesh position={[5.5, -1.5, 0]}>
        <boxGeometry args={[0.3, 3, 2.8]} />
        <meshStandardMaterial color="#6b4226" roughness={0.9} />
      </mesh>
    </group>
  )
}

function Scene({ books, onBookClick }: BookShelf3DProps) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={0.8} />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#c17c53" />

      <Shelf />

      {books.map((book) => (
        <Book3DModel
          key={book.id}
          book={book}
          onClick={() => onBookClick?.(book)}
        />
      ))}

      <OrbitControls
        enablePan={false}
        enableZoom
        enableRotate
        maxPolarAngle={Math.PI / 2.2}
        minPolarAngle={Math.PI / 3}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  )
}

export default function BookShelf3D({ books, onBookClick }: BookShelf3DProps) {
  const [show3D, setShow3D] = useState(false)

  if (!show3D) {
    return (
      <div style={{ textAlign: 'center', padding: '1rem' }}>
        <button
          className="btn ghost"
          onClick={() => setShow3D(true)}
          style={{ fontSize: 12 }}
        >
          View in 3D Library
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '400px', position: 'relative', background: 'var(--paper-2)' }}>
      <Canvas
        camera={{ position: [0, 3, 8], fov: 50 }}
        style={{ background: 'var(--paper-2)' }}
      >
        <Scene books={books} onBookClick={onBookClick} />
      </Canvas>

      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          className="chip"
          onClick={() => setShow3D(false)}
          style={{ fontSize: 10 }}
        >
          2D View
        </button>
        <span className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
          Drag to rotate · Click books to read
        </span>
      </div>
    </div>
  )
}
