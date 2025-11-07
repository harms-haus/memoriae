import { useMemo } from 'react'
import type { FollowupTransaction } from '../../types'
import { TransactionHistoryList, type TransactionHistoryMessage } from '../TransactionHistoryList'
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

  const messages: TransactionHistoryMessage[] = useMemo(() => {
    return transactions.map((transaction) => ({
      id: transaction.id,
      title: getTransactionTypeLabel(transaction.transaction_type),
      content: renderTransactionData(transaction),
      time: transaction.created_at,
    }))
  }, [transactions])

  const transactionTypeMap = useMemo(() => {
    const map = new Map<string, FollowupTransaction['transaction_type']>()
    transactions.forEach(t => map.set(t.id, t.transaction_type))
    return map
  }, [transactions])

  const getColor = (message: TransactionHistoryMessage): string => {
    const transactionType = transactionTypeMap.get(message.id)
    if (!transactionType) return 'var(--text-secondary)'
    return getTransactionTypeColor(transactionType)
  }

  return <TransactionHistoryList messages={messages} getColor={getColor} />
}

