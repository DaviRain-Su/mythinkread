import { useState } from 'react'

interface Chapter {
  title: string
  content: string
}

export default function CreateBookPage() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [chapters, setChapters] = useState<Chapter[]>([])
  const [activeTab, setActiveTab] = useState<'info' | 'write'>('info')
  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!prompt.trim()) return
    setGenerating(true)
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: `为小说《${title || '未命名'}》生成一个章节。要求：${prompt}`,
          max_tokens: 2000
        })
      })
      if (!res.ok) throw new Error('生成失败')
      const data = await res.json()
      setChapters(prev => [...prev, {
        title: `第${prev.length + 1}章`,
        content: data.content
      }])
      setPrompt('')
    } catch (err) {
      alert('生成失败: ' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  const handlePublish = () => {
    if (!title.trim() || chapters.length === 0) {
      alert('请填写书名并至少添加一个章节')
      return
    }
    alert('发布功能即将上线')
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      {/* Header */}
      <div style={{ backgroundColor: 'white', borderBottom: '1px solid #e5e7eb', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>创作新书</h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setActiveTab('info')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'info' ? '#2563eb' : '#f3f4f6',
                color: activeTab === 'info' ? 'white' : '#4b5563'
              }}
            >
              书籍信息
            </button>
            <button
              onClick={() => setActiveTab('write')}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: activeTab === 'write' ? '#2563eb' : '#f3f4f6',
                color: activeTab === 'write' ? 'white' : '#4b5563'
              }}
            >
              写作 ({chapters.length})
            </button>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '1.5rem 1rem' }}>
        {activeTab === 'info' ? (
          <div style={{ maxWidth: '42rem' }}>
            <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                  书名 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
                  placeholder="给你的书起个名字"
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#374151', marginBottom: '0.25rem' }}>
                  简介
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  style={{ width: '100%', padding: '0.5rem 1rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' }}
                  placeholder="简要介绍这本书的内容..."
                />
              </div>

              <div style={{ paddingTop: '1rem' }}>
                <button
                  onClick={() => setActiveTab('write')}
                  style={{ width: '100%', padding: '0.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '1rem' }}
                >
                  下一步：开始写作
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            {/* AI Generation Panel */}
            <div>
              <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem' }}>
                <h3 style={{ fontWeight: 600, color: '#1f2937', marginBottom: '1rem' }}>AI 辅助创作</h3>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 500, color: '#6b7280', marginBottom: '0.25rem' }}>
                    创作提示
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    placeholder="描述你想生成的内容，例如：主角在废弃工厂发现神秘装置..."
                  />
                </div>

                <button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    backgroundColor: generating || !prompt.trim() ? '#c4b5fd' : '#7c3aed',
                    color: 'white',
                    borderRadius: '0.5rem',
                    border: 'none',
                    cursor: generating || !prompt.trim() ? 'not-allowed' : 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  {generating ? '生成中...' : 'AI 生成章节'}
                </button>

                <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '1rem' }}>
                  <p>提示技巧：</p>
                  <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
                    <li>描述场景、人物、情节</li>
                    <li>指定风格和氛围</li>
                    <li>可要求特定字数</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Chapters Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {chapters.length === 0 ? (
                <div style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '3rem', textAlign: 'center' }}>
                  <p style={{ color: '#6b7280', marginBottom: '1rem' }}>还没有章节</p>
                  <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>在左侧使用 AI 生成，或手动添加</p>
                </div>
              ) : (
                chapters.map((chapter, index) => (
                  <div key={index} style={{ backgroundColor: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', padding: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <input
                        type="text"
                        value={chapter.title}
                        onChange={(e) => {
                          const newChapters = [...chapters]
                          newChapters[index].title = e.target.value
                          setChapters(newChapters)
                        }}
                        style={{ fontWeight: 600, fontSize: '1.125rem', border: 'none', background: 'transparent' }}
                      />
                      <button
                        onClick={() => {
                          const newChapters = chapters.filter((_, i) => i !== index)
                          setChapters(newChapters)
                        }}
                        style={{ color: '#ef4444', fontSize: '0.875rem', border: 'none', background: 'none', cursor: 'pointer' }}
                      >
                        删除
                      </button>
                    </div>
                    <textarea
                      value={chapter.content}
                      onChange={(e) => {
                        const newChapters = [...chapters]
                        newChapters[index].content = e.target.value
                        setChapters(newChapters)
                      }}
                      rows={8}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #e5e7eb', borderRadius: '0.5rem', fontSize: '0.875rem' }}
                    />
                  </div>
                ))
              )}

              {chapters.length > 0 && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button
                    onClick={() => {
                      setChapters([...chapters, { title: `第${chapters.length + 1}章`, content: '' }])
                    }}
                    style={{ flex: 1, padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', backgroundColor: 'white', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    + 手动添加章节
                  </button>
                  <button
                    onClick={handlePublish}
                    style={{ flex: 1, padding: '0.5rem', backgroundColor: '#2563eb', color: 'white', borderRadius: '0.5rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }}
                  >
                    发布书籍
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
