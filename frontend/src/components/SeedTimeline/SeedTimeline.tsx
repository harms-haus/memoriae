import { useMemo, useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../../services/api'
import type { SeedTransaction, Sprout, WikipediaSproutState, Tag } from '../../types'
import type { TransactionHistoryMessage } from '../TransactionHistoryList'
import { computeSeedStateAtTime } from '../../utils/seed-state'
import './SeedTimeline.css'
import '../TransactionHistoryList/TransactionHistoryList.css'

// Extended message type with transaction details for grouping
interface ExtendedMessage extends TransactionHistoryMessage {
  transactionType?: string
  transactionData?: any
  automationId?: string | null
  articleUrl?: string // For Wikipedia sprouts
  tagInfo?: Array<{ name: string; color: string | null }> // For grouped tag messages
  remainingTagCount?: number // For "and X more" text
  isAutomated?: boolean // For automated indicator
}

const formatRelativeTime = (date: string | Date): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - dateObj.getTime()
  
  // Check if it's today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const messageDate = new Date(dateObj)
  messageDate.setHours(0, 0, 0, 0)
  const isToday = messageDate.getTime() === today.getTime()
  
  if (!isToday) {
    // Not today - show date
    return dateObj.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }
  
  // Today - show relative time
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return dateObj.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}

interface SeedTimelineProps {
  transactions: SeedTransaction[]
  sprouts: Sprout[]
  tags?: Tag[]
  getColor: (message: TransactionHistoryMessage) => string
}

