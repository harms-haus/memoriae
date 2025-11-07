import type { FollowupTransaction } from '../../types'
import './FollowupTransactions.css'

interface FollowupTransactionsProps {
  transactions: FollowupTransaction[]
}

export function FollowupTransactions({ transactions }: FollowupTransactionsProps) {
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getTransactionTypeColor = (type: FollowupTransaction['transaction_type']): string => {
    switch (type) {
      case 'creation':
        return 'var(--accent-green)'
      case 'edit':
        return 'var(--accent-blue)'
      case 'snooze':
        return 'var(--accent-yellow)'
      case 'dismissal':
        return 'var(--accent-pink)'
      default:
        return 'var(--text-secondary)'
    }
  }

  const getTransactionTypeLabel = (type: FollowupTransaction['transaction_type']): string => {
    switch (type) {
      case 'creation':
        return 'Created'
      case 'edit':
        return 'Edited'
      case 'snooze':
        return 'Snoozed'
      case 'dismissal':
        return 'Dismissed'
      default:
        return type
    }
  }

  const renderTransactionData = (transaction: FollowupTransaction): string => {
    const { transaction_type, transaction_data } = transaction

    switch (transaction_type) {
      case 'creation': {
        const data = transaction_data as any
        return `Trigger: ${data.trigger === 'manual' ? 'Manual' : 'Automatic'}`
      }
      case 'edit': {
        const data = transaction_data as any
        const parts: string[] = []
        if (data.old_time && data.new_time) {
          parts.push(`Time: ${formatDate(data.old_time)} → ${formatDate(data.new_time)}`)
        }
        if (data.old_message && data.new_message) {
          parts.push(`Message changed`)
        }
        return parts.join(', ') || 'Updated'
      }
      case 'snooze': {
        const data = transaction_data as any
        const hours = Math.floor(data.duration_minutes / 60)
        const minutes = data.duration_minutes % 60
        const duration = hours > 0 
          ? `${hours}h ${minutes > 0 ? `${minutes}m` : ''}`.trim()
          : `${minutes}m`
        return `Snoozed by ${duration} (${data.method === 'manual' ? 'Manual' : 'Automatic'})`
      }
      case 'dismissal': {
        const data = transaction_data as any
        return `Dismissed (${data.type === 'followup' ? 'Follow-up' : 'Snooze'})`
      }
      default:
        return ''
    }
  }

  if (transactions.length === 0) {
    return <p className="text-secondary">No transactions yet.</p>
  }

  // Sort transactions chronologically (oldest first)
  const sortedTransactions = [...transactions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="followup-transactions">
      {sortedTransactions.map((transaction) => (
        <div
          key={transaction.id}
          className="followup-transaction"
          style={{
            borderLeftColor: getTransactionTypeColor(transaction.transaction_type),
          }}
        >
          <div className="followup-transaction-header">
            <span
              className="followup-transaction-type"
              style={{
                color: getTransactionTypeColor(transaction.transaction_type),
              }}
            >
              {getTransactionTypeLabel(transaction.transaction_type)}
            </span>
            <span className="followup-transaction-time">
              {formatDate(transaction.created_at)}
            </span>
          </div>
          <div className="followup-transaction-data">
            {renderTransactionData(transaction)}
          </div>
        </div>
      ))}
    </div>
  )
}

