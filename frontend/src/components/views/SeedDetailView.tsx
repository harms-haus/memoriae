import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Timeline, type TimelineItem } from '@mother/components/Timeline'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { ExpandingPanel } from '@mother/components/ExpandingPanel'
import { Badge } from '@mother/components/Badge'
import { renderHashTags } from '../../utils/renderHashTags'
import { TagList } from '../TagList'
import { FollowupsPanel } from '../FollowupsPanel'
import type { SeedTransaction, Seed, SeedState, Tag as TagType } from '../../types'
import './Views.css'
import './SeedDetailView.css'

interface Automation {
  id: string
  name: string
  description: string | null
  enabled: boolean
}

interface SeedStateResponse {
  seed_id: string
  current_state: SeedState
  transactions_applied: number
}

interface SeedDetailViewProps {
  seedId: string
  onBack: () => void
}

/**
 * SeedDetailView displays:
 * - Current seed state (computed from transactions)
 * - Timeline of all transactions (immutable)
 */
export function SeedDetailView({ seedId, onBack }: SeedDetailViewProps) {
  const navigate = useNavigate()
  const [seed, setSeed] = useState<Seed | null>(null)
  const [transactions, setTransactions] = useState<SeedTransaction[]>([])
  const [currentState, setCurrentState] = useState<SeedState | null>(null)
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loadingAutomations, setLoadingAutomations] = useState(false)
  const [runningAutomations, setRunningAutomations] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!seedId) {
      setError('Seed ID is required')
      setLoading(false)
      return
    }

    loadSeedData()
    loadAutomations()
  }, [seedId])

  const loadSeedData = async () => {
    if (!seedId) return

    try {
      setLoading(true)
      setError(null)

      // Load seed, timeline transactions, current state, and tags in parallel
      const [seedData, transactionsData, stateData, tagsData] = await Promise.all([
        api.get<Seed>(`/seeds/${seedId}`),
        api.getSeedTransactions(seedId),
        api.get<SeedStateResponse>(`/seeds/${seedId}/state`),
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])

      setSeed(seedData)
      setTransactions(transactionsData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      setCurrentState(stateData.current_state)
      setTags(tagsData)
    } catch (err) {
      console.error('Error loading seed data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load seed')
    } finally {
      setLoading(false)
    }
  }

  const loadAutomations = async () => {
    if (!seedId) return

    try {
      setLoadingAutomations(true)
      const automationsData = await api.get<Automation[]>(`/seeds/${seedId}/automations`)
      setAutomations(automationsData)
    } catch (err) {
      console.error('Error loading automations:', err)
      // Don't set error state - automations are optional
    } finally {
      setLoadingAutomations(false)
    }
  }

  const handleRunAutomation = async (automationId: string) => {
    if (!seedId || runningAutomations.has(automationId)) return

    // Store initial transaction count to detect when new transactions are added
    const initialTransactionCount = transactions.length
    let lastTransactionCount = initialTransactionCount

    try {
      setRunningAutomations((prev) => new Set(prev).add(automationId))
      setError(null) // Clear any previous errors

      const response = await api.post<{ message: string; jobId: string; automation: { id: string; name: string } }>(
        `/seeds/${seedId}/automations/${automationId}/run`
      )

      console.log('Automation queued:', response)

      // Poll for completion - check every 2 seconds for up to 20 seconds
      let attempts = 0
      const maxAttempts = 10
      const pollInterval = 2000

      const pollForCompletion = async () => {
        attempts++
        
        try {
          // Reload seed data to check if new transactions were created
          const [seedData, transactionsData, stateData] = await Promise.all([
            api.get<Seed>(`/seeds/${seedId}`),
            api.getSeedTransactions(seedId),
            api.get<SeedStateResponse>(`/seeds/${seedId}/state`),
          ])

          const sortedTransactions = transactionsData.sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          )
          const currentTransactionCount = sortedTransactions.length

          // Update state
          setSeed(seedData)
          setTransactions(sortedTransactions)
          setCurrentState(stateData.current_state)
          
          // Check if new transactions were created (automation completed)
          if (currentTransactionCount > lastTransactionCount) {
            // New transactions detected - automation completed
            console.log('Automation completed - new transactions detected')
            setRunningAutomations((prev) => {
              const next = new Set(prev)
              next.delete(automationId)
              return next
            })
            return
          }
          
          lastTransactionCount = currentTransactionCount
          
          // Check if we should continue polling
          if (attempts < maxAttempts) {
            setTimeout(pollForCompletion, pollInterval)
          } else {
            // Stop polling after max attempts (automation may have completed without creating transactions, or failed silently)
            console.log('Polling stopped - max attempts reached')
            setRunningAutomations((prev) => {
              const next = new Set(prev)
              next.delete(automationId)
              return next
            })
          }
        } catch (err) {
          console.error('Error polling for automation completion:', err)
          setRunningAutomations((prev) => {
            const next = new Set(prev)
            next.delete(automationId)
            return next
          })
        }
      }

      // Start polling after a short delay to give the job time to start
      setTimeout(pollForCompletion, pollInterval)
    } catch (err) {
      console.error('Error running automation:', err)
      const errorMessage = err instanceof Error 
        ? err.message 
        : axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to run automation'
      setError(errorMessage)
      setRunningAutomations((prev) => {
        const next = new Set(prev)
        next.delete(automationId)
        return next
      })
    }
  }

  // Transactions are immutable - no toggle functionality

  const extractTagName = (transaction: SeedTransaction): string | null => {
    if (transaction.transaction_type !== 'add_tag') return null
    const data = transaction.transaction_data
    if ('tag_name' in data) {
      return data.tag_name
    }
    return null
  }

  // No RUN_AUTOMATION transactions - automations just create their transactions directly

  // Group consecutive transactions of the same type
  interface TransactionGroup {
    transactionType: string
    transactions: SeedTransaction[]
    hasAutomation: boolean
    position: number
  }

  const groupedTransactions: TransactionGroup[] = useMemo(() => {
    if (transactions.length === 0) return []

    const groups: TransactionGroup[] = []
    let currentGroup: TransactionGroup | null = null

    // Get date range for position calculation
    const dates = transactions.map(transaction => new Date(transaction.created_at).getTime())
    const minDate = Math.min(...dates)
    const maxDate = Math.max(...dates)
    const dateRange = maxDate - minDate

    transactions.forEach((transaction) => {
      // Transactions are grouped together if consecutive and same type
      const shouldStartNewGroup = !currentGroup || 
        currentGroup.transactionType !== transaction.transaction_type

      if (shouldStartNewGroup) {
        if (currentGroup) {
          groups.push(currentGroup)
        }
        
        const transactionDate = new Date(transaction.created_at).getTime()
        const position = dateRange === 0 
          ? 0 
          : ((maxDate - transactionDate) / dateRange) * 100

        currentGroup = {
          transactionType: transaction.transaction_type,
          transactions: [transaction],
          hasAutomation: !!transaction.automation_id,
          position: Math.max(0, Math.min(100, position)),
        }
      } else {
        // Add to current group
        if (currentGroup) {
          currentGroup.transactions.push(transaction)
          if (transaction.automation_id) {
            currentGroup.hasAutomation = true
          }
          // Update position to the newest transaction in the group
          const transactionDate = new Date(transaction.created_at).getTime()
          const position = dateRange === 0 
            ? 0 
            : ((maxDate - transactionDate) / dateRange) * 100
          currentGroup.position = Math.max(0, Math.min(100, position))
        }
      }
    })

    // Don't forget the last group
    if (currentGroup) {
      groups.push(currentGroup)
    }

    return groups
  }, [transactions])

  const formatTransactionTime = (transaction: SeedTransaction): string => {
    const date = new Date(transaction.created_at)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  // Calculate timeline positions based on grouped transactions
  const timelineItems: TimelineItem[] = useMemo(() => {
    return groupedTransactions.map((group, index) => ({
      id: `group-${index}-${group.transactionType}`,
      position: group.position,
    }))
  }, [groupedTransactions])

  const formatTransactionDescription = (transaction: SeedTransaction): string => {
    switch (transaction.transaction_type) {
      case 'create_seed':
        return 'Seed created'
      case 'edit_content':
        return 'Content edited'
      case 'add_tag':
        const tagData = transaction.transaction_data
        if ('tag_name' in tagData) {
          return `Tag added: ${tagData.tag_name}`
        }
        return 'Tag added'
      case 'remove_tag':
        return 'Tag removed'
      case 'add_category':
        const catData = transaction.transaction_data
        if ('category_name' in catData) {
          return `Category added: ${catData.category_name}`
        }
        return 'Category added'
      case 'remove_category':
        return 'Category removed'
      case 'add_followup':
        return 'Follow-up added'
      default:
        return transaction.transaction_type
    }
  }

  const renderPanel = (index: number, width: number): React.ReactNode => {
    const group = groupedTransactions[index]
    if (!group) return null

    // Extract tag names for add_tag groups
    const tagNames = group.transactionType === 'add_tag' 
      ? group.transactions.map(t => extractTagName(t)).filter((name): name is string => name !== null)
      : []

    return (
      <div className="event-group-content">
        <div className="event-group-header">
          <span className="event-type">{group.transactionType}</span>
          {group.hasAutomation && (
            <Badge variant="primary">Auto</Badge>
          )}
        </div>
        <div className="event-group-body">
          {group.transactionType === 'add_tag' && tagNames.length > 0 ? (
            <div className="event-group-tags">
              {tagNames.map((tagName, tagIndex) => {
                const transaction = group.transactions[tagIndex]
                if (!transaction) return null
                const isLast = tagIndex === tagNames.length - 1
                return (
                  <span key={`${transaction.id}-${tagIndex}`}>
                    <span className="event-group-tag">
                      {tagName}
                    </span>
                    {!isLast && <span className="event-group-tag-separator">, </span>}
                  </span>
                )
              })}
            </div>
          ) : (
            <div className="event-group-items">
              {group.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="event-group-item"
                >
                  {formatTransactionDescription(transaction)}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  const renderOpposite = (index: number, width: number, panelSide: 'left' | 'right'): React.ReactNode => {
    const group = groupedTransactions[index]
    if (!group) return null

    // Use the newest transaction's time for the group
    const newestTransaction = group.transactions[0] // Transactions are sorted newest first
    if (!newestTransaction) return null

    return (
      <div className="event-time-opposite">
        <span className="event-time">{formatTransactionTime(newestTransaction)}</span>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="view-container">
        <Panel>
          <p>Loading seed...</p>
        </Panel>
      </div>
    )
  }

  if (error && !seed) {
    return (
      <div className="view-container">
        <Panel>
          <p className="text-error">{error}</p>
          <Button variant="primary" onClick={onBack}>
            Back to Seeds
          </Button>
        </Panel>
      </div>
    )
  }

  if (!seed) {
    return (
      <div className="view-container">
        <Panel>
          <p>Seed not found</p>
          <Button variant="primary" onClick={onBack}>
            Back to Seeds
          </Button>
        </Panel>
      </div>
    )
  }

  return (
    <div className="view-container seed-detail-container">
      <div className="seed-detail-header">
        <Button
          variant="secondary"
          onClick={onBack}
          aria-label="Back to seeds"
        >
          ← Back
        </Button>
        <h2 className="seed-detail-title">Seed Detail</h2>
      </div>

      {/* Current State Display */}
      <Panel variant="elevated" className="seed-detail-state">
        <h3 className="panel-header">Current State</h3>
        <div className="seed-content-display">
          <p className="seed-text">
            {(() => {
              // Create tag color map: tag name (lowercase) -> color
              const tagColorMap = new Map<string, string>()
              tags.forEach(tag => {
                if (tag.color) {
                  tagColorMap.set(tag.name.toLowerCase(), tag.color)
                }
              })
              return renderHashTags(currentState?.seed || '', (tagName) => {
                navigate(`/seeds/tag/${encodeURIComponent(tagName)}`)
              }, tagColorMap)
            })()}
          </p>
        </div>
        {currentState?.tags && currentState.tags.length > 0 && (
          <TagList
            tags={currentState.tags.map((tag) => {
              // Find the full tag object to get color
              const fullTag = tags.find(t => t.id === tag.id)
              return {
                id: tag.id,
                name: tag.name,
                color: fullTag?.color ?? null,
              }
            })}
            className="seed-tags"
            onTagClick={(tag) => {
              navigate(`/seeds/tag/${encodeURIComponent(tag.name)}`)
            }}
            suppressTruncate={true}
          />
        )}
        {currentState?.categories && currentState.categories.length > 0 && (
          <div className="seed-categories">
            <p className="label">Categories:</p>
            <ul>
              {currentState.categories.map((cat) => (
                <li key={cat.id}>{cat.name}</li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {/* Follow-ups Panel */}
      <FollowupsPanel seedId={seedId} />

      {/* Automations Section */}
      <ExpandingPanel
        variant="elevated"
        title="Run Automations"
        className="seed-detail-automations"
        defaultExpanded={false}
      >
        {loadingAutomations ? (
          <p className="text-secondary">Loading automations...</p>
        ) : automations.length === 0 ? (
          <p className="text-secondary">No automations available.</p>
        ) : (
          <div className="automations-list">
            {automations.map((automation) => (
              <div key={automation.id} className="automation-item">
                <div className="automation-info">
                  <div className="automation-header">
                    <span className="automation-name">{automation.name}</span>
                    {!automation.enabled && (
                      <Badge variant="warning">Disabled</Badge>
                    )}
                  </div>
                  {automation.description && (
                    <p className="automation-description">{automation.description}</p>
                  )}
                </div>
                <Button
                  variant="secondary"
                  onClick={() => handleRunAutomation(automation.id)}
                  disabled={!automation.enabled || runningAutomations.has(automation.id)}
                  aria-label={`Run ${automation.name} automation`}
                >
                  {runningAutomations.has(automation.id) ? 'Running...' : 'Run'}
                </Button>
              </div>
            ))}
          </div>
        )}
      </ExpandingPanel>

      {/* Timeline of Transactions */}
      <Panel variant="elevated" className="seed-detail-timeline">
        <h3 className="panel-header">Timeline</h3>
        {transactions.length === 0 ? (
          <p className="text-secondary">No transactions yet.</p>
        ) : (
          <Timeline
            items={timelineItems}
            mode="left"
            renderPanel={renderPanel}
            renderOpposite={renderOpposite}
            maxPanelWidth={400}
            panelSpacing={16}
            panelClickable={true}
          />
        )}
      </Panel>
    </div>
  )
}
