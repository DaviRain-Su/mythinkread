import { useState, useEffect } from 'react'

interface OverviewStats {
  period: { days: number; since: number }
  new_users: number
  active_readers: number
  total_reads: number
  new_books: number
  new_comments: number
  avg_rating: number
  top_books: Array<{
    id: string
    title: string
    read_count: number
    rating_avg: number
    creator_name: string
  }>
  top_creators: Array<{
    id: string
    display_name: string
    total_books: number
    total_reads: number
  }>
  daily_stats: Array<{
    date: string
    new_users: number
    new_creators: number
  }>
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(30)

  useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const token = localStorage.getItem('mtr_token')
        const res = await fetch(`/api/analytics/overview?days=${days}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to load analytics')
        const data = await res.json()
        setStats(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    loadAnalytics()
  }, [days])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500 }}>
          数据分析
        </h1>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="mtr-input"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '0.875rem'
          }}
        >
          <option value={7}>最近7天</option>
          <option value={30}>最近30天</option>
          <option value={90}>最近90天</option>
        </select>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {[
            { label: '新用户', value: stats.new_users, color: 'var(--accent)' },
            { label: '活跃读者', value: stats.active_readers, color: 'var(--moss)' },
            { label: '总阅读', value: stats.total_reads, color: 'var(--gold)' },
            { label: '新书籍', value: stats.new_books, color: 'var(--terracotta)' },
            { label: '新评论', value: stats.new_comments, color: 'var(--indigo)' },
            { label: '平均评分', value: stats.avg_rating, color: 'var(--crimson)' }
          ].map((stat) => (
            <div key={stat.label} style={{
              padding: '1.5rem',
              background: 'var(--paper)',
              borderRadius: '2px',
              border: '1px solid var(--rule)'
            }}>
              <div style={{ fontSize: '1.875rem', fontWeight: 'bold', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginTop: '0.25rem' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Top Books */}
      {stats?.top_books && stats.top_books.length > 0 && (
        <div style={{ background: 'var(--paper)', borderRadius: '2px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid var(--rule)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            热门书籍
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {stats.top_books.map((book, index) => (
              <div key={book.id} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
                padding: '0.75rem',
                borderRadius: '2px',
                background: 'var(--paper-2)'
              }}>
                <div style={{
                  width: '2rem',
                  height: '2rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '2px',
                  background: index < 3 ? 'var(--accent)' : 'var(--paper-3)',
                  color: index < 3 ? 'var(--accent-ink)' : 'var(--ink-3)',
                  fontWeight: 'bold'
                }}>
                  {index + 1}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, color: 'var(--ink)' }}>{book.title}</div>
                  <div style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>{book.creator_name}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.875rem', color: 'var(--ink-3)' }}>
                  <div>👁 {book.read_count}</div>
                  <div>⭐ {book.rating_avg?.toFixed(1)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Daily Stats Chart */}
      {stats?.daily_stats && stats.daily_stats.length > 0 && (
        <div style={{ background: 'var(--paper)', borderRadius: '2px', padding: '1.5rem', border: '1px solid var(--rule)' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            每日增长
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.daily_stats.slice(0, 14).map((day) => (
              <div key={day.date} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '6rem', fontSize: '0.875rem', color: 'var(--ink-3)' }}>
                  {day.date}
                </div>
                <div style={{ flex: 1, display: 'flex', gap: '0.5rem' }}>
                  <div style={{
                    width: `${Math.min(day.new_users * 10, 100)}%`,
                    height: '1.5rem',
                    background: 'var(--paper-2)',
                    borderRadius: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    color: 'var(--accent)'
                  }}>
                    {day.new_users > 0 ? `+${day.new_users}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
