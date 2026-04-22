import { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line, Html } from '@react-three/drei'
import * as THREE from 'three'

interface WikiNode {
  id: string
  title: string
  category: string
  x: number
  y: number
  z: number
  fsrs_s?: number
  fsrs_r?: number
}

interface WikiEdge {
  from: string
  to: string
  type: string
}

interface WikiGraph3DProps {
  nodes: WikiNode[]
  edges: WikiEdge[]
  onNodeClick?: (node: WikiNode) => void
  selectedNodeId?: string
}

function Node({ node, isSelected, onClick }: { node: WikiNode; isSelected: boolean; onClick: () => void }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  const color = useMemo(() => {
    const categoryColors: Record<string, string> = {
      concept: '#c17c53',
      entity: '#4a7c59',
      theme: '#6b4c7a',
      timeline: '#2d5a7b',
      analysis: '#8b6914',
    }
    return categoryColors[node.category] || '#8a5f3a'
  }, [node.category])

  const size = useMemo(() => {
    if (node.fsrs_s && node.fsrs_s > 0) {
      return Math.max(0.3, Math.min(1.2, node.fsrs_s / 10))
    }
    return 0.5
  }, [node.fsrs_s])

  const opacity = useMemo(() => {
    if (node.fsrs_r !== undefined) {
      return Math.max(0.4, node.fsrs_r)
    }
    return 0.9
  }, [node.fsrs_r])

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.2
      if (hovered || isSelected) {
        meshRef.current.scale.setScalar(size * 1.2)
      } else {
        meshRef.current.scale.setScalar(size)
      }
    }
  })

  return (
    <group position={[node.x, node.y, node.z]}>
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
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </mesh>

      {/* Glow effect for low retrievability */}
      {node.fsrs_r !== undefined && node.fsrs_r < 0.5 && (
        <mesh>
          <sphereGeometry args={[1.3, 16, 16]} />
          <meshBasicMaterial
            color="#ff4444"
            transparent
            opacity={0.1 + Math.sin(Date.now() * 0.003) * 0.05}
          />
        </mesh>
      )}

      {/* Label */}
      <Html distanceFactor={10}>
        <div
          style={{
            fontSize: 11,
            color: isSelected ? 'var(--terracotta)' : 'var(--ink)',
            fontWeight: isSelected ? 600 : 400,
            whiteSpace: 'nowrap',
            textShadow: '0 1px 2px rgba(255,255,255,0.8)',
            pointerEvents: 'none',
            transform: 'translate(-50%, -150%)',
          }}
        >
          {node.title}
        </div>
      </Html>
    </group>
  )
}

function Edge({ from, to }: { from: [number, number, number]; to: [number, number, number] }) {
  const points = useMemo(() => [new THREE.Vector3(...from), new THREE.Vector3(...to)], [from, to])

  return (
    <Line
      points={points}
      color="var(--rule)"
      lineWidth={1}
      transparent
      opacity={0.6}
    />
  )
}

function Scene({ nodes, edges, onNodeClick, selectedNodeId }: WikiGraph3DProps) {
  const nodeMap = useMemo(() => {
    const map = new Map<string, WikiNode>()
    nodes.forEach((n) => map.set(n.id, n))
    return map
  }, [nodes])

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#c17c53" />

      {edges.map((edge, i) => {
        const fromNode = nodeMap.get(edge.from)
        const toNode = nodeMap.get(edge.to)
        if (!fromNode || !toNode) return null
        return (
          <Edge
            key={`${edge.from}-${edge.to}-${i}`}
            from={[fromNode.x, fromNode.y, fromNode.z]}
            to={[toNode.x, toNode.y, toNode.z]}
          />
        )
      })}

      {nodes.map((node) => (
        <Node
          key={node.id}
          node={node}
          isSelected={node.id === selectedNodeId}
          onClick={() => onNodeClick?.(node)}
        />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        autoRotate
        autoRotateSpeed={0.5}
      />
    </>
  )
}

export default function WikiGraph3D({ nodes, edges, onNodeClick, selectedNodeId }: WikiGraph3DProps) {
  const [show3D, setShow3D] = useState(true)

  if (!show3D) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <button className="btn" onClick={() => setShow3D(true)}>
          Enter 3D Wiki Universe
        </button>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative', background: 'var(--paper)' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 60 }}
        style={{ background: 'var(--paper)' }}
      >
        <Scene
          nodes={nodes}
          edges={edges}
          onNodeClick={onNodeClick}
          selectedNodeId={selectedNodeId}
        />
      </Canvas>

      {/* Controls overlay */}
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
          Drag to rotate · Scroll to zoom · Click nodes
        </span>
      </div>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          background: 'rgba(255,255,255,0.9)',
          padding: '8px 12px',
          borderRadius: 2,
          border: '1px solid var(--rule)',
        }}
      >
        <div className="mono" style={{ fontSize: 9, marginBottom: 4 }}>CATEGORIES</div>
        {[
          ['concept', '#c17c53'],
          ['entity', '#4a7c59'],
          ['theme', '#6b4c7a'],
          ['timeline', '#2d5a7b'],
        ].map(([cat, color]) => (
          <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            <span className="mono" style={{ fontSize: 9, textTransform: 'uppercase' }}>{cat}</span>
          </div>
        ))}
        <div style={{ marginTop: 6, borderTop: '1px solid var(--rule-2)', paddingTop: 4 }}>
          <span className="mono" style={{ fontSize: 8, color: 'var(--ink-3)' }}>
            Red glow = Due for review
          </span>
        </div>
      </div>
    </div>
  )
}