export function SeedTimeline({ transactions, sprouts, tags = [], getColor }: SeedTimelineProps) {
  const navigate = useNavigate()
  const [wikipediaStates, setWikipediaStates] = useState<Map<string, WikipediaSproutState>>(new Map())

  // Fetch computed state for Wikipedia sprouts
  useEffect(() => {
    const wikipediaSprouts = sprouts.filter(s => s.sprout_type === 'wikipedia_reference')
    if (wikipediaSprouts.length === 0) return

    const fetchStates = async () => {
      const states = new Map<string, WikipediaSproutState>()
      await Promise.all(
        wikipediaSprouts.map(async (sprout) => {
          try {
            const state = await api.getWikipediaSproutState(sprout.id)
            states.set(sprout.id, state)
          } catch (error) {
            // If fetching fails, we'll fall back to sprout_data
            console.warn(`Failed to fetch Wikipedia state for sprout ${sprout.id}:`, error)
          }
        })
      )
      setWikipediaStates(states)
    }

    fetchStates()
  }, [sprouts])

  // Combine transactions and sprouts into a unified timeline
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string
      type: 'transaction' | 'sprout'
      time: Date
      transaction?: SeedTransaction
      sprout?: Sprout
    }> = []

    // Add transactions (exclude add_sprout since sprouts are displayed separately)
    transactions.forEach((transaction) => {
      // Skip add_sprout transactions - the sprout itself will be displayed
      if (transaction.transaction_type === 'add_sprout') {
        return
      }
      items.push({
        id: transaction.id,
        type: 'transaction',
        time: new Date(transaction.created_at),
        transaction,
      })
    })

    // Add sprouts
    sprouts.forEach((sprout) => {
      items.push({
        id: sprout.id,
        type: 'sprout',
        time: new Date(sprout.created_at),
        sprout,
      })
    })

    // Sort by time (newest first for timeline display)
    items.sort((a, b) => b.time.getTime() - a.time.getTime())

    return items
  }, [transactions, sprouts])

  // Convert to TransactionHistoryMessage format for display
  const rawMessages: ExtendedMessage[] = useMemo(() => {
    return timelineItems.map((item) => {
      if (item.type === 'transaction' && item.transaction) {
        const transaction = item.transaction
        
        let title = ''
        let content = ''

        switch (transaction.transaction_type) {
          case 'create_seed':
            title = 'Seed Created'
            const createData = transaction.transaction_data as { content: string }
            content = createData.content
              ? `Content: ${createData.content.substring(0, 100)}${createData.content.length > 100 ? '...' : ''}`
              : 'Seed created'
            break
          case 'edit_content':
            title = 'Content Edited'
            content = 'Content updated'
            break
          case 'add_tag':
            title = 'Tag Added'
            // Use tag name from transaction data (historical value at that moment)
            const tagData = transaction.transaction_data as { tag_id: string; tag_name: string }
            content = `Tag: ${tagData.tag_name}`
            break
          case 'remove_tag':
            title = 'Tag Removed'
            // Use tag name from transaction data if available, otherwise from state before removal
            const removeTagData = transaction.transaction_data as { tag_id: string; tag_name?: string }
            if (removeTagData.tag_name) {
              // Historical tag name from transaction data
              content = `Tag: ${removeTagData.tag_name}`
            } else {
              // Try to find tag name from state before removal
              const creationTransaction = transactions.find(t => t.transaction_type === 'create_seed')
              const transactionsBefore = transactions.filter(
                t => new Date(t.created_at).getTime() < new Date(transaction.created_at).getTime()
              )
              // Ensure creation transaction is included (required by computeSeedStateAtTime)
              if (creationTransaction && !transactionsBefore.find(t => t.id === creationTransaction.id)) {
                transactionsBefore.push(creationTransaction)
              }
              // Only compute state if we have a creation transaction
              if (creationTransaction) {
                const stateBefore = computeSeedStateAtTime(transactionsBefore)
                const removedTag = stateBefore.tags?.find(t => t.id === removeTagData.tag_id)
                content = removedTag ? `Tag: ${removedTag.name}` : 'Tag removed'
              } else {
                content = 'Tag removed'
              }
            }
            break
          case 'set_category':
            title = 'Category Set'
            // Use category name/path from transaction data (historical value at that moment)
            const categoryData = transaction.transaction_data as { 
              category_id: string
              category_name: string
              category_path: string
            }
            content = categoryData.category_path
              ? `Category: ${categoryData.category_name} (${categoryData.category_path})`
              : `Category: ${categoryData.category_name}`
            break
          case 'remove_category':
            title = 'Category Removed'
            // Get category name from state before removal (historical value)
            const removeCategoryData = transaction.transaction_data as { category_id: string }
            const creationTransactionForCategory = transactions.find(t => t.transaction_type === 'create_seed')
            const transactionsBeforeCategory = transactions.filter(
              t => new Date(t.created_at).getTime() < new Date(transaction.created_at).getTime()
            )
            // Ensure creation transaction is included (required by computeSeedStateAtTime)
            if (creationTransactionForCategory && !transactionsBeforeCategory.find(t => t.id === creationTransactionForCategory.id)) {
              transactionsBeforeCategory.push(creationTransactionForCategory)
            }
            // Only compute state if we have a creation transaction
            if (creationTransactionForCategory) {
              const stateBeforeCategory = computeSeedStateAtTime(transactionsBeforeCategory)
              const removedCategory = stateBeforeCategory.categories?.find(c => c.id === removeCategoryData.category_id)
              content = removedCategory 
                ? `Category: ${removedCategory.name} (${removedCategory.path})`
                : 'Category removed'
            } else {
              content = 'Category removed'
            }
            break
          case 'add_followup':
            title = 'Follow-up Added'
            content = 'Follow-up added'
            break
          case 'add_sprout':
            title = 'Sprout Added'
            content = 'Sprout added'
            break
          default:
            title = transaction.transaction_type
            content = 'Transaction'
        }

        if (transaction.automation_id) {
          content += ' • (automated)'
        }

        return {
          id: transaction.id,
          title,
          content,
          time: transaction.created_at,
          groupKey: transaction.transaction_type,
          transactionType: transaction.transaction_type,
          transactionData: transaction.transaction_data,
          automationId: transaction.automation_id,
        }
      } else if (item.type === 'sprout' && item.sprout) {
        const sprout = item.sprout
        let title = ''
        let content = ''

        switch (sprout.sprout_type) {
          case 'followup':
            // Followup sprouts show HISTORICAL data (from sprout_data at creation time)
            // This shows what the sprout was when it was created, not current state
            title = 'Follow-up Sprout'
            const followupData = sprout.sprout_data as { initial_message: string }
            content = followupData.initial_message || 'Follow-up sprout'
            break
          case 'musing':
            // Musing sprouts show HISTORICAL data (from sprout_data at creation time)
            title = 'Musing Sprout'
            const musingData = sprout.sprout_data as { template_type: string }
            content = `Musing (${musingData.template_type})`
            break
          case 'wikipedia_reference':
            // Wikipedia sprouts show CURRENT state (computed from all transactions)
            // This is because Wikipedia sprouts can have edit transactions that modify the summary
            // and we want to show the latest value, not the historical value at creation
            const computedState = wikipediaStates.get(sprout.id)
            const wikipediaData = computedState 
              ? {
                  reference: computedState.reference,
                  summary: computedState.summary,
                  article_url: computedState.article_url,
                }
              : (sprout.sprout_data as { reference: string; summary: string; article_url: string })
            title = wikipediaData.reference || 'Wikipedia Reference'
            // Truncate summary to first 3 paragraphs (lines separated by \n\n)
            const fullSummary = wikipediaData.summary || ''
            const paragraphs = fullSummary.split('\n\n')
            if (paragraphs.length > 3) {
              content = paragraphs.slice(0, 3).join('\n\n')
            } else {
              content = fullSummary
            }
            // Store article URL for link rendering
            return {
              id: sprout.id,
              title,
              content,
              time: sprout.created_at,
              groupKey: `sprout-${sprout.sprout_type}`,
              articleUrl: wikipediaData.article_url,
            }
          case 'extra_context':
            title = 'Extra Context Sprout'
            content = 'Extra context sprout'
            break
          case 'fact_check':
            title = 'Fact Check Sprout'
            content = 'Fact check sprout'
            break
          default:
            title = 'Sprout'
            content = 'Sprout'
        }

        if (sprout.automation_id) {
          content += ' • (automated)'
        }

        return {
          id: sprout.id,
          title,
          content,
          time: sprout.created_at,
          groupKey: `sprout-${sprout.sprout_type}`,
        }
      }

      // Fallback
      return {
        id: item.id,
        title: 'Unknown',
        content: 'Unknown item',
        time: item.time.toISOString(),
      }
    })
  }, [timelineItems, wikipediaStates, transactions])

  // Group consecutive tag additions that are within time threshold and not interrupted
  const messages: ExtendedMessage[] = useMemo(() => {
    if (rawMessages.length === 0) return []

    const GROUP_THRESHOLD_MS = 60000 // 1 minute - tags added within this time are grouped
    const grouped: ExtendedMessage[] = []
    let currentTagGroup: ExtendedMessage[] = []

    for (let i = 0; i < rawMessages.length; i++) {
      const message = rawMessages[i]!
      const messageTime = typeof message.time === 'string' ? new Date(message.time).getTime() : message.time.getTime()
      const isTagAdded = message.transactionType === 'add_tag'

      if (isTagAdded) {
        // Check if we should add to current group
        if (currentTagGroup.length === 0) {
          // Start new group
          currentTagGroup = [message]
        } else {
          // Compare with the last message in the group (messages are sorted newest first)
          const lastMessage = currentTagGroup[currentTagGroup.length - 1]!
          const lastMessageTime = typeof lastMessage.time === 'string' ? new Date(lastMessage.time).getTime() : lastMessage.time.getTime()
          const timeDiff = Math.abs(messageTime - lastMessageTime)
          
          if (timeDiff <= GROUP_THRESHOLD_MS) {
            // Within time threshold, add to group
            currentTagGroup.push(message)
          } else {
            // Time threshold exceeded, finalize current group and start new one
            if (currentTagGroup.length > 1) {
              // Create grouped message
              const tagNames: string[] = []
              let hasAutomated = false
              
              currentTagGroup.forEach(msg => {
                const tagData = msg.transactionData as { tag_name: string } | undefined
                if (tagData?.tag_name) {
                  tagNames.push(tagData.tag_name)
                }
                if (msg.automationId) {
                  hasAutomated = true
                }
              })

              // Remove duplicates and limit to 10 for display
              const uniqueTagNames = Array.from(new Set(tagNames))
              const displayTags = uniqueTagNames.slice(0, 10)
              const remainingCount = uniqueTagNames.length - displayTags.length

              // Get tag info (name and color) for each tag
              // Use tag names from transaction data (historical values) but current colors
              // (we don't store historical tag colors, so use current as best approximation)
              const tagInfo: Array<{ name: string; color: string | null }> = displayTags.map(tagName => {
                const tag = tags.find(t => t.name === tagName)
                return {
                  name: tagName, // Historical name from transaction data
                  color: tag?.color || null, // Current color (best approximation)
                }
              })

              let groupedContent = `Tags: ${displayTags.join(', ')}`
              if (remainingCount > 0) {
                groupedContent += `, and ${remainingCount} more`
              }
              if (hasAutomated) {
                groupedContent += ' • (automated)'
              }

              const groupedMessage: ExtendedMessage = {
                id: `group-${currentTagGroup[0]!.id}`,
                title: 'Tags Added',
                content: groupedContent,
                time: currentTagGroup[0]!.time, // Use newest (first) message time since sorted newest-first
                groupKey: 'add_tag', // Use same groupKey as individual tag additions for color matching
                tagInfo, // Store tag info for rendering links
                isAutomated: hasAutomated,
              }
              if (remainingCount > 0) {
                groupedMessage.remainingTagCount = remainingCount
              }
              grouped.push(groupedMessage)
            } else {
              // Single message, add as-is
              grouped.push(currentTagGroup[0]!)
            }

            // Start new group
            currentTagGroup = [message]
          }
        }
      } else {
        // Not a tag addition - finalize current group if exists, then add this message
        if (currentTagGroup.length > 0) {
          if (currentTagGroup.length > 1) {
            // Create grouped message
            const tagNames: string[] = []
            let hasAutomated = false
            
            currentTagGroup.forEach(msg => {
              const tagData = msg.transactionData as { tag_name: string } | undefined
              if (tagData?.tag_name) {
                tagNames.push(tagData.tag_name)
              }
              if (msg.automationId) {
                hasAutomated = true
              }
            })

            // Remove duplicates and limit to 10 for display
            const uniqueTagNames = Array.from(new Set(tagNames))
            const displayTags = uniqueTagNames.slice(0, 10)
            const remainingCount = uniqueTagNames.length - displayTags.length

            // Get tag info (name and color) for each tag
            const tagInfo: Array<{ name: string; color: string | null }> = displayTags.map(tagName => {
              const tag = tags.find(t => t.name === tagName)
              return {
                name: tagName,
                color: tag?.color || null,
              }
            })

            let groupedContent = `Tags: ${displayTags.join(', ')}`
            if (remainingCount > 0) {
              groupedContent += `, and ${remainingCount} more`
            }
            if (hasAutomated) {
              groupedContent += ' • (automated)'
            }

            const groupedMessage: ExtendedMessage = {
              id: `group-${currentTagGroup[0]!.id}`,
              title: 'Tags Added',
              content: groupedContent,
              time: currentTagGroup[currentTagGroup.length - 1]!.time, // Use newest (last) message time
              groupKey: 'add_tag', // Use same groupKey as individual tag additions for color matching
              tagInfo, // Store tag info for rendering links
              isAutomated: hasAutomated,
            }
            if (remainingCount > 0) {
              groupedMessage.remainingTagCount = remainingCount
            }
            grouped.push(groupedMessage)
          } else {
            // Single message, add as-is
            grouped.push(currentTagGroup[0]!)
          }
          currentTagGroup = []
        }
        // Add the non-tag message
        grouped.push(message)
      }
    }

    // Don't forget the last group
    if (currentTagGroup.length > 0) {
      if (currentTagGroup.length > 1) {
        // Create grouped message
        const tagNames: string[] = []
        let hasAutomated = false
        
        currentTagGroup.forEach(msg => {
          const tagData = msg.transactionData as { tag_name: string } | undefined
          if (tagData?.tag_name) {
            tagNames.push(tagData.tag_name)
          }
          if (msg.automationId) {
            hasAutomated = true
          }
        })

        // Remove duplicates and limit to 10 for display
        const uniqueTagNames = Array.from(new Set(tagNames))
        const displayTags = uniqueTagNames.slice(0, 10)
        const remainingCount = uniqueTagNames.length - displayTags.length

        // Get tag info (name and color) for each tag
        const tagInfo: Array<{ name: string; color: string | null }> = displayTags.map(tagName => {
          const tag = tags.find(t => t.name === tagName)
          return {
            name: tagName,
            color: tag?.color || null,
          }
        })

        let groupedContent = `Tags: ${displayTags.join(', ')}`
        if (remainingCount > 0) {
          groupedContent += `, and ${remainingCount} more`
        }
        if (hasAutomated) {
          groupedContent += ' • (automated)'
        }

        const groupedMessage: ExtendedMessage = {
          id: `group-${currentTagGroup[0]!.id}`,
          title: 'Tags Added',
          content: groupedContent,
          time: currentTagGroup[currentTagGroup.length - 1]!.time, // Use newest (last) message time
          groupKey: 'add_tag', // Use same groupKey as individual tag additions for color matching
          tagInfo, // Store tag info for rendering links
          isAutomated: hasAutomated,
        }
        if (remainingCount > 0) {
          groupedMessage.remainingTagCount = remainingCount
        }
        grouped.push(groupedMessage)
      } else {
        // Single message, add as-is
        grouped.push(currentTagGroup[0]!)
      }
    }

    return grouped
  }, [rawMessages, tags])

  // Create a map to track which messages are sprouts
  const sproutMessageIds = useMemo(() => {
    return new Set(sprouts.map(s => s.id))
  }, [sprouts])

  return (
    <div className="seed-timeline">
      <div className="transaction-history-list">
        {messages.map((message, index) => {
          const isSprout = sproutMessageIds.has(message.id)
          const color = getColor(message)
          
          return (
            <div
              key={message.id}
              className={`transaction-history-item ${isSprout ? 'sprout-item' : ''}`}
              style={{
                borderLeftColor: color,
                cursor: isSprout ? 'pointer' : 'default',
              }}
              onClick={() => {
                if (isSprout) {
                  navigate(`/sprouts/${message.id}`)
                }
              }}
            >
              <div className="transaction-history-header">
                {message.articleUrl ? (
                  <a
                    href={message.articleUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="transaction-history-title"
                    style={{
                      color: color,
                      textDecoration: 'underline',
                    }}
                    onClick={(e) => {
                      // Prevent navigation to sprout detail when clicking the link
                      e.stopPropagation()
                    }}
                  >
                    {message.title}
                  </a>
                ) : (
                  <span
                    className="transaction-history-title"
                    style={{
                      color: color,
                    }}
                  >
                    {message.title}
                  </span>
                )}
                <span className="transaction-history-time">
                  {formatRelativeTime(message.time)}
                </span>
              </div>
              <div className="transaction-history-content">
                {message.tagInfo ? (
                  <div>
                    <span>Tags: </span>
                    {message.tagInfo.map((tag, index) => (
                      <span key={tag.name}>
                        <Link
                          to={`/tags/${encodeURIComponent(tag.name)}`}
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            color: tag.color || 'var(--text-secondary)',
                            textDecoration: 'none',
                            transition: 'all 0.2s ease',
                            borderBottom: '1px solid transparent',
                          }}
                          onMouseEnter={(e) => {
                            if (tag.color) {
                              e.currentTarget.style.borderBottomColor = tag.color
                              e.currentTarget.style.opacity = '1'
                            } else {
                              e.currentTarget.style.borderBottomColor = 'var(--text-secondary)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderBottomColor = 'transparent'
                          }}
                        >
                          {tag.name}
                        </Link>
                        {index < message.tagInfo!.length - 1 && <span>, </span>}
                      </span>
                    ))}
                    {message.remainingTagCount !== undefined && (
                      <span>, and {message.remainingTagCount} more</span>
                    )}
                    {message.isAutomated && (
                      <span> • (automated)</span>
                    )}
                  </div>
                ) : (
                  message.content
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

