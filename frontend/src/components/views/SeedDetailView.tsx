import { useState, useEffect } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import { SeedView } from '../SeedView'
import { SeedTimeline } from '../SeedTimeline/SeedTimeline'
import type { TransactionHistoryMessage } from '../TransactionHistoryList'
import type { SeedTransaction, SeedTransactionType, SeedTransactionData, Seed, SeedState, Tag as TagType, Sprout } from '../../types'
import log from 'loglevel'
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

const getTransactionColor = (transaction: SeedTransaction): string => {
  switch (transaction.transaction_type) {
    case 'create_seed':
      return 'var(--accent-green)'
    case 'edit_content':
      return 'var(--accent-blue)'
    case 'add_tag':
      return 'var(--accent-purple)'
    case 'remove_tag':
      return 'var(--accent-pink)'
    case 'set_category':
      return 'var(--accent-yellow)'
    case 'remove_category':
      return 'var(--accent-orange)'
    case 'add_followup':
      return 'var(--accent-blue)'
    case 'add_sprout':
      return 'var(--accent-green)'
    default:
      return 'var(--text-secondary)'
  }
}

const logSeedDetail = log.getLogger('SeedDetailView')

/**
 * SeedDetailView displays:
 * - Current seed state (computed from transactions)
 * - Timeline of all transactions (immutable)
 */
