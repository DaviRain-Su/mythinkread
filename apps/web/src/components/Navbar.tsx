import { useAuthStore } from '../stores/authStore'
import { useLangStore } from '../stores/langStore'
import { useNavigate, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { Icon } from './mtr/primitives'
import React, { useState, useCallback } from 'react'

// Kumo UI Command Palette type
interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Array<{ label: string; value: string }>
  onSelect: (value: string) => void
  placeholder?: string
}

// Kumo UI Command Palette (lazy loaded to avoid bundle size impact)
const CommandPalette = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.CommandPalette as unknown as React.ComponentType<CommandPaletteProps>,
  }))
)

const NAV_ITEMS: Array<[string, string, string, string]> = [
  ['/books', 'discover', 'Discover', '发现'],
  ['/studio', 'studio', 'Studio', '写作台'],
  ['/social', 'social', 'Club', '书友圈'],
  ['/wiki', 'wiki', 'Wiki', '知识宇宙'],
  ['/dashboard', 'data', 'Data', '数据'],
  ['/rankings', 'ranks', 'Ranks', '榜单'],
  ['/booklists', 'lists', 'Lists', '书单'],
  ['/feed', 'feed', 'Feed', '动态'],
  ['/recommendations', 'recs', 'For you', '推荐'],
  ['/public-domain', 'archive', 'Archive', '公版'],
  ['/fsrs', 'fsrs', 'SRS', '记忆'],
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { lang, toggle } = useLangStore()
  const [commandOpen, setCommandOpen] = useState(false)

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  const handleCommandSelect = useCallback((value: string) => {
    navigate(value)
    setCommandOpen(false)
  }, [navigate])

  const commandItems = NAV_ITEMS.map(([path, _key, en, zh]) => ({
    label: lang === 'zh' ? zh : en,
    value: path,
  }))

  return (
    <nav
      style={{
        background: 'var(--paper)',
        borderBottom: '1px solid var(--rule)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          padding: '14px 28px',
          display: 'flex',
          alignItems: 'center',
          gap: 22,
        }}
      >
        {/* Wordmark */}
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            color: 'var(--ink)',
          }}
        >
          <span
            className="display"
            style={{ fontSize: 22, fontWeight: 500, letterSpacing: '-0.5px' }}
          >
            mythink
            <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>read</span>
          </span>
          <span
            className="mono"
            style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '.14em' }}
          >
            v1·MVP
          </span>
        </button>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: 2, flex: 1, marginLeft: 14, alignItems: 'center' }}>
          {NAV_ITEMS.map(([path, key, en, zh]) => {
            const active = isActive(path)
            return (
              <button
                key={key}
                onClick={() => navigate(path)}
                style={{
                  padding: '18px 12px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 13,
                  color: active ? 'var(--ink)' : 'var(--ink-3)',
                  fontWeight: active ? 500 : 400,
                  borderBottom: active
                    ? '1.5px solid var(--accent)'
                    : '1.5px solid transparent',
                  marginBottom: -15,
                  background: 'none',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  gap: 6,
                }}
              >
                <span>{lang === 'zh' ? zh : en}</span>
              </button>
            )
          })}
        </nav>

        {/* Search - Command Palette */}
        <button
          onClick={() => setCommandOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 10px',
            border: '1px solid var(--rule)',
            borderRadius: 2,
            minWidth: 220,
            color: 'var(--ink-4)',
            background: 'var(--paper)',
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          <Icon name="search" size={13} />
          <span className="sans" style={{ fontSize: 12 }}>
            {lang === 'zh' ? '搜索书籍、作者、CID…' : 'Search books, authors, CIDs…'}
          </span>
          <span className="mono" style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.7 }}>
            ⌘K
          </span>
        </button>

        {commandOpen && (
          <React.Suspense fallback={null}>
            <CommandPalette
              open={commandOpen}
              onOpenChange={setCommandOpen}
              items={commandItems}
              onSelect={handleCommandSelect}
              placeholder={lang === 'zh' ? '搜索页面...' : 'Search pages...'}
            />
          </React.Suspense>
        )}

        {/* Language toggle */}
        <div
          style={{
            display: 'flex',
            background: 'var(--paper)',
            border: '1px solid var(--ink)',
            borderRadius: 2,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            letterSpacing: '0.1em',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          {[
            ['en', 'EN'],
            ['zh', '中文'],
          ].map(([k, lbl]) => (
            <div
              key={k}
              onClick={() => toggle()}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: lang === k ? 'var(--ink)' : 'transparent',
                color: lang === k ? 'var(--paper)' : 'var(--ink-2)',
                fontWeight: lang === k ? 600 : 400,
                fontFamily:
                  k === 'zh'
                    ? "var(--font-cjk, 'Noto Serif SC', serif)"
                    : 'inherit',
              }}
            >
              {lbl}
            </div>
          ))}
        </div>

        {/* Right cluster */}
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/create')}
              className="btn accent"
              style={{ fontSize: 12, padding: '7px 12px' }}
            >
              <Icon name="pen" size={11} /> Create
            </button>
            <NotificationBell />
            <button
              onClick={() => navigate('/profile')}
              title={user?.username}
              style={{
                width: 30,
                height: 30,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--terracotta), var(--moss))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {user?.username?.[0]?.toUpperCase() ?? 'Y'}
            </button>
            <button
              onClick={() => {
                logout()
                navigate('/')
              }}
              className="chip"
              style={{ cursor: 'pointer' }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => navigate('/login')}
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: 13,
                color: 'var(--ink-2)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 4px',
              }}
            >
              Sign in
            </button>
            <button
              onClick={() => navigate('/register')}
              className="btn accent"
              style={{ fontSize: 12, padding: '7px 14px' }}
            >
              Join
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}
