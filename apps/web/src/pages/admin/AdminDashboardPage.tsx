import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface DashboardStats {
  total_users: number
  total_books: number
  total_chapters: number
  total_comments: number
  total_reading_sessions: number
  total_purchases: number
}

interface RecentUser {
  id: string
  username: string
  display_name: string
  role: string
  created_at: number
}

interface RecentBook {
  id: string
  title: string
  status: string
  created_at: number
  creator_name: string
}

export default function AdminDashboardPage() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([])
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) {
        if (res.status === 403) {
          navigate('/')
          return
        }
        throw new Error('Failed to load dashboard')
      }
      const data = await res.json()
      setStats(data.stats)
      setRecentUsers(data.recent_users || [])
      setRecentBooks(data.recent_books || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '2rem' }}>
        管理后台
      </h1>

      {/* Stats Grid */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {[
            { label: '总用户', value: stats.total_users, color: 'var(--accent)' },
            { label: '总书籍', value: stats.total_books, color: '#059669' },
            { label: '总章节', value: stats.total_chapters, color: '#d97706' },
            { label: '总评论', value: stats.total_comments, color: '#dc2626' },
            { label: '阅读次数', value: stats.total_reading_sessions, color: '#7c3aed' },
            { label: '购买次数', value: stats.total_purchases, color: '#db2777' }
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '1.5rem',
              backgroundColor: 'var(--paper)',
              borderRadius: '2px',
              border: '1px solid var(--rule)'
            }}>
              <div style={{ fontSize: '1.875rem', fontWeight: 500, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginTop: '0.25rem' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Users */}
      <div style={{ backgroundColor: 'var(--paper)', borderRadius: '2px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          最近注册用户
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>用户名</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>角色</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>注册时间</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--paper-2)' }}>
                  <td style={{ padding: '0.75rem' }}>{user.display_name || user.username}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      backgroundColor: user.role === 'admin' ? '#fee2e2' : user.role === 'creator' ? '#dbeafe' : 'var(--paper-2)',
                      color: user.role === 'admin' ? '#dc2626' : user.role === 'creator' ? 'var(--accent)' : 'var(--ink-2)'
                    }}>
                      {user.role}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--ink-3)' }}>
                    {new Date(user.created_at * 1000).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Books */}
      <div style={{ backgroundColor: 'var(--paper)', borderRadius: '2px', padding: '1.5rem' }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
          最近发布书籍
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--rule)' }}>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>书名</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>作者</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>状态</th>
                <th style={{ textAlign: 'left', padding: '0.75rem' }}>发布时间</th>
              </tr>
            </thead>
            <tbody>
              {recentBooks.map((book) => (
                <tr key={book.id} style={{ borderBottom: '1px solid var(--paper-2)' }}>
                  <td style={{ padding: '0.75rem' }}>{book.title}</td>
                  <td style={{ padding: '0.75rem' }}>{book.creator_name}</td>
                  <td style={{ padding: '0.75rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      backgroundColor: book.status === 'published' ? '#d1fae5' : '#fef3c7',
                      color: book.status === 'published' ? '#065f46' : '#92400e'
                    }}>
                      {book.status}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem', color: 'var(--ink-3)' }}>
                    {new Date(book.created_at * 1000).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
