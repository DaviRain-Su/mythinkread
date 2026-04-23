import { useAuthStore } from '../stores/authStore'
import { useNavigate, useLocation } from 'react-router-dom'
import NotificationBell from './NotificationBell'
import { Icon } from './mtr/primitives'
import React, { useState, useCallback, Suspense } from 'react'
import { useTranslation } from 'react-i18next'

// Kumo UI Command Palette type
interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  items: Array<{ label: string; value: string }>
  onSelect: (value: string) => void
  placeholder?: string
}

// Kumo UI components (lazy loaded)
const CommandPalette = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.CommandPalette as unknown as React.ComponentType<CommandPaletteProps>,
  }))
)
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<Record<string, unknown>>,
  }))
)

const NAV_ITEMS: Array<[string, string]> = [
  ['/books', 'discover'],
  ['/studio', 'studio'],
  ['/social', 'social'],
  ['/wiki', 'wiki'],
  ['/dashboard', 'data'],
  ['/rankings', 'rankings'],
  ['/booklists', 'lists'],
  ['/feed', 'feed'],
  ['/recommendations', 'recs'],
  ['/public-domain', 'archive'],
  ['/fsrs', 'fsrs'],
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()
  const { t, i18n } = useTranslation()
  const [commandOpen, setCommandOpen] = useState(false)

  const isActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path))

  const handleCommandSelect = useCallback((value: string) => {
    navigate(value)
    setCommandOpen(false)
  }, [navigate])

  const toggleLang = (lang?: string) => {
    const target = lang ?? (i18n.language?.startsWith('zh') ? 'en' : 'zh')
    i18n.changeLanguage(target)
  }

  const commandItems = NAV_ITEMS.map(([path, key]) => ({
    label: t(`nav.${key}`),
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
          {NAV_ITEMS.map(([path, key]) => {
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
                <span>{t(`nav.${key}`)}</span>
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
            {t('common.search')}
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
              placeholder={t('common.search')}
            />
          </React.Suspense>
        )}

        {/* Language toggle */}
        <div
          style={{
            display: 'flex',
            flexShrink: 0,
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
              onClick={() => toggleLang(k)}
              style={{
                padding: '6px 12px',
                cursor: 'pointer',
                background: i18n.language?.startsWith(k) ? 'var(--ink)' : 'transparent',
                color: i18n.language?.startsWith(k) ? 'var(--paper)' : 'var(--ink-2)',
                fontWeight: i18n.language?.startsWith(k) ? 600 : 400,
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
            <Suspense fallback={
              <button className="btn accent" style={{ fontSize: 12, padding: '7px 12px' }}>
                <Icon name="pen" size={11} /> {t('common.create')}
              </button>
            }>
              <KumoButton
                onClick={() => navigate('/create')}
                size="sm"
                style={{ fontSize: 12, padding: '7px 12px' }}
              >
                <Icon name="pen" size={11} /> {t('common.create')}
              </KumoButton>
            </Suspense>
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
              {t('common.signOut')}
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
              {t('common.signIn')}
            </button>
            <Suspense fallback={
              <button className="btn accent" style={{ fontSize: 12, padding: '7px 14px' }}>
                {t('common.join')}
              </button>
            }>
              <KumoButton
                onClick={() => navigate('/register')}
                size="sm"
                style={{ fontSize: 12, padding: '7px 14px' }}
              >
                {t('common.join')}
              </KumoButton>
            </Suspense>
          </div>
        )}
      </div>
    </nav>
  )
}