export function SeedDetailView({ seedId, onBack }: SeedDetailViewProps) {
  const navigate = useNavigate()
  const [seed, setSeed] = useState<Seed | null>(null)
  const [transactions, setTransactions] = useState<SeedTransaction[]>([])
  const [sprouts, setSprouts] = useState<Sprout[]>([])
  const [currentState, setCurrentState] = useState<SeedState | null>(null)
  const [tags, setTags] = useState<TagType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [automations, setAutomations] = useState<Automation[]>([])
  const [loadingAutomations, setLoadingAutomations] = useState(false)
  const [runningAutomations, setRunningAutomations] = useState<Set<string>>(new Set())
  const [isEditing, setIsEditing] = useState(false)
  const [editedContent, setEditedContent] = useState<string | null>(null)
  const [editedTags, setEditedTags] = useState<Array<{ id: string; name: string }> | null>(null)

  // Helper function to format seedId for API calls
  // seedId can be:
  // - hashId only (7 chars): `/seeds/:hashId`
  // - hashId/slug: `/seeds/:hashId/:slug`
  // - full UUID (36 chars): `/seeds/:uuid` (backward compatibility)
  const getApiPath = (seedId: string): string => {
    // If it's a full UUID (36 chars), use it directly
    if (seedId.length === 36 && !seedId.includes('/')) {
      return `/seeds/${seedId}`
    }
    
    // If it contains '/', it's hashId/slug format
    if (seedId.includes('/')) {
      const [hashId, ...slugParts] = seedId.split('/')
      const slugPart = slugParts.join('/')
      return `/seeds/${hashId}/${slugPart}`
    }
    
    // Otherwise, it's just hashId
    return `/seeds/${seedId}`
  }

  useEffect(() => {
    if (!seedId) {
      setError('Seed ID is required')
      setLoading(false)
      return
    }

    loadSeedData()
    loadAutomations()
  }, [seedId])

  // Reset edited state when entering/exiting edit mode
  useEffect(() => {
    if (isEditing && currentState) {
      // Initialize edited state with current values
      setEditedContent(currentState.seed)
      setEditedTags(currentState.tags ? [...currentState.tags] : [])
    } else {
      // Clear edited state when exiting edit mode
      setEditedContent(null)
      setEditedTags(null)
    }
  }, [isEditing, currentState])

  const loadSeedData = async () => {
    if (!seedId) return

    try {
      setLoading(true)
      setError(null)

      // Format seedId for API calls
      const apiPath = getApiPath(seedId)

      // Load seed, timeline transactions, sprouts, current state, and tags in parallel
      const [seedData, transactionsData, sproutsData, stateData, tagsData] = await Promise.all([
        api.get<Seed>(apiPath),
        api.getSeedTransactions(seedId),
        api.getSproutsBySeedId(seedId).catch(() => []), // Sprouts may not exist yet
        api.get<SeedStateResponse>(`${apiPath}/state`),
        api.get<TagType[]>('/tags').catch(() => []), // Tags may not exist yet
      ])

      setSeed(seedData)
      setTransactions(transactionsData.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ))
      setSprouts(sproutsData)
      setCurrentState(stateData.current_state)
      setTags(tagsData)
    } catch (err) {
      logSeedDetail.error('Error loading seed data', { seedId, error: err })
      setError(err instanceof Error ? err.message : 'Failed to load seed')
    } finally {
      setLoading(false)
    }
  }

  const loadAutomations = async () => {
    if (!seedId) return

    try {
      setLoadingAutomations(true)
      // Format seedId for API calls
      const apiPath = getApiPath(seedId)
      const automationsData = await api.get<Automation[]>(`${apiPath}/automations`)
      setAutomations(automationsData)
    } catch (err) {
      logSeedDetail.error('Error loading automations', { seedId, error: err })
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

      // Format seedId for API calls
      const apiPath = getApiPath(seedId)
      const response = await api.post<{ message: string; jobId: string; automation: { id: string; name: string } }>(
        `${apiPath}/automations/${automationId}/run`
      )

      logSeedDetail.info('Automation queued', {
        seedId,
        automationId,
        jobId: response.jobId,
        automationName: response.automation?.name,
      })

      // Poll for completion - check every 2 seconds for up to 20 seconds
      let attempts = 0
      const maxAttempts = 10
      const pollInterval = 2000

      const pollForCompletion = async () => {
        attempts++
        
        try {
          // Reload seed data to check if new transactions were created
          const apiPath = getApiPath(seedId)
          const [seedData, transactionsData, sproutsData, stateData] = await Promise.all([
            api.get<Seed>(apiPath),
            api.getSeedTransactions(seedId),
            api.getSproutsBySeedId(seedId).catch(() => []), // Sprouts may not exist yet
            api.get<SeedStateResponse>(`${apiPath}/state`),
          ])
          
          setSprouts(sproutsData)

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
            logSeedDetail.info('Automation completed - new transactions detected', { seedId, automationId })
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
            logSeedDetail.warn('Polling stopped - max attempts reached', { seedId, automationId })
            setRunningAutomations((prev) => {
              const next = new Set(prev)
              next.delete(automationId)
              return next
            })
          }
        } catch (err) {
          logSeedDetail.error('Error polling for automation completion', { seedId, automationId, error: err })
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
      logSeedDetail.error('Error running automation', { seedId, automationId, error: err })
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

  // Color function for timeline items (handles both transactions and sprouts)
  const getColor = (message: TransactionHistoryMessage): string => {
    // Check if it's a grouped message (has groupKey but ID doesn't match a transaction)
    // Also check for "Tags Added" title as a fallback
    if ((message.groupKey && message.id.startsWith('group-')) || message.title === 'Tags Added') {
      // For grouped messages, use the groupKey to determine color
      // If groupKey is 'add_tag' or title is 'Tags Added', use add_tag color
      const transactionType = (message.groupKey === 'add_tag' || message.title === 'Tags Added') 
        ? 'add_tag' 
        : (message.groupKey as SeedTransactionType | undefined)
      
      if (transactionType) {
        // Create a synthetic transaction object to use getTransactionColor
        // Use appropriate transaction data type based on transaction type
        let transactionData: SeedTransactionData
        if (transactionType === 'add_tag') {
          transactionData = { tag_id: '', tag_name: '' }
        } else if (transactionType === 'create_seed') {
          transactionData = { content: '' }
        } else if (transactionType === 'edit_content') {
          transactionData = { content: '' }
        } else if (transactionType === 'remove_tag') {
          transactionData = { tag_id: '', tag_name: '' }
        } else if (transactionType === 'set_category') {
          transactionData = { category_id: '', category_name: '', category_path: '' }
        } else if (transactionType === 'remove_category') {
          transactionData = { category_id: '' }
        } else if (transactionType === 'add_followup') {
          transactionData = { followup_id: '' }
        } else {
          transactionData = { sprout_id: '' }
        }
        
        const syntheticTransaction: SeedTransaction = {
          id: message.id,
          seed_id: '',
          transaction_type: transactionType,
          transaction_data: transactionData,
          created_at: typeof message.time === 'string' ? message.time : message.time.toISOString(),
          automation_id: null,
        }
        return getTransactionColor(syntheticTransaction)
      }
    }
    
    // Check if it's a transaction
    const transaction = transactions.find(t => t.id === message.id)
    if (transaction) {
      return getTransactionColor(transaction)
    }
    
    // Check if it's a sprout
    const sprout = sprouts.find(s => s.id === message.id)
    if (sprout) {
      switch (sprout.sprout_type) {
        case 'followup':
          return 'var(--accent-blue)'
        case 'musing':
          return 'var(--accent-yellow)'
        case 'extra_context':
          return 'var(--accent-purple)'
        case 'fact_check':
          return 'var(--accent-orange)'
        default:
          return 'var(--text-secondary)'
      }
    }
    
    return 'var(--text-secondary)'
  }

  const handleContentChange = (content: string) => {
    setEditedContent(content)
  }

  const handleTagRemove = (tagId: string) => {
    if (editedTags) {
      setEditedTags(editedTags.filter(tag => tag.id !== tagId))
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Edited state will be cleared by useEffect
  }

  const handleSave = async () => {
    if (!seedId || !currentState || !seed) return

    try {
      setError(null)
      const transactionsToCreate: Array<{
        transaction_type: SeedTransactionType
        transaction_data: any
      }> = []

      // Check for content changes
      const originalContent = currentState.seed
      const newContent = editedContent !== null ? editedContent : originalContent
      if (newContent !== originalContent) {
        transactionsToCreate.push({
          transaction_type: 'edit_content',
          transaction_data: {
            content: newContent,
          },
        })
      }

      // Check for tag removals
      const originalTagIds = new Set((currentState.tags || []).map(t => t.id))
      const editedTagIds = new Set((editedTags || currentState.tags || []).map(t => t.id))
      
      // Find removed tags
      const removedTagIds = Array.from(originalTagIds).filter(id => !editedTagIds.has(id))
      
      // Group tag removals by time (all removals in the same save get the same timestamp)
      if (removedTagIds.length > 0) {
        // Create one transaction per removed tag, but they'll be grouped by timestamp
        for (const tagId of removedTagIds) {
          const tag = (currentState.tags || []).find(t => t.id === tagId)
          if (tag) {
            transactionsToCreate.push({
              transaction_type: 'remove_tag',
              transaction_data: {
                tag_id: tagId,
                tag_name: tag.name, // Include tag name for display in timeline
              },
            })
          }
        }
      }

      // Create all transactions
      if (transactionsToCreate.length > 0) {
        // Create transactions sequentially to ensure proper ordering
        for (const transaction of transactionsToCreate) {
          await api.createSeedTransaction(seedId, transaction)
        }

        // Reload seed data to reflect changes
        await loadSeedData()
      }

      setIsEditing(false)
    } catch (err) {
      logSeedDetail.error('Error saving seed changes', { seedId, error: err })
      const errorMessage = err instanceof Error 
        ? err.message 
        : axios.isAxiosError(err) && err.response?.data?.error
          ? err.response.data.error
          : 'Failed to save changes'
      setError(errorMessage)
    }
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
        {!isEditing && (
          <Button
            variant="primary"
            onClick={() => setIsEditing(true)}
            aria-label="Edit seed"
          >
            Edit
          </Button>
        )}
      </div>

      <div className="seed-detail-content">
        {/* Left Column: SeedView + Timeline */}
        <div className="seed-detail-left-column">
          {/* Current State Display */}
          <Panel variant="elevated" className="seed-detail-state">
            {currentState && seed && (
              <SeedView
                seed={{
                  ...seed,
                  currentState,
                }}
                tagColors={(() => {
                  // Create tag color map: tag name (lowercase) -> color
                  const tagColorMap = new Map<string, string>()
                  tags.forEach(tag => {
                    if (tag.color) {
                      tagColorMap.set(tag.name.toLowerCase(), tag.color)
                    }
                  })
                  return tagColorMap
                })()}
                onTagClick={(tagId, tagName) => {
                  if (!isEditing) {
                    navigate(`/tags/${encodeURIComponent(tagName)}`)
                  }
                }}
                isEditing={isEditing}
                onContentChange={handleContentChange}
                onTagRemove={handleTagRemove}
                {...(editedContent !== null && { editedContent })}
                {...(editedTags !== null && { editedTags })}
              />
            )}
          </Panel>

          {/* Save/Cancel buttons in edit mode */}
          {isEditing && currentState && seed && (
            <div className="seed-edit-actions">
              <Button
                variant="primary"
                onClick={handleSave}
              >
                Save
              </Button>
              <Button
                variant="secondary"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            </div>
          )}

          {/* Timeline of Transactions and Sprouts */}
          <Panel variant="elevated" className="seed-detail-timeline">
            <h3 className="panel-header">Timeline</h3>
            <SeedTimeline transactions={transactions} sprouts={sprouts} getColor={getColor} />
          </Panel>
        </div>

        {/* Right Column: Automations */}
        <div className="seed-detail-right-column">

          {/* Automations Section */}
          <Panel variant="elevated" className="seed-detail-automations">
            <h3 className="panel-header">Run Automations</h3>
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
          </Panel>
        </div>
      </div>
    </div>
  )
}
