import { useState, useEffect } from 'react'

interface BlogConfig {
  title: string
  description: string
  theme: string
  subdomain: string
  is_public: number
  auto_publish_comment: number
  auto_publish_annotation: number
  auto_publish_ai_summary: number
}

export default function BlogSettingsPage() {
  const [config, setConfig] = useState<BlogConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const token = localStorage.getItem('mtr_token')
        const res = await fetch('/api/blog/config', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to load config')
        const data = await res.json()
        setConfig(data.config)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [])

  const handleSave = async () => {
    if (!config) return
    setSaving(true)
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/blog/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(config)
      })
      if (!res.ok) throw new Error('Failed to save')
      alert('保存成功')
    } catch (err) {
      alert(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/blog/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ types: ['comment', 'annotation'] })
      })
      if (!res.ok) throw new Error('Failed to generate')
      const data = await res.json()
      alert(`生成了 ${data.generated} 篇文章`)
    } catch (err) {
      alert(err instanceof Error ? err.message : '生成失败')
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '2rem' }}>
        博客设置
      </h1>

      {config && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ background: 'var(--paper)', borderRadius: '2px', padding: '1.5rem', border: '1px solid var(--rule)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              基本信息
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--ink)' }}>
                  博客标题
                </label>
                <input
                  type="text"
                  value={config.title || ''}
                  onChange={(e) => setConfig({ ...config, title: e.target.value })}
                  className="mtr-input"
                  style={{ width: '100%', padding: '0.75rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--ink)' }}>
                  博客描述
                </label>
                <textarea
                  value={config.description || ''}
                  onChange={(e) => setConfig({ ...config, description: e.target.value })}
                  rows={3}
                  className="mtr-input"
                  style={{ width: '100%', padding: '0.75rem', resize: 'vertical' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--ink)' }}>
                  子域名
                </label>
                <input
                  type="text"
                  value={config.subdomain || ''}
                  disabled
                  className="mtr-input"
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--paper-2)' }}
                />
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--paper)', borderRadius: '2px', padding: '1.5rem', border: '1px solid var(--rule)' }}>
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
              自动发布设置
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { key: 'auto_publish_comment', label: '自动发布评论' },
                { key: 'auto_publish_annotation', label: '自动发布批注' },
                { key: 'auto_publish_ai_summary', label: '自动发布AI总结' }
              ].map((item) => (
                <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={config[item.key as keyof BlogConfig] === 1}
                    onChange={(e) => setConfig({ ...config, [item.key]: e.target.checked ? 1 : 0 })}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn accent"
              style={{
                padding: '0.75rem 1.5rem',
                opacity: saving ? 0.5 : 1,
                cursor: saving ? 'not-allowed' : 'pointer'
              }}
            >
              {saving ? '保存中...' : '保存设置'}
            </button>
            <button
              onClick={handleGenerate}
              className="btn"
              style={{
                padding: '0.75rem 1.5rem'
              }}
            >
              生成博客文章
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
