import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { SeedTransaction, Sprout } from '../../types'
import type { TransactionHistoryMessage } from '../TransactionHistoryList'
import './SeedTimeline.css'
import '../TransactionHistoryList/TransactionHistoryList.css'

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
  getColor: (message: TransactionHistoryMessage) => string
}

export function SeedTimeline({ transactions, sprouts, getColor }: SeedTimelineProps) {
  const navigate = useNavigate()

  // Combine transactions and sprouts into a unified timeline
  const timelineItems = useMemo(() => {
    const items: Array<{
      id: string
      type: 'transaction' | 'sprout'
      time: Date
      transaction?: SeedTransaction
      sprout?: Sprout
    }> = []

    // Add transactions
    transactions.forEach((transaction) => {
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

    // Sort by time (oldest first for timeline display, but we'll reverse for newest-first)
    items.sort((a, b) => a.time.getTime() - b.time.getTime())

    return items
  }, [transactions, sprouts])

  // Convert to TransactionHistoryMessage format for display
  const messages: TransactionHistoryMessage[] = useMemo(() => {
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
            const tagData = transaction.transaction_data as { tag_name: string }
            content = `Tag: ${tagData.tag_name}`
            break
          case 'remove_tag':
            title = 'Tag Removed'
            const removeTagData = transaction.transaction_data as { tag_name?: string }
            content = removeTagData.tag_name ? `Tag: ${removeTagData.tag_name}` : 'Tag removed'
            break
          case 'set_category':
            title = 'Category Set'
            const categoryData = transaction.transaction_data as { category_name: string; category_path?: string }
            content = categoryData.category_path
              ? `Category: ${categoryData.category_name} (${categoryData.category_path})`
              : `Category: ${categoryData.category_name}`
            break
          case 'remove_category':
            title = 'Category Removed'
            content = 'Category removed'
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
        }
      } else if (item.type === 'sprout' && item.sprout) {
        const sprout = item.sprout
        let title = ''
        let content = ''

        switch (sprout.sprout_type) {
          case 'followup':
            title = 'Follow-up Sprout'
            const followupData = sprout.sprout_data as { initial_message: string }
            content = followupData.initial_message || 'Follow-up sprout'
            break
          case 'musing':
            title = 'Musing Sprout'
            const musingData = sprout.sprout_data as { template_type: string }
            content = `Musing (${musingData.template_type})`
            break
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
  }, [timelineItems])

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
                <span
                  className="transaction-history-title"
                  style={{
                    color: color,
                  }}
                >
                  {message.title}
                </span>
                <span className="transaction-history-time">
                  {formatRelativeTime(message.time)}
                </span>
              </div>
              <div className="transaction-history-content">
                {message.content}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

