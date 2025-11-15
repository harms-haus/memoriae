import { useState, useEffect } from 'react'
import { Edit, RefreshCw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { ExpandingPanel } from '@mother/components/ExpandingPanel'
import type { Sprout, WikipediaSproutState, WikipediaReferenceSproutData, Seed } from '../../types'
import { useUserSettings } from '../../hooks/useUserSettings'
import { formatDateInTimezone, getBrowserTimezone } from '../../utils/timezone'
import { useNavigate } from 'react-router-dom'
import log from 'loglevel'
import './SproutDetail.css'

interface WikipediaSproutDetailProps {
  sprout: Sprout
  onUpdate: () => void
}

export function WikipediaSproutDetail({ sprout, onUpdate }: WikipediaSproutDetailProps) {
  const [state, setState] = useState<WikipediaSproutState | null>(null)
  const [seed, setSeed] = useState<Seed | null>(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editSummary, setEditSummary] = useState('')
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const { settings } = useUserSettings()
  const navigate = useNavigate()
  const logWikipediaSprout = log.getLogger('WikipediaSproutDetail')

  useEffect(() => {
    loadData()
  }, [sprout.id])

  const loadData = async () => {
    try {
      setLoading(true)
      // Fetch computed state from backend (includes all transactions)
      const computedState = await api.getWikipediaSproutState(sprout.id)
      setState(computedState)
      setEditSummary(computedState.summary)

      // Get seed info
      try {
        const seedData = await api.get<Seed>(`/seeds/${sprout.seed_id}`)
        setSeed(seedData)
      } catch (err) {
        logWikipediaSprout.warn('Could not load seed info', { seedId: sprout.seed_id, error: err })
      }
    } catch (err) {
      logWikipediaSprout.error('Error loading Wikipedia sprout data', { sproutId: sprout.id, error: err })
      // Fallback to sprout_data if API fails
      const sproutData = sprout.sprout_data as WikipediaReferenceSproutData
      const fallbackState: WikipediaSproutState = {
        reference: sproutData.reference,
        article_url: sproutData.article_url,
        article_title: sproutData.article_title,
        summary: sproutData.summary,
        transactions: [],
      }
      setState(fallbackState)
      setEditSummary(fallbackState.summary)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string | Date): string => {
    const userTimezone = settings?.timezone || getBrowserTimezone()
    const date = typeof dateString === 'string' ? dateString : dateString.toISOString()
    return formatDateInTimezone(date, userTimezone)
  }

  const handleEdit = async () => {
    if (saving || !state) return

    try {
      setSaving(true)
      await api.editWikipediaSprout(sprout.id, editSummary)
      // Reload the computed state to ensure we have the latest transactions
      const latestState = await api.getWikipediaSproutState(sprout.id)
      setState(latestState)
      setEditSummary(latestState.summary)
      setEditModalOpen(false)
      onUpdate()
    } catch (err) {
      logWikipediaSprout.error('Error editing Wikipedia sprout', { sproutId: sprout.id, error: err })
      alert(err instanceof Error ? err.message : 'Failed to edit Wikipedia sprout')
    } finally {
      setSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (regenerating || !state) {
      logWikipediaSprout.debug('Regenerate blocked', { regenerating, hasState: !!state })
      return
    }

    try {
      setRegenerating(true)
      logWikipediaSprout.debug('Starting regeneration', { sproutId: sprout.id })
      const newState = await api.regenerateWikipediaSprout(sprout.id)
      logWikipediaSprout.debug('Regeneration complete', { sproutId: sprout.id, newSummaryLength: newState.summary.length })
      // Reload the computed state to ensure we have the latest transactions
      const latestState = await api.getWikipediaSproutState(sprout.id)
      setState(latestState)
      setEditSummary(latestState.summary)
      onUpdate()
    } catch (err) {
      logWikipediaSprout.error('Error regenerating Wikipedia sprout', { sproutId: sprout.id, error: err })
      const errorMessage = err instanceof Error ? err.message : 'Failed to regenerate Wikipedia sprout'
      alert(errorMessage)
    } finally {
      setRegenerating(false)
    }
  }

  if (loading) {
    return (
      <Panel variant="elevated">
        <p className="text-secondary">Loading Wikipedia sprout...</p>
      </Panel>
    )
  }

  if (!state) {
    return (
      <Panel variant="elevated">
        <p className="text-error">Failed to load Wikipedia sprout data</p>
      </Panel>
    )
  }

  return (
    <div className="wikipedia-sprout-detail" style={{ display: 'flex', gap: 'var(--space-4)', flexDirection: 'column' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
        {/* Left column: Article summary */}
        <Panel variant="elevated" className="sprout-detail-panel">
          <div className="sprout-detail-header">
            <div className="sprout-detail-info" style={{ flex: 1 }}>
              <h3 className="panel-header" style={{ marginTop: 0 }}>{state.article_title}</h3>
              <p style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: 'var(--space-2)' }}>
                <a
                  href={state.article_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  [{state.article_url}]
                </a>
              </p>
              <div style={{ marginTop: 'var(--space-4)' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]} className="markdown-content">
                  {state.summary}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </Panel>

        {/* Right column: Seed info, transactions, edit button */}
        <Panel variant="elevated" className="sprout-detail-panel">
          <div className="sprout-detail-header">
            <div className="sprout-detail-info" style={{ flex: 1 }}>
              {seed && (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <h4 className="panel-header" style={{ marginTop: 0, marginBottom: 'var(--space-2)' }}>
                    Attached Seed
                  </h4>
                  <button
                    className="btn-ghost"
                    onClick={() => navigate(`/seeds/${seed.id}`)}
                    style={{ textAlign: 'left', width: '100%' }}
                  >
                    {seed.currentState.seed.substring(0, 100)}
                    {seed.currentState.seed.length > 100 ? '...' : ''}
                  </button>
                </div>
              )}

              {state.transactions.length > 0 && (
                <ExpandingPanel
                  variant="elevated"
                  title="Transaction History"
                  className="sprout-transactions-panel"
                  defaultExpanded={false}
                >
                  <div className="sprout-transactions">
                    {state.transactions.map((transaction) => (
                      <div key={transaction.id} className="sprout-transaction">
                        <div className="sprout-transaction-type">{transaction.transaction_type}</div>
                        <div className="sprout-transaction-time">{formatDate(transaction.created_at)}</div>
                      </div>
                    ))}
                  </div>
                </ExpandingPanel>
              )}

              <div style={{ marginTop: 'var(--space-4)', display: 'flex', gap: 'var(--space-2)' }}>
                <Button
                  variant="primary"
                  icon={Edit}
                  onClick={() => setEditModalOpen(true)}
                  aria-label="Edit summary"
                  title="Edit summary"
                >
                  Edit Summary
                </Button>
                <Button
                  variant="secondary"
                  icon={RefreshCw}
                  onClick={handleRegenerate}
                  disabled={regenerating}
                  aria-label="Regenerate summary"
                  title="Regenerate summary"
                >
                  {regenerating ? 'Regenerating...' : 'Regenerate'}
                </Button>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      {/* Edit modal */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={() => setEditModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <h3>Edit Summary</h3>
            <textarea
              className="textarea"
              value={editSummary}
              onChange={(e) => setEditSummary(e.target.value)}
              rows={15}
              style={{ width: '100%', marginTop: 'var(--space-4)', marginBottom: 'var(--space-4)' }}
            />
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setEditModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleEdit} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

