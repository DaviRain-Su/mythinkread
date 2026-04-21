import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'

interface BlogConfig {
  title: string
  description: string
  theme: string
  avatar_cid: string
  social_links: string
  username: string
  display_name: string
}

interface BlogPost {
  id: string
  type: string
  title: string
  content: string
  book_title: string
  created_at: number
}

export default function BlogPage() {
  const { subdomain } = useParams<{ subdomain: string }>()
  const [config, setConfig] = useState<BlogConfig | null>(null)
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadBlog()
  }, [subdomain])

  const loadBlog = async () => {
    if (!subdomain) return
    try {
      const res = await fetch(`/api/blog/${subdomain}`)
      if (!res.ok) throw new Error('Failed to load blog')
      const data = await res.json()
      setConfig(data.config)
      setPosts(data.posts || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      comment: '评论',
      annotation: '批注',
      ai_summary: 'AI总结',
      note: '笔记',
      review: '书评'
    }
    return labels[type] || type
  }

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      comment: '#dbeafe',
      annotation: '#fef3c7',
      ai_summary: '#dcfce7',
      note: '#f3e8ff',
      review: '#fee2e2'
    }
    return colors[type] || '#f3f4f6'
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  if (!config) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>博客不存在</div>
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* Blog Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          width: '6rem',
          height: '6rem',
          borderRadius: '50%',
          backgroundColor: '#2563eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '2rem',
          fontWeight: 'bold',
          margin: '0 auto 1rem'
        }}>
          {(config.display_name || config.username)[0].toUpperCase()}
        </div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
          {config.title || config.display_name || config.username}
        </h1>
        <p style={{ color: '#6b7280' }}>{config.description || '读书人的个人博客'}</p>
      </div>

      {/* Posts */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {posts.map((post) => (
          <div key={post.id} style={{
            padding: '1.5rem',
            backgroundColor: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                backgroundColor: getTypeColor(post.type),
                color: '#374151'
              }}>
                {getTypeLabel(post.type)}
              </span>
              {post.book_title && (
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                  《{post.book_title}》
                </span>
              )}
            </div>

            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.75rem' }}>
              {post.title}
            </h2>

            <div style={{
              color: '#374151',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem'
            }}>
              {post.content}
            </div>

            <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: '#9ca3af' }}>
              {new Date(post.created_at * 1000).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          暂无文章，开始阅读和批注来自动生成内容吧
        </div>
      )}
    </div>
  )
}
