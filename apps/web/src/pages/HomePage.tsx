import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const navigate = useNavigate()

  return (
    <div>
      {/* Hero Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '4rem 1rem',
        backgroundColor: '#f9fafb'
      }}>
        <h1 style={{
          fontSize: '3.5rem',
          fontWeight: 'bold',
          color: '#2563eb',
          marginBottom: '1rem'
        }}>
          MyThinkRead
        </h1>
        <p style={{
          fontSize: '1.25rem',
          color: '#6b7280',
          marginBottom: '2rem',
          textAlign: 'center',
          maxWidth: '42rem'
        }}>
          AI 原生阅读平台 —— 用 AI 创作，在云端阅读，让数据真正属于你
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={() => navigate('/books')}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            浏览书库
          </button>
          <button
            onClick={() => navigate('/create')}
            style={{
              padding: '0.75rem 1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              color: '#111827',
              backgroundColor: 'white',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
          >
            开始创作
          </button>
        </div>
      </div>

      {/* Features Section */}
      <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '4rem 1rem' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem' }}>
          核心特性
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '2rem'
        }}>
          {[
            {
              title: 'AI 创作',
              desc: '内置 AI 辅助创作工具，一键生成章节、续写、改写'
            },
            {
              title: '去中心化存储',
              desc: '内容永久存储在 IPFS + Arweave，永不丢失'
            },
            {
              title: '数据主权',
              desc: '你的阅读数据完全属于你，可随时导出'
            },
            {
              title: '社交阅读',
              desc: '评论、书单、榜单，与读者社区互动'
            }
          ].map((feature) => (
            <div key={feature.title} style={{
              padding: '1.5rem',
              backgroundColor: 'white',
              borderRadius: '0.75rem',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                {feature.title}
              </h3>
              <p style={{ color: '#6b7280', lineHeight: 1.5 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
