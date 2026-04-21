import { useAuthStore } from '../stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell'

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()

  const isActive = (path: string) => location.pathname === path

  return (
    <nav style={{
      backgroundColor: 'white',
      borderBottom: '1px solid #e5e7eb',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      <div style={{
        maxWidth: '72rem',
        margin: '0 auto',
        padding: '0 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '3.5rem'
      }}>
        {/* Logo */}
        <button
          onClick={() => navigate('/')}
          style={{
            fontSize: '1.25rem',
            fontWeight: 'bold',
            color: '#2563eb',
            background: 'none',
            border: 'none',
            cursor: 'pointer'
          }}
        >
          MyThinkRead
        </button>

        {/* Navigation Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <button
            onClick={() => navigate('/search')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/search') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/search') ? 600 : 400
            }}
          >
            搜索
          </button>
          <button
            onClick={() => navigate('/books')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/books') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/books') ? 600 : 400
            }}
          >
            书库
          </button>
          <button
            onClick={() => navigate('/rankings')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/rankings') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/rankings') ? 600 : 400
            }}
          >
            榜单
          </button>
          <button
            onClick={() => navigate('/booklists')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/booklists') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/booklists') ? 600 : 400
            }}
          >
            书单
          </button>
          <button
            onClick={() => navigate('/feed')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/feed') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/feed') ? 600 : 400
            }}
          >
            动态
          </button>
          <button
            onClick={() => navigate('/recommendations')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/recommendations') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/recommendations') ? 600 : 400
            }}
          >
            推荐
          </button>
          <button
            onClick={() => navigate('/dao')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/dao') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/dao') ? 600 : 400
            }}
          >
            治理
          </button>
          <button
            onClick={() => navigate('/public-domain')}
            style={{
              fontSize: '0.875rem',
              color: isActive('/public-domain') ? '#2563eb' : '#4b5563',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: isActive('/public-domain') ? 600 : 400
            }}
          >
            公版书
          </button>

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button
                onClick={() => navigate('/create')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                创作
              </button>
              <NotificationBell />
              <button
                onClick={() => navigate('/profile')}
                style={{
                  fontSize: '0.875rem',
                  color: isActive('/profile') ? '#2563eb' : '#4b5563',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: isActive('/profile') ? 600 : 400
                }}
              >
                {user?.username}
              </button>
              <button
                onClick={() => navigate('/blog-settings')}
                style={{
                  fontSize: '0.875rem',
                  color: isActive('/blog-settings') ? '#2563eb' : '#4b5563',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                博客
              </button>
              <button
                onClick={() => {
                  logout()
                  navigate('/')
                }}
                style={{
                  fontSize: '0.875rem',
                  color: '#6b7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                退出
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <button
                onClick={() => navigate('/login')}
                style={{
                  fontSize: '0.875rem',
                  color: '#4b5563',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                登录
              </button>
              <button
                onClick={() => navigate('/register')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  borderRadius: '0.5rem',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                注册
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
