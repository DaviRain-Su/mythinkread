import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

interface Proposal {
  id: string
  title: string
  description: string
  type: string
  proposer_name: string
  status: string
  votes_for: number
  votes_against: number
  voting_end_at: number
  created_at: number
}

export default function DaoPage() {
  const navigate = useNavigate()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    type: 'feature',
    voting_duration_days: 7
  })

  useEffect(() => {
    loadProposals()
  }, [])

  const loadProposals = async () => {
    try {
      const res = await fetch('/api/dao/proposals?status=active')
      if (!res.ok) throw new Error('Failed to load proposals')
      const data = await res.json()
      setProposals(data.items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateProposal = async () => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch('/api/dao/proposals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(newProposal)
      })
      if (!res.ok) throw new Error('Failed to create proposal')
      setShowCreateForm(false)
      setNewProposal({ title: '', description: '', type: 'feature', voting_duration_days: 7 })
      loadProposals()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create proposal')
    }
  }

  const handleVote = async (proposalId: string, voteType: string) => {
    try {
      const token = localStorage.getItem('mtr_token')
      const res = await fetch(`/api/dao/proposals/${proposalId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ vote_type: voteType })
      })
      if (!res.ok) throw new Error('Failed to vote')
      loadProposals()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to vote')
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      feature: '功能',
      policy: '政策',
      treasury: '资金',
      upgrade: '升级'
    }
    return labels[type] || type
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string }> = {
      active: { bg: '#dbeafe', text: '#2563eb' },
      passed: { bg: '#d1fae5', text: '#059669' },
      rejected: { bg: '#fee2e2', text: '#dc2626' },
      executed: { bg: '#f3e8ff', text: '#7c3aed' }
    }
    return colors[status] || { bg: '#f3f4f6', text: '#6b7280' }
  }

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
  }

  return (
    <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '2rem 1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          社区治理 (DAO)
        </h1>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          发起提案
        </button>
      </div>

      {/* Create Proposal Form */}
      {showCreateForm && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0.75rem',
          padding: '1.5rem',
          marginBottom: '2rem',
          border: '1px solid #e5e7eb'
        }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>
            发起新提案
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <input
              type="text"
              value={newProposal.title}
              onChange={(e) => setNewProposal({ ...newProposal, title: e.target.value })}
              placeholder="提案标题"
              style={{
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
            <textarea
              value={newProposal.description}
              onChange={(e) => setNewProposal({ ...newProposal, description: e.target.value })}
              placeholder="提案描述"
              rows={4}
              style={{
                padding: '0.75rem',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                resize: 'vertical'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <select
                value={newProposal.type}
                onChange={(e) => setNewProposal({ ...newProposal, type: e.target.value })}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value="feature">功能</option>
                <option value="policy">政策</option>
                <option value="treasury">资金</option>
                <option value="upgrade">升级</option>
              </select>
              <select
                value={newProposal.voting_duration_days}
                onChange={(e) => setNewProposal({ ...newProposal, voting_duration_days: Number(e.target.value) })}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              >
                <option value={3}>3天</option>
                <option value={7}>7天</option>
                <option value={14}>14天</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={handleCreateProposal}
                disabled={!newProposal.title || !newProposal.description}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: newProposal.title && newProposal.description ? '#2563eb' : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: newProposal.title && newProposal.description ? 'pointer' : 'not-allowed'
                }}
              >
                提交提案
              </button>
              <button
                onClick={() => setShowCreateForm(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer'
                }}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Proposals List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {proposals.map((proposal) => {
          const totalVotes = proposal.votes_for + proposal.votes_against
          const forPercent = totalVotes > 0 ? (proposal.votes_for / totalVotes) * 100 : 0
          const statusColor = getStatusColor(proposal.status)

          return (
            <div
              key={proposal.id}
              style={{
                backgroundColor: 'white',
                borderRadius: '0.75rem',
                padding: '1.5rem',
                border: '1px solid #e5e7eb'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      backgroundColor: statusColor.bg,
                      color: statusColor.text
                    }}>
                      {getTypeLabel(proposal.type)}
                    </span>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      fontSize: '0.75rem',
                      backgroundColor: statusColor.bg,
                      color: statusColor.text
                    }}>
                      {proposal.status}
                    </span>
                  </div>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{proposal.title}</h3>
                  <p style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                    by {proposal.proposer_name} · {new Date(proposal.created_at * 1000).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <p style={{ color: '#374151', lineHeight: 1.5, marginBottom: '1rem' }}>
                {proposal.description}
              </p>

              {/* Voting Progress */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                  <span>支持: {proposal.votes_for}</span>
                  <span>反对: {proposal.votes_against}</span>
                </div>
                <div style={{ height: '0.5rem', backgroundColor: '#fee2e2', borderRadius: '0.25rem', overflow: 'hidden' }}>
                  <div style={{
                    width: `${forPercent}%`,
                    height: '100%',
                    backgroundColor: '#22c55e',
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              {/* Vote Buttons */}
              {proposal.status === 'active' && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleVote(proposal.id, 'for')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#dcfce7',
                      color: '#166534',
                      border: '1px solid #bbf7d0',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    支持
                  </button>
                  <button
                    onClick={() => handleVote(proposal.id, 'against')}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      backgroundColor: '#fee2e2',
                      color: '#991b1b',
                      border: '1px solid #fecaca',
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      fontSize: '0.875rem'
                    }}
                  >
                    反对
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {proposals.length === 0 && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          暂无活跃提案，发起第一个提案吧
        </div>
      )}
    </div>
  )
}
