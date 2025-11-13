import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import { SeedView } from '../SeedView'
import { FollowupsPanel } from '../FollowupsPanel'
import { TransactionHistoryList, type TransactionHistoryMessage } from '../TransactionHistoryList'
import type { SeedTransaction, SeedTransactionType, Seed, SeedState, Tag as TagType } from '../../types'
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

// Helper functions for formatting transactions
const formatTransactionTitle = (transaction: SeedTransaction): string => {
  switch (transaction.transaction_type) {
    case 'create_seed':
      return 'Seed Created'
    case 'edit_content':
      return 'Content Edited'
    case 'add_tag':
      return 'Tag Added'
    case 'remove_tag':
      return 'Tag Removed'
    case 'set_category':
      return 'Category Set'
    case 'remove_category':
      return 'Category Removed'
    case 'add_followup':
      return 'Follow-up Added'
    default:
      return transaction.transaction_type
  }
}

const formatTransactionContent = (transaction: SeedTransaction): string => {
  const parts: string[] = []
  
  switch (transaction.transaction_type) {
    case 'create_seed': {
      const data = transaction.transaction_data
      if ('content' in data && data.content) {
        parts.push(`Content: ${data.content.substring(0, 100)}${data.content.length > 100 ? '...' : ''}`)
      }
      break
    }
    case 'edit_content': {
      const data = transaction.transaction_data
      if ('content' in data && data.content) {
        parts.push(`Content updated`)
      }
      break
    }
    case 'add_tag': {
      const data = transaction.transaction_data
      if ('tag_name' in data) {
        parts.push(`Tag: ${data.tag_name}`)
      }
      break
    }
    case 'remove_tag': {
      const data = transaction.transaction_data
      if ('tag_id' in data) {
        parts.push(`Tag removed`)
      }
      break
    }
    case 'set_category': {
      const data = transaction.transaction_data
      if ('category_name' in data) {
        parts.push(`Category: ${data.category_name}`)
        if ('category_path' in data && data.category_path) {
          parts.push(`Path: ${data.category_path}`)
        }
      }
      break
    }
    case 'remove_category': {
      parts.push(`Category removed`)
      break
    }
    case 'add_followup': {
      parts.push(`Follow-up added`)
      break
    }
  }

  if (transaction.automation_id) {
    parts.push('(Automated)')
  }

  return parts.join(' • ') || 'Transaction'
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
    default:
      return 'var(--text-secondary)'
  }
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

      // Load seed, timeline transactions, current state, and tags in parallel
      const [seedData, transactionsData, stateData, tagsData] = await Promise.all([
        api.get<Seed>(apiPath),
        api.getSeedTransactions(seedId),
        api.get<SeedStateResponse>(`${apiPath}/state`),
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
      // Format seedId for API calls
      const apiPath = getApiPath(seedId)
      const automationsData = await api.get<Automation[]>(`${apiPath}/automations`)
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

      // Format seedId for API calls
      const apiPath = getApiPath(seedId)
      const response = await api.post<{ message: string; jobId: string; automation: { id: string; name: string } }>(
        `${apiPath}/automations/${automationId}/run`
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
          const apiPath = getApiPath(seedId)
          const [seedData, transactionsData, stateData] = await Promise.all([
            api.get<Seed>(apiPath),
            api.getSeedTransactions(seedId),
            api.get<SeedStateResponse>(`${apiPath}/state`),
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

  // Transform transactions into TransactionHistoryMessage format
  const transactionMessages: TransactionHistoryMessage[] = useMemo(() => {
    return transactions.map((transaction) => ({
      id: transaction.id,
      title: formatTransactionTitle(transaction),
      content: formatTransactionContent(transaction),
      time: transaction.created_at,
      groupKey: transaction.transaction_type, // Use transaction type as group key
    }))
  }, [transactions])

  const transactionTypeMap = useMemo(() => {
    const map = new Map<string, SeedTransaction>()
    transactions.forEach(t => map.set(t.id, t))
    return map
  }, [transactions])

  const getColor = (message: TransactionHistoryMessage): string => {
    const transaction = transactionTypeMap.get(message.id)
    if (!transaction) return 'var(--text-secondary)'
    return getTransactionColor(transaction)
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
      console.error('Error saving seed changes:', err)
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

          {/* Timeline of Transactions */}
          <Panel variant="elevated" className="seed-detail-timeline">
            <h3 className="panel-header">Timeline</h3>
            <TransactionHistoryList messages={transactionMessages} getColor={getColor} />
          </Panel>
        </div>

        {/* Right Column: Followups + Automations */}
        <div className="seed-detail-right-column">
          {/* Follow-ups Panel */}
          <FollowupsPanel seedId={seedId} />

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
