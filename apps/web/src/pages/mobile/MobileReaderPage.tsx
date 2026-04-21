import { useState } from 'react'
import { Icon } from '../../components/mtr/primitives'

const TOOLBAR_ICONS = ['menu', 'headphones', 'sun', 'highlight', 'chat'] as const

export default function MobileReaderPage() {
  const [progress] = useState(14)
  const [timeLeft] = useState('7m')

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--paper)',
      }}
      className="mtr"
    >
      {/* Scrollable content */}
      <div
        style={{ flex: 1, padding: '0 28px 20px', overflow: 'auto' }}
        className="phone-scroll"
      >
        <div className="eyebrow" style={{ marginTop: 20, textAlign: 'center' }}>
          CHAPTER ONE · 1 of 10
        </div>
        <div
          className="display"
          style={{
            fontSize: 26,
            fontWeight: 400,
            textAlign: 'center',
            marginTop: 6,
            letterSpacing: -0.3,
            lineHeight: 1.1,
          }}
        >
          The Letter of Seven Words
        </div>
        <div
          className="cjk"
          style={{
            textAlign: 'center',
            fontSize: 12,
            color: 'var(--ink-3)',
            marginTop: 4,
            marginBottom: 22,
          }}
        >
          七个字的信
        </div>

        <div
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 17,
            lineHeight: 1.75,
            color: 'var(--ink)',
            textWrap: 'pretty',
          }}
        >
          <p style={{ margin: '0 0 14px' }}>
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.8em',
                float: 'left',
                lineHeight: 0.8,
                marginRight: 6,
                marginTop: 2,
                color: 'var(--terracotta)',
              }}
            >
              T
            </span>
            he letter was seven words long. Her mother had never been one to
            waste.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            Sen Yaolan read it on the train, then folded it,{' '}
            <mark className="hl gold">
              then read it again, then folded it in exactly the opposite way
            </mark>{' '}
            because folding it the first way had made her feel like she was
            closing something her mother had left open.
          </p>
          <p style={{ margin: '0 0 14px' }}>
            The coordinates pointed to the old well behind the house. The time
            was four minutes past midnight.
          </p>
          <div className="ornament" style={{ color: 'var(--ink-4)' }}>
            ◆
          </div>
          <p style={{ margin: '0 0 14px' }}>
            Outside the train window the country returned to her in pieces. A
            hill she had once drawn. A river she had mispronounced until the age
            of eleven.
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          padding: '0 28px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
          {progress}%
        </div>
        <div
          style={{
            flex: 1,
            height: 1.5,
            background: 'var(--rule)',
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${progress}%`,
              background: 'var(--ink)',
            }}
          />
        </div>
        <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)' }}>
          {timeLeft}
        </div>
      </div>

      {/* Bottom toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '10px 20px 14px',
          borderTop: '1px solid var(--rule)',
        }}
      >
        {TOOLBAR_ICONS.map((n) => (
          <button
            key={n}
            style={{
              padding: 8,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Icon name={n} size={16} color="var(--ink-2)" />
          </button>
        ))}
      </div>
    </div>
  )
}
