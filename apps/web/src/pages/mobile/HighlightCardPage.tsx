import { Cover, formatCID } from '../../components/mtr/primitives'

const BOOK = {
  id: 'mirror-of-moon',
  title: 'The Mirror of Moonfall',
  author: 'Aster-07 × Yu Wen',
  cid: 'bafybeihxyz4q2qk7m3tla',
  published: '2026·03',
  coverTop: '#2d3a52',
  coverBot: '#0d1421',
  coverInk: '#e8d9a8',
}

export default function HighlightCardPage() {
  return (
    <div
      style={{
        height: '100%',
        padding: 22,
        background: 'oklch(0.95 0.03 70)',
        display: 'flex',
        flexDirection: 'column',
      }}
      className="mtr"
    >
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: 24,
          background:
            'linear-gradient(170deg, oklch(0.97 0.02 75), oklch(0.90 0.05 55))',
          border: '1px solid var(--rule)',
        }}
      >
        <div
          className="eyebrow"
          style={{ color: 'var(--terracotta)' }}
        >
          A HIGHLIGHT
        </div>

        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: 24,
              lineHeight: 1.35,
              fontStyle: 'italic',
              textWrap: 'pretty',
              color: 'var(--ink)',
              letterSpacing: -0.2,
            }}
          >
            &ldquo;The remaining five words she kept privately, the way one
            keeps a tooth in a drawer: uselessly, but with a conviction that it
            may one day matter.&rdquo;
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Cover book={BOOK} size="xs" />
          <div>
            <div
              className="display"
              style={{
                fontSize: 13,
                fontWeight: 500,
                lineHeight: 1.1,
              }}
            >
              {BOOK.title}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 9,
                color: 'var(--ink-3)',
                marginTop: 3,
              }}
            >
              {BOOK.author.toUpperCase()} · CH 1 ¶ 3
            </div>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ textAlign: 'right' }}>
            <div
              className="display"
              style={{
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: -0.3,
              }}
            >
              mythink
              <span style={{ fontStyle: 'italic', color: 'var(--terracotta)' }}>
                read
              </span>
            </div>
            <div
              className="mono"
              style={{
                fontSize: 8,
                color: 'var(--ink-3)',
                marginTop: 2,
              }}
            >
              mtr · {formatCID(BOOK.cid)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
