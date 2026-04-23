import { useState, Suspense } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import React from 'react'

// Kumo UI components (lazy loaded)
const KumoButton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Button as unknown as React.ComponentType<Record<string, unknown>>,
  }))
)
const KumoInput = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Input as unknown as React.ComponentType<Record<string, unknown>>,
  }))
)
const KumoLabel = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.Label as unknown as React.ComponentType<Record<string, unknown>>,
  }))
)

export default function LoginPage() {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = { width: '100%', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2, padding: '8px 10px' }

  return (
    <div className="screen mtr" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: '2px', padding: '2rem' }}>
        <h2 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, textAlign: 'center', marginBottom: '1.5rem' }}>登录</h2>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--paper-2)', color: 'var(--crimson)', border: '1px solid var(--rule)', borderRadius: '2px', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <Suspense fallback={<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>用户名</label>}>
              <KumoLabel style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
                用户名
              </KumoLabel>
            </Suspense>
            <Suspense fallback={<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mtr-input" required style={{ width: '100%' }} />}>
              <KumoInput
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                style={inputStyle}
              />
            </Suspense>
          </div>

          <div>
            <Suspense fallback={<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>密码</label>}>
              <KumoLabel style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
                密码
              </KumoLabel>
            </Suspense>
            <Suspense fallback={<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mtr-input" required style={{ width: '100%' }} />}>
              <KumoInput
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </Suspense>
          </div>

          <Suspense fallback={<button type="submit" disabled={loading} className="btn accent" style={{ width: '100%', justifyContent: 'center' }}>{loading ? '登录中...' : '登录'}</button>}>
            <KumoButton
              type="submit"
              loading={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? '登录中...' : '登录'}
            </KumoButton>
          </Suspense>
        </form>

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--ink-3)' }}>
          还没有账号？{' '}
          <a href="/register" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            立即注册
          </a>
        </p>
      </div>
    </div>
  )
}
