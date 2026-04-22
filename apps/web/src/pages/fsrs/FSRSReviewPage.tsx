import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface MemoryCard {
  id: string
  front: string
  back: string | null
  context: string | null
  fsrs_d: number
  fsrs_s: number
  fsrs_r: number
  fsrs_next_review: number
  fsrs_reps: number
  fsrs_lapses: number
  source_type: string
  book_id: string | null
}

interface ReviewStats {
  total_cards: number
  due_now: number
  due_tomorrow: number
  avg_difficulty: number
  avg_stability: number
}

export default function FSRSReviewPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [completed, setCompleted] = useState(false)

  useEffect(() => {
    loadDueCards()
  }, [])

  const loadDueCards = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/fsrs/due', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Failed to load cards')
      const data = await res.json()
      setCards(data.due_cards || [])
      setStats(data.stats || null)
      setCurrentIndex(0)
      setShowAnswer(false)
      setCompleted((data.due_cards || []).length === 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleGrade = async (grade: number) => {
    const card = cards[currentIndex]
    if (!card) return

    try {
      const token = localStorage.getItem('mtr_token')
      await fetch(`/api/fsrs/cards/${card.id}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ grade }),
      })

      if (currentIndex + 1 >= cards.length) {
        setCompleted(true)
      } else {
        setCurrentIndex((i) => i + 1)
        setShowAnswer(false)
      }
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) {
    return (
      <div style={centerStyle}>
        <div className="eyebrow">{t('common.loading')}</div>
      </div>
    )
  }

  if (completed || cards.length === 0) {
    return (
      <div style={{ ...centerStyle, flexDirection: 'column', gap: 20 }}>
        <div className="display" style={{ fontSize: 32 }}>
          {t('fsrs.completed')}
        </div>
        {stats && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              textAlign: 'center',
            }}
          >
            <StatBox
              label={t('fsrs.totalCards')}
              value={stats.total_cards}
            />
            <StatBox
              label={t('fsrs.dueTomorrow')}
              value={stats.due_tomorrow}
            />
          </div>
        )}
        <button className="btn accent" onClick={() => navigate('/')}>
          {t('common.backToHome')}
        </button>
      </div>
    )
  }

  const card = cards[currentIndex]
  const progress = ((currentIndex + 1) / cards.length) * 100

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--paper-2)',
        color: 'var(--ink)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 44px',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--paper)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div className="eyebrow">
            {t('fsrs.title')} · FSRS
          </div>
          <div className="display" style={{ fontSize: 20, marginTop: 4 }}>
            {t('fsrs.startReview')}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>
            {currentIndex + 1} / {cards.length}
          </div>
          <div
            style={{
              width: 120,
              height: 4,
              background: 'var(--paper-3)',
              borderRadius: 2,
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                background: 'var(--terracotta)',
                borderRadius: 2,
                transition: 'width 0.3s',
              }}
            />
          </div>
        </div>
      </div>

      {/* Card */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 640,
            background: 'var(--paper)',
            border: '1px solid var(--rule)',
            borderRadius: 2,
            padding: '48px',
          }}
        >
          {/* Source tag */}
          <div style={{ marginBottom: 20 }}>
            <span className="chip" style={{ fontSize: 9 }}>
              {card.source_type?.toUpperCase()}
            </span>
            {card.context && (
              <span
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--ink-3)',
                  marginLeft: 10,
                }}
              >
                {card.context}
              </span>
            )}
          </div>

          {/* Front */}
          <div
            className="display"
            style={{
              fontSize: 24,
              lineHeight: 1.4,
              marginBottom: 32,
              textWrap: 'pretty',
            }}
          >
            {card.front}
          </div>

          {/* Answer */}
          {showAnswer && card.back && (
            <div
              className="fade-in"
              style={{
                padding: '24px',
                background: 'var(--paper-2)',
                border: '1px solid var(--rule-2)',
                borderRadius: 2,
                marginBottom: 32,
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>
                {t('fsrs.answer')}
              </div>
              <div style={{ fontSize: 16, lineHeight: 1.6, color: 'var(--ink-2)' }}>
                {card.back}
              </div>
            </div>
          )}

          {/* Stats */}
          <div
            style={{
              display: 'flex',
              gap: 16,
              marginBottom: 32,
              fontSize: 11,
            }}
          >
            <div className="mono" style={{ color: 'var(--ink-3)' }}>
              D: {card.fsrs_d.toFixed(1)}
            </div>
            <div className="mono" style={{ color: 'var(--ink-3)' }}>
              S: {card.fsrs_s.toFixed(1)}d
            </div>
            <div className="mono" style={{ color: 'var(--ink-3)' }}>
              R: {(card.fsrs_r * 100).toFixed(0)}%
            </div>
            <div className="mono" style={{ color: 'var(--ink-3)' }}>
              {t('fsrs.reps')}: {card.fsrs_reps}
            </div>
          </div>

          {/* Actions */}
          {!showAnswer ? (
            <button
              className="btn"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => setShowAnswer(true)}
            >
              {t('fsrs.showAnswer')}
            </button>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
              <GradeButton
                label={t('fsrs.again')}
                sublabel={`<1d`}
                color="var(--crimson)"
                onClick={() => handleGrade(1)}
              />
              <GradeButton
                label={t('fsrs.hard')}
                sublabel={`~${Math.round(card.fsrs_s * 1.2)}d`}
                color="var(--gold)"
                onClick={() => handleGrade(2)}
              />
              <GradeButton
                label={t('fsrs.good')}
                sublabel={`~${Math.round(card.fsrs_s * 2.5)}d`}
                color="var(--terracotta)"
                onClick={() => handleGrade(3)}
              />
              <GradeButton
                label={t('fsrs.easy')}
                sublabel={`~${Math.round(card.fsrs_s * 4)}d`}
                color="var(--moss)"
                onClick={() => handleGrade(4)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function GradeButton({
  label,
  sublabel,
  color,
  onClick,
}: {
  label: string
  sublabel: string
  color: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '14px 8px',
        border: `1px solid ${color}`,
        borderRadius: 2,
        background: 'transparent',
        color: color,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = color + '15'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
      <span className="mono" style={{ fontSize: 9, opacity: 0.7 }}>
        {sublabel}
      </span>
    </button>
  )
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div
      style={{
        padding: '16px 24px',
        border: '1px solid var(--rule)',
        borderRadius: 2,
      }}
    >
      <div className="display" style={{ fontSize: 28 }}>{value}</div>
      <div className="mono" style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 4 }}>
        {label}
      </div>
    </div>
  )
}

const centerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '60vh',
  background: 'var(--paper)',
  color: 'var(--ink)',
}
