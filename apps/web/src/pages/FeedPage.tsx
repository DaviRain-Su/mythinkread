import { useState, useEffect } from 'react'

interface Activity {
  id: string
  type: string
  username: string
  display_name: string
  book_title: string
  content: string
  created_at: number
}

export default function FeedPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadFeed()
  }, [])

  const loadFeed = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/social/feed', {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      if (!res.ok) throw new Error('Failed to load feed')
      const data = await res.json()
      setActivities(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getActivityText = (activity: Activity) => {
    switch (activity.type) {
      case 'publish': return '发布了新书'
      case 'read': return '正在阅读'
      case 'annotate': return '添加了批注'
      case 'comment': return '发表了评论'
      case 'follow': return '关注了用户'
      case 'like_book': return '点赞了书籍'
      case 'like_list': return '点赞了书单'
      default: return '进行了操作'
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '48rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
        动态
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {activities.map((activity) => (
          <div
            key={activity.id}
            style={{
              padding: '1.25rem',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <div style={{
                width: '2.5rem',
                height: '2.5rem',
                borderRadius: '50%',
                backgroundColor: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold'
              }}>
                {(activity.display_name || activity.username)[0].toUpperCase()}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>{activity.display_name || activity.username}</span>
                <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                  {getActivityText(activity)}
                </span>
              </div>
            </div>

            {activity.book_title && (
              <p style={{ color: '#374151', marginLeft: '3.25rem', marginBottom: '0.5rem' }}>
                《{activity.book_title}》
              </p>
            )}

            {activity.content && (
              <p style={{
                color: '#6b7280',
                marginLeft: '3.25rem',
                fontSize: '0.875rem',
                backgroundColor: '#f9fafb',
                padding: '0.75rem',
                borderRadius: '0.5rem'
              }}>
                {activity.content}
              </p>
            )}

            <div style={{
              marginLeft: '3.25rem',
              marginTop: '0.5rem',
              fontSize: '0.75rem',
              color: '#9ca3af'
            }}>
              {new Date(activity.created_at * 1000).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {activities.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          暂无动态，去关注一些用户吧
        </div>
      )}
    </div>
  )
}
