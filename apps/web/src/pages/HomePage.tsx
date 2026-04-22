import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLangStore } from '../stores/langStore'
import {
  AIRatioBar,
  AI_BADGES,
  Badge,
  BilingualTitle,
  CID,
  Cover,
  Icon,
  aiTypeFromPct,
  type AIType,
  type CoverBook,
} from '../components/mtr/primitives'
import BookShelf3D from '../components/mtr/BookShelf3D'
import React from 'react'

// Kumo UI Skeleton (lazy loaded)
const KumoSkeleton = React.lazy(() =>
  import('@cloudflare/kumo').then((m) => ({
    default: m.SkeletonLine as unknown as React.ComponentType<any>,
  }))
)

interface ApiBook {
  id: string
  title: string
  author?: string
  description?: string
  rating_avg?: number
  rating_count?: number
  ai_ratio?: number
  ai_percent?: number
  cid?: string
  tags?: string[]
  chapters?: unknown[]
  word_count?: number
  published_at?: string
}

interface DisplayBook extends CoverBook {
  id: string
  title: string
  zh?: string
  author: string
  summary: string
  type: AIType
  aiPct: number
  tags: string[]
  stars: number
  readers: number
  cid: string
  chapters: number
  words: number
}

const FALLBACK_BOOKS: DisplayBook[] = [
  {
    id: 'mirror-of-moon',
    title: 'The Mirror of Moonfall',
    zh: '月落之镜',
    author: 'Aster-07 × Yu Wen',
    summary:
      'A disgraced astronomer returns to her mountain village where the moon has started falling a few minutes earlier each night.',
    type: 'light',
    aiPct: 68,
    tags: ['Mystery', '悬疑'],
    stars: 4.6,
    readers: 12408,
    cid: 'bafybeihxyz4q2qk7m3tla',
    chapters: 24,
    words: 184200,
    published: '2026·03',
    coverTop: '#2d3a52',
    coverBot: '#0d1421',
    coverInk: '#e8d9a8',
  },
  {
    id: 'garden-glass',
    title: 'A Garden Made of Glass',
    zh: '玻璃的花园',
    author: 'Lin Qi',
    summary:
      'Three sisters inherit a greenhouse full of extinct flowers whose petals, when pressed, recall the last minutes of someone\u2019s life.',
    type: 'heavy',
    aiPct: 22,
    tags: ['Literary', '文学'],
    stars: 4.8,
    readers: 8120,
    cid: 'bafybeigx88p12fml3q',
    chapters: 18,
    words: 142000,
    published: '2026·01',
    coverTop: '#8a5f3a',
    coverBot: '#3a2212',
    coverInk: '#f0e4c7',
  },
  {
    id: 'nine-station',
    title: 'Nine-Station Local',
    zh: '九站慢车',
    author: 'Claude-4 × Tao',
    summary:
      'A conductor on the last analog subway discovers that one of nine stations appears only to passengers who have lost someone.',
    type: 'light',
    aiPct: 54,
    tags: ['Sci-Fi', '科幻'],
    stars: 4.4,
    readers: 6204,
    cid: 'bafybeic4hns7p2w0ev',
    chapters: 12,
    words: 98400,
    published: '2026·04',
    coverTop: '#4a5c3f',
    coverBot: '#1a2418',
    coverInk: '#dbe4c7',
  },
  {
    id: 'pure-archive',
    title: 'The Archive of Rain',
    zh: '雨之档案馆',
    author: 'Nebula-Gen',
    summary:
      'An apprentice archivist must catalog every rain that has fallen on the city since 1847. Some of them will not stay still.',
    type: 'pure',
    aiPct: 96,
    tags: ['Fantasy', '奇幻'],
    stars: 4.2,
    readers: 3180,
    cid: 'bafybeiqj9xn2rkwnea',
    chapters: 20,
    words: 120200,
    published: '2026·02',
    coverTop: '#4a3a5c',
    coverBot: '#1d1428',
    coverInk: '#d9c9e6',
  },
  {
    id: 'kitchen-north',
    title: 'The Kitchen of the North Wind',
    zh: '北风的厨房',
    author: 'Marn Vey',
    summary:
      'Each recipe in Grandmother Vey\u2019s book makes the reader remember a winter that never happened — and it\u2019s always the warmer for it.',
    type: 'heavy',
    aiPct: 18,
    tags: ['Cozy', '治愈'],
    stars: 4.7,
    readers: 9820,
    cid: 'bafybeicqf3n1mzaho7',
    chapters: 16,
    words: 76200,
    published: '2026·02',
    coverTop: '#b5754a',
    coverBot: '#5a2f18',
    coverInk: '#fbead0',
  },
  {
    id: 'six-return',
    title: 'Six Rooms, One Return',
    zh: '六间屋,一场归来',
    author: 'Yu Wen × Qwen',
    summary:
      'A war widow revisits the six rooms of her childhood apartment in the order she left them — each one a different year.',
    type: 'light',
    aiPct: 72,
    tags: ['Drama', '剧情'],
    stars: 4.5,
    readers: 4300,
    cid: 'bafybeihg7mpqek2ntc',
    chapters: 10,
    words: 60400,
    published: '2026·03',
    coverTop: '#6c3a4a',
    coverBot: '#2a1020',
    coverInk: '#f4d5dc',
  },
]

