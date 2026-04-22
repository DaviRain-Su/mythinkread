import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'

interface Collaborator {
  user_id: string
  username: string
  display_name: string
  role: string
}

interface CollaborativeDoc {
  id: string
  title: string
  content: string
  version: number
  creator_name: string
  collaborators: Collaborator[]
}

export default function CollaboratePage() {
  const { docId } = useParams<{ docId: string }>()
  const [doc, setDoc] = useState<CollaborativeDoc | null>(null)
  const [content, setContent] = useState('')
  const [version, setVersion] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastContentRef = useRef('')
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const versionRef = useRef(0)

  useEffect(() => {
    versionRef.current = version
  }, [version])

  useEffect(() => {
    loadDoc()
    syncIntervalRef.current = setInterval(() => {
      if (docId) syncOperations(versionRef.current)
    }, 3000)
    return () => {
      if (syncIntervalRef.current) clearInterval(syncIntervalRef.current)
    }
  }, [docId])

  const loadDoc = async () => {
    if (!docId) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/collaborate/docs/${docId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('Failed to load doc')
      const data = await res.json()
      setDoc(data)
      setContent(data.content || '')
      lastContentRef.current = data.content || ''
      setVersion(data.version || 1)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const syncOperations = async (currentVersion: number) => {
    if (!docId) return
    try {
      const res = await fetch(`/api/collaborate/docs/${docId}/operations?since=${currentVersion}`)
      if (!res.ok) return
      const data = await res.json()
      
      if (data.operations?.length > 0) {
        let newContent = content
        for (const op of data.operations) {
          if (op.operation === 'insert') {
            newContent = newContent.slice(0, op.position) + op.content + newContent.slice(op.position)
          } else if (op.operation === 'delete') {
            newContent = newContent.slice(0, op.position) + newContent.slice(op.position + (op.content?.length || 1))
          }
          if (op.version > currentVersion) {
            setVersion(op.version)
          }
        }
        setContent(newContent)
        lastContentRef.current = newContent
      }
    } catch (err) {
      console.error(err)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    const oldContent = lastContentRef.current
    
    // Simple diff to find what changed
    let position = 0
    while (position < oldContent.length && position < newContent.length && oldContent[position] === newContent[position]) {
      position++
    }
    
    if (newContent.length > oldContent.length) {
      // Insert
      const inserted = newContent.slice(position, position + (newContent.length - oldContent.length))
      submitOperation('insert', position, inserted)
    } else if (newContent.length < oldContent.length) {
      // Delete
      const deleted = oldContent.slice(position, position + (oldContent.length - newContent.length))
      submitOperation('delete', position, deleted)
    }
    
    setContent(newContent)
    lastContentRef.current = newContent
  }

  const submitOperation = async (operation: string, position: number, opContent: string) => {
    if (!docId) return
    setSaving(true)
    try {
      const token = localStorage.getItem('mtr_token')
      await fetch(`/api/collaborate/docs/${docId}/operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ operation, position, content: opContent })
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  if (!doc) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>文档不存在</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500 }}>{doc.title}</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>
            创建者: {doc.creator_name} · 版本: {version}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saving && <span style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>同步中...</span>}
          <div style={{ display: 'flex', gap: '-0.5rem' }}>
            {doc.collaborators?.map((c) => (
              <div
                key={c.user_id}
                title={c.display_name || c.username}
                style={{
                  width: '2rem',
                  height: '2rem',
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  color: 'var(--accent-ink)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  border: '2px solid var(--paper)'
                }}
              >
                {(c.display_name || c.username)[0].toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--paper)', borderRadius: '2px', border: '1px solid var(--rule)' }}>
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          className="mtr-input"
          style={{
            width: '100%',
            minHeight: '60vh',
            padding: '1.5rem',
            fontSize: '1rem',
            lineHeight: 1.8,
            resize: 'vertical',
            fontFamily: 'var(--font-body)'
          }}
          placeholder="开始协作编辑..."
        />
      </div>
    </div>
  )
}
