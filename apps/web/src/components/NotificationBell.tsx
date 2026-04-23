import { useState, useEffect } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  content: string
  is_read: number
  created_at: number
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [showPanel, setShowPanel] = useState(false)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const token = localStorage.getItem('mtr_token')
        if (!token) return
        const res = await fetch('/api/notifications?limit=10', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) return
        const data = await res.json()
        setNotifications(data.items || [])
        setUnreadCount(data.unread_count || 0)
      } catch (err) {
        console.error(err)
      }
    }
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      if (!token) return
      const res = await fetch('/api/notifications?limit=10', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setNotifications(data.items || [])
      setUnreadCount(data.unread_count || 0)
    } catch (err) {
      console.error(err)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const token = localStorage.getItem('mtr_token')
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      loadNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      loadNotifications()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowPanel(!showPanel)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '1.25rem',
          position: 'relative',
          padding: '0.5rem'
        }}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: '#ef4444',
            color: 'white',
            fontSize: '0.625rem',
            padding: '0.125rem 0.375rem',
            borderRadius: '9999px',
            minWidth: '1rem',
            textAlign: 'center'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          width: '360px',
          maxHeight: '480px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '0.75rem',
          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
          zIndex: 100,
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <span style={{ fontWeight: 600 }}>通知</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                style={{
                  fontSize: '0.75rem',
                  color: '#2563eb',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                全部已读
              </button>
            )}
          </div>

          <div style={{ overflowY: 'auto', maxHeight: '400px' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                暂无通知
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    backgroundColor: n.is_read ? 'white' : '#eff6ff'
                  }}
                >
                  <div style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.25rem' }}>
                    {n.title}
                  </div>
                  {n.content && (
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {n.content}
                    </div>
                  )}
                  <div style={{ fontSize: '0.625rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                    {new Date(n.created_at * 1000).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