function normalise(api: ApiBook, fallback?: DisplayBook): DisplayBook {
  const aiPct =
    typeof api.ai_percent === 'number'
      ? api.ai_percent
      : typeof api.ai_ratio === 'number'
      ? api.ai_ratio <= 1
        ? Math.round(api.ai_ratio * 100)
        : Math.round(api.ai_ratio)
      : fallback?.aiPct ?? 50
  return {
    id: api.id,
    title: api.title,
    zh: fallback?.zh,
    author: api.author ?? fallback?.author ?? 'Unknown',
    summary: api.description ?? fallback?.summary ?? '',
    type: aiTypeFromPct(aiPct),
    aiPct,
    tags: api.tags ?? fallback?.tags ?? [],
    stars: api.rating_avg ?? fallback?.stars ?? 0,
    readers: api.rating_count ?? fallback?.readers ?? 0,
    cid: api.cid ?? fallback?.cid ?? '',
    chapters: Array.isArray(api.chapters) ? api.chapters.length : fallback?.chapters ?? 0,
    words: api.word_count ?? fallback?.words ?? 0,
    published: api.published_at ?? fallback?.published ?? '—',
    coverTop: fallback?.coverTop,
    coverBot: fallback?.coverBot,
    coverInk: fallback?.coverInk,
  }
}

type FilterKey = 'all' | AIType

