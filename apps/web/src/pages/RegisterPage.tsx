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

export default function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const inputStyle = { width: '100%', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: 2, padding: '8px 10px' }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 8) {
      setError('密码至少需要 8 个字符')
      return
    }

    setLoading(true)

    try {
      await register(username, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen mtr" style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', padding: '0 1rem' }}>
      <div style={{ width: '100%', maxWidth: '28rem', background: 'var(--paper)', border: '1px solid var(--rule)', borderRadius: '2px', padding: '2rem' }}>
        <h2 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, textAlign: 'center', marginBottom: '1.5rem' }}>注册</h2>

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
            <Suspense fallback={<input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mtr-input" required minLength={3} maxLength={20} pattern="[a-z0-9_]+" title="3-20 个字符，仅支持字母、数字、下划线" style={{ width: '100%' }} />}>
              <KumoInput
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_]+"
                title="3-20 个字符，仅支持字母、数字、下划线"
                style={inputStyle}
              />
            </Suspense>
            <p style={{ marginTop: '0.25rem', fontSize: '0.75rem', color: 'var(--ink-3)' }}>
              3-20 个字符，仅支持字母、数字、下划线
            </p>
          </div>

          <div>
            <Suspense fallback={<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>密码</label>}>
              <KumoLabel style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
                密码
              </KumoLabel>
            </Suspense>
            <Suspense fallback={<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mtr-input" required minLength={8} style={{ width: '100%' }} />}>
              <KumoInput
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                minLength={8}
                style={inputStyle}
              />
            </Suspense>
          </div>

          <div>
            <Suspense fallback={<label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>确认密码</label>}>
              <KumoLabel style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: 'var(--ink)', marginBottom: '0.25rem' }}>
                确认密码
              </KumoLabel>
            </Suspense>
            <Suspense fallback={<input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mtr-input" required style={{ width: '100%' }} />}>
              <KumoInput
                type="password"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value)}
                required
                style={inputStyle}
              />
            </Suspense>
          </div>

          <Suspense fallback={<button type="submit" disabled={loading} className="btn accent" style={{ width: '100%', justifyContent: 'center' }}>{loading ? '注册中...' : '注册'}</button>}>
            <KumoButton
              type="submit"
              loading={loading}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              {loading ? '注册中...' : '注册'}
            </KumoButton>
          </Suspense>
        </form>

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.875rem', color: 'var(--ink-3)' }}>
          已有账号？{' '}
          <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
            立即登录
          </a>
        </p>
      </div>
    </div>
  )
}
