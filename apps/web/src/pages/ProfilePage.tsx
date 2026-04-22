import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'

interface Book {
  id: string
  title: string
  status: string
  word_count: number
  chapter_count: number
  created_at: number
}

interface ReadingProgress {
  book_id: string
  book_title: string
  percent: number
  is_finished: number
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [myBooks, setMyBooks] = useState<Book[]>([])
  const [progress, setProgress] = useState<ReadingProgress[]>([])
  const [activeTab, setActiveTab] = useState<'books' | 'progress' | 'data' | 'wallet'>('books')
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [walletInput, setWalletInput] = useState('')

  useEffect(() => {
    if (user) {
      loadMyBooks()
      loadProgress()
      loadWallet()
    }
  }, [user])

  const loadMyBooks = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/books?page=1&limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      // Filter books by current user (this is simplified, ideally backend filters)
      setMyBooks(data.items || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadProgress = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/export/reading', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setProgress(data.reading_progress || [])
    } catch (err) {
      console.error(err)
    }
  }

  const loadWallet = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/solana/wallet', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) return
      const data = await res.json()
      setWalletAddress(data.wallet_address)
    } catch (err) {
      console.error(err)
    }
  }

  const handleLinkWallet = async () => {
    if (!walletInput.trim()) return
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/solana/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          wallet_address: walletInput,
          signature: 'mock_signature',
          message: 'link_wallet'
        })
      })
      if (!res.ok) throw new Error('Failed to link wallet')
      setWalletAddress(walletInput)
      setWalletInput('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to link wallet')
    }
  }

  const handleUnlinkWallet = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      await fetch('/api/solana/unlink', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      })
      setWalletAddress(null)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to unlink wallet')
    }
  }

  const handleExport = async (type: string) => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/export/${type}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Export failed')
      const data = await res.json()
      
      // Download as JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `mythinkread-export-${type}-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Export failed')
    }
  }

  if (!user) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem' }}>
        <p>请先登录</p>
        <button className="btn accent" onClick={() => navigate('/login')} style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>
          去登录
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      {/* User Info */}
      <div style={{ backgroundColor: 'var(--paper)', borderRadius: '2px', padding: '2rem', marginBottom: '2rem' }}>
        <h1 className="display" style={{ fontSize: '1.5rem', fontWeight: 500, marginBottom: '0.5rem' }}>
          {user.display_name || user.username}
        </h1>
        <p style={{ color: 'var(--ink-3)' }}>@{user.username}</p>
        <button
          className="btn ghost"
          onClick={() => {
            logout()
            navigate('/')
          }}
          style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem'
          }}
        >
          退出登录
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'books' as const, label: '我的作品' },
          { key: 'progress' as const, label: '阅读进度' },
          { key: 'data' as const, label: '数据导出' },
          { key: 'wallet' as const, label: '钱包' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? 'btn accent' : 'btn ghost'}
            style={{
              padding: '0.5rem 1rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'books' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {myBooks.map((book) => (
            <div
              key={book.id}
              onClick={() => navigate(`/books/${book.id}`)}
              style={{
                padding: '1rem',
                backgroundColor: 'var(--paper)',
                borderRadius: '2px',
                border: '1px solid var(--rule)',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontWeight: 600 }}>{book.title}</h3>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: book.status === 'published' ? '#d1fae5' : '#fef3c7',
                  color: book.status === 'published' ? '#065f46' : '#92400e'
                }}>
                  {book.status === 'published' ? '已发布' : '草稿'}
                </span>
              </div>
              <p style={{ fontSize: '0.875rem', color: 'var(--ink-3)', marginTop: '0.5rem' }}>
                {book.chapter_count} 章 · {book.word_count} 字
              </p>
            </div>
          ))}
          {myBooks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-3)' }}>
              还没有作品，<button className="btn accent" onClick={() => navigate('/create')}>去创作</button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'progress' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {progress.map((p) => (
            <div
              key={p.book_id}
              style={{
                padding: '1rem',
                backgroundColor: 'var(--paper)',
                borderRadius: '2px',
                border: '1px solid var(--rule)'
              }}
            >
              <h3 style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{p.book_title}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ flex: 1, height: '0.5rem', backgroundColor: 'var(--rule)', borderRadius: '0.25rem' }}>
                  <div style={{
                    width: `${p.percent}%`,
                    height: '100%',
                    backgroundColor: 'var(--accent)',
                    borderRadius: '0.25rem'
                  }} />
                </div>
                <span style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>
                  {p.percent.toFixed(1)}%
                </span>
              </div>
              {p.is_finished === 1 && (
                <span style={{ fontSize: '0.75rem', color: '#059669', marginTop: '0.5rem', display: 'block' }}>
                  ✓ 已读完
                </span>
              )}
            </div>
          ))}
          {progress.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-3)' }}>
              还没有阅读记录
            </div>
          )}
        </div>
      )}

      {activeTab === 'data' && (
        <div style={{ backgroundColor: 'var(--paper)', borderRadius: '2px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '1rem' }}>数据导出</h2>
          <p style={{ color: 'var(--ink-3)', marginBottom: '1.5rem' }}>
            导出你的个人数据，包括阅读进度、批注、评论等。数据以 JSON 格式下载。
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              className="btn ghost"
              onClick={() => handleExport('reading')}
              style={{
                padding: '0.75rem',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 600 }}>导出阅读进度</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>包含所有书籍的阅读进度</div>
            </button>
            <button
              className="btn ghost"
              onClick={() => handleExport('all')}
              style={{
                padding: '0.75rem',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 600 }}>导出全部数据</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-3)' }}>包含阅读进度、批注、评论等所有数据</div>
            </button>
          </div>
        </div>
      )}

      {activeTab === 'wallet' && (
        <div style={{ backgroundColor: 'var(--paper)', borderRadius: '2px', padding: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 500, marginBottom: '1rem' }}>Solana 钱包</h2>
          
          {walletAddress ? (
            <div>
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ color: 'var(--ink-3)', marginBottom: '0.5rem' }}>已连接钱包</p>
                <p style={{ fontFamily: 'monospace', fontSize: '0.875rem', wordBreak: 'break-all' }}>
                  {walletAddress}
                </p>
              </div>
              <button
                className="btn ghost"
                onClick={handleUnlinkWallet}
                style={{
                  padding: '0.5rem 1rem'
                }}
              >
                断开连接
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--ink-3)', marginBottom: '1rem' }}>
                连接 Solana 钱包以解锁 Web3 功能
              </p>
              <input
                type="text"
                value={walletInput}
                onChange={(e) => setWalletInput(e.target.value)}
                placeholder="输入 Solana 钱包地址..."
                className="mtr-input"
                style={{
                  width: '100%',
                  marginBottom: '0.75rem'
                }}
              />
              <button
                className={walletInput.trim() ? 'btn accent' : 'btn ghost'}
                onClick={handleLinkWallet}
                disabled={!walletInput.trim()}
                style={{
                  padding: '0.5rem 1rem'
                }}
              >
                连接钱包
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