export default function HomePage() {
  const navigate = useNavigate()
  const { lang } = useLangStore()
  const [books, setBooks] = useState<DisplayBook[]>(FALLBACK_BOOKS)
  const [filter, setFilter] = useState<FilterKey>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/books?limit=12')
        if (!res.ok) return
        const data = await res.json()
        const items: ApiBook[] = Array.isArray(data?.items) ? data.items : []
        if (cancelled || items.length === 0) return
        const merged = items.map((b, i) => normalise(b, FALLBACK_BOOKS[i % FALLBACK_BOOKS.length]))
        setBooks(merged)
      } catch {
        /* keep fallback */
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const featured = books[0]
  const filtered = useMemo(
    () => (filter === 'all' ? books : books.filter((b) => b.type === filter)),
    [books, filter],
  )

  return (
    <div style={{ background: 'var(--paper)', color: 'var(--ink)' }}>
      {/* Hero */}
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '48px 44px 32px',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            gap: 40,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ minWidth: 320, flex: 1 }}>
            <div className="eyebrow">Vol. 04 · Spring 2026 · Issue 11</div>
            <h1
              className="display"
              style={{
                fontSize: 'clamp(40px, 5.5vw, 64px)',
                fontWeight: 300,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                marginTop: 10,
                marginBottom: 0,
                textWrap: 'balance',
              }}
            >
              {lang === 'zh' ? (
                <>
                  机器之
                  <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>书</span>
                  ，人之读。
                </>
              ) : (
                <>
                  The reader of{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>machines</span>.
                </>
              )}
            </h1>
            <div
              className={lang === 'zh' ? 'cjk' : ''}
              style={{
                fontSize: 18,
                color: 'var(--ink-3)',
                marginTop: 12,
                letterSpacing: '.08em',
              }}
            >
              {lang === 'zh'
                ? '一个 AI 原生的文学图书馆。'
                : 'An AI-native literary library.'}
            </div>
          </div>
          <aside style={{ width: 240 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>
              {lang === 'zh' ? '本周数据' : 'Week in numbers'}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {(lang === 'zh'
                ? [
                    ['2,184', '新作品'],
                    ['847K', '阅读分钟'],
                    ['48.3%', '人机比例'],
                    ['12,041', 'CID 铸造'],
                  ]
                : [
                    ['2,184', 'New titles'],
                    ['847K', 'Minutes read'],
                    ['48.3%', 'Human·machine'],
                    ['12,041', 'CIDs minted'],
                  ]
              ).map(([v, label]) => (
                <div key={label}>
                  <div className="display" style={{ fontSize: 26, lineHeight: 1 }}>
                    {v}
                  </div>
                  <div
                    className="mono"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-3)',
                      marginTop: 4,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {label}
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </section>

      {/* Featured */}
      {featured && (
        <section
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '36px 44px',
            borderBottom: '1px solid var(--rule)',
            display: 'grid',
            gridTemplateColumns: '240px 1fr 240px',
            gap: 40,
            alignItems: 'center',
          }}
        >
          <Cover book={featured} size="xl" />
          <div>
            <div className="eyebrow">{lang === 'zh' ? '本周精选' : "This week's picked read"}</div>
            <div style={{ marginTop: 10 }}>
              <BilingualTitle en={featured.title} zh={featured.zh} size={42} />
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--ink-3)',
                marginTop: 14,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}
            >
              {lang === 'zh'
                ? `${featured.author} · ${featured.chapters} 章 · ${featured.words.toLocaleString()} 字`
                : `By ${featured.author} · ${featured.chapters} ch · ${featured.words.toLocaleString()} w`}
            </div>
            <p
              className="body-serif"
              style={{
                fontSize: 17,
                lineHeight: 1.55,
                color: 'var(--ink-2)',
                marginTop: 18,
                fontStyle: 'italic',
                maxWidth: 520,
              }}
            >
              &ldquo;{featured.summary}&rdquo;
            </p>
            <div
              style={{
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                marginTop: 22,
                flexWrap: 'wrap',
              }}
            >
              <button
                className="btn accent"
                onClick={() => navigate(`/books/${featured.id}`)}
              >
                <Icon name="book" size={12} /> {lang === 'zh' ? '开始阅读' : 'Begin reading'}
              </button>
              <button
                className="btn ghost"
                onClick={() => navigate(`/books/${featured.id}`)}
              >
                {lang === 'zh' ? '详情' : 'Details'}
              </button>
              <Badge type={featured.type} />
              <AIRatioBar pct={featured.aiPct} />
              {featured.cid && <CID value={featured.cid} />}
            </div>
          </div>
          <div style={{ borderLeft: '1px solid var(--rule)', paddingLeft: 22 }}>
            <div className="eyebrow">{lang === 'zh' ? 'AI 比例' : 'AI · blend'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
              <div
                className="display"
                style={{ fontSize: 56, fontWeight: 300, lineHeight: 1 }}
              >
                {featured.aiPct}
              </div>
              <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                % {lang === 'zh' ? '机器' : 'machine'}
              </div>
            </div>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}
            >
              {100 - featured.aiPct}% {lang === 'zh' ? '人工编辑 · 4,120 次修订' : 'human edit · 4,120 revisions'}
            </div>
            <hr className="rule-h" style={{ margin: '18px 0' }} />
            <div className="eyebrow">{lang === 'zh' ? '编辑评语' : "Editor's remark"}</div>
            <p
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                color: 'var(--ink-2)',
                marginTop: 10,
                fontStyle: 'italic',
                fontFamily: 'var(--font-body)',
              }}
            >
              &ldquo;{lang === 'zh'
                ? '读像一个数学家不小心讲出的鬼故事。'
                : 'Reads like a ghost story that a mathematician has accidentally told.'}&rdquo;
            </p>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--ink-4)', marginTop: 8 }}
            >
              — WENLIN, {lang === 'zh' ? '主编' : 'CH. EDITOR'}
            </div>
          </div>
        </section>
      )}

      {/* Filter row */}
      <section
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '22px 44px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          borderBottom: '1px solid var(--rule-2)',
          flexWrap: 'wrap',
        }}
      >
        <div className="eyebrow">{lang === 'zh' ? '按 AI 比例筛选' : 'Filter by AI-blend'}</div>
        {(
          lang === 'zh'
            ? ([
                ['all', '全部', null],
                ['pure', '纯 AI', 'pure'],
                ['light', '轻度人机', 'light'],
                ['heavy', '重度人机', 'heavy'],
              ] as Array<[FilterKey, string, AIType | null]>)
            : ([
                ['all', 'All', null],
                ['pure', 'Pure AI', 'pure'],
                ['light', 'Light collab', 'light'],
                ['heavy', 'Heavy human', 'heavy'],
              ] as Array<[FilterKey, string, AIType | null]>)
        ).map(([k, lbl, t]) => (
          <button
            key={k}
            className={`chip ${filter === k ? 'active' : ''}`}
            onClick={() => setFilter(k)}
            style={{ border: 'none', fontFamily: 'inherit' }}
          >
            {t && <span className="dot" style={{ background: AI_BADGES[t].color }} />}
            {lbl}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <div
          className="mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Icon name="grid" size={11} /> Grid &nbsp;/&nbsp;{' '}
          <Icon name="list" size={11} /> List
        </div>
      </section>

      {/* 3D Bookshelf */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '20px 44px' }}>
        <BookShelf3D
          books={filtered.slice(0, 8).map((b, i) => ({
            id: b.id,
            title: b.title,
            author: b.author,
            color: b.coverTop || '#8a5f3a',
            aiPct: b.aiPct,
            height: 1.5 + (b.words / 200000) * 1.5,
            position: [
              (i % 4) * 1.2 - 1.8,
              0.75 + (b.words / 200000) * 0.75,
              Math.floor(i / 4) * 0.5 - 0.25,
            ] as [number, number, number],
          }))}
          onBookClick={(book) => navigate(`/books/${book.id}`)}
        />
      </section>

      {/* Grid */}
      <section style={{ maxWidth: 1280, margin: '0 auto', padding: '30px 44px 80px' }}>
        {loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '28px 36px' }}>
            <React.Suspense fallback={null}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 18, paddingBottom: 22 }}>
                  <div style={{ height: 140, background: 'var(--paper-2)', borderRadius: 2 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <KumoSkeleton width="60%" height={16} />
                    <KumoSkeleton width="80%" height={20} />
                    <KumoSkeleton width="40%" height={12} />
                    <KumoSkeleton width="100%" height={14} />
                    <KumoSkeleton width="70%" height={14} />
                  </div>
                </div>
              ))}
            </React.Suspense>
          </div>
        )}
        {!loading && (
          <>
            <header
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                marginBottom: 22,
              }}
            >
              <h2
                className="display"
                style={{
                  fontSize: 28,
                  fontWeight: 400,
                  letterSpacing: '-0.02em',
                  margin: 0,
                }}
              >
                {lang === 'zh' ? '新入档' : 'New from the archive'}
              </h2>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                {filtered.length} TITLES
              </div>
            </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '28px 36px',
          }}
        >
          {filtered.map((b, i) => (
            <article
              key={b.id}
              onClick={() => navigate(`/books/${b.id}`)}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr',
                gap: 18,
                paddingBottom: 22,
                borderBottom: '1px solid var(--rule-2)',
                cursor: 'pointer',
              }}
            >
              <Cover book={b} size="md" />
              <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    gap: 6,
                    marginBottom: 6,
                    alignItems: 'center',
                  }}
                >
                  <div
                    className="mono"
                    style={{
                      fontSize: 9,
                      color: 'var(--ink-3)',
                      letterSpacing: '.1em',
                    }}
                  >
                    № {String(i + 1).padStart(3, '0')}
                  </div>
                  <div style={{ flex: 1 }} />
                  <Badge type={b.type} sm />
                </div>
                <div
                  className="display"
                  style={{
                    fontSize: 20,
                    lineHeight: 1.1,
                    fontWeight: 400,
                    letterSpacing: '-0.015em',
                    marginBottom: 2,
                  }}
                >
                  {lang === 'zh' && b.zh ? b.zh : b.title}
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--ink-3)',
                    letterSpacing: '.08em',
                    marginBottom: 8,
                    textTransform: 'uppercase',
                  }}
                >
                  {lang === 'zh' ? b.author : `By ${b.author}`}
                </div>
                <p
                  style={{
                    fontSize: 13.5,
                    color: 'var(--ink-2)',
                    lineHeight: 1.55,
                    margin: 0,
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {b.summary.slice(0, 110)}
                  {b.summary.length > 110 ? '…' : ''}
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    alignItems: 'center',
                    marginTop: 'auto',
                    paddingTop: 12,
                  }}
                >
                  <AIRatioBar pct={b.aiPct} hideLabel />
                  <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>
                    <Icon name="star" size={10} color="var(--terracotta)" />{' '}
                    {b.stars.toFixed(1)} · {(b.readers / 1000).toFixed(1)}k
                  </span>
                  <div style={{ flex: 1 }} />
                  <Icon name="bookmark" size={12} color="var(--ink-3)" />
                </div>
              </div>
            </article>
          ))}
        </div>
      </>
    )}
    </section>
  </div>
)
}
