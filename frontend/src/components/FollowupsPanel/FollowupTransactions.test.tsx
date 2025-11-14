// FollowupTransactions component tests
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { FollowupTransactions } from './FollowupTransactions'
import type { FollowupTransaction, CreationTransactionData, EditTransactionData, SnoozeTransactionData, DismissalTransactionData } from '../../types'

// Mock TransactionHistoryList
vi.mock('../TransactionHistoryList', () => ({
  TransactionHistoryList: ({ messages, getColor }: any) => (
    <div data-testid="transaction-history-list">
      {messages.map((msg: any) => (
        <div key={msg.id} data-color={getColor(msg)}>
          <strong>{msg.title}</strong>
          <p>{msg.content}</p>
          <time>{msg.time}</time>
        </div>
      ))}
    </div>
  ),
}))

const mockTransactions: FollowupTransaction[] = [
  {
    id: 'txn-1',
    followup_id: 'followup-1',
    transaction_type: 'creation' as const,
    transaction_data: {
      trigger: 'manual' as const,
      initial_time: '2024-01-02T12:00:00.000Z',
      initial_message: 'Test message',
    } as CreationTransactionData,
    created_at: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'txn-2',
    followup_id: 'followup-1',
    transaction_type: 'edit' as const,
    transaction_data: {
      old_time: '2024-01-02T12:00:00.000Z',
      new_time: '2024-01-03T12:00:00.000Z',
      old_message: 'Test message',
      new_message: 'Updated message',
    } as EditTransactionData,
    created_at: '2024-01-01T10:00:00.000Z',
  },
  {
    id: 'txn-3',
    followup_id: 'followup-1',
    transaction_type: 'snooze' as const,
    transaction_data: {
      snoozed_at: '2024-01-01T12:00:00.000Z',
      duration_minutes: 60,
      method: 'manual' as const,
    } as SnoozeTransactionData,
    created_at: '2024-01-01T12:00:00.000Z',
  },
  {
    id: 'txn-4',
    followup_id: 'followup-1',
    transaction_type: 'dismissal' as const,
    transaction_data: {
      dismissed_at: '2024-01-01T14:00:00.000Z',
      type: 'followup' as const,
    } as DismissalTransactionData,
    created_at: '2024-01-01T14:00:00.000Z',
  },
]

describe('FollowupTransactions Component', () => {
  describe('Rendering', () => {
    it('should render empty list when no transactions', () => {
      render(<FollowupTransactions transactions={[]} />)

      expect(screen.getByTestId('transaction-history-list')).toBeInTheDocument()
      expect(screen.queryByText('Created')).not.toBeInTheDocument()
    })

    it('should render all transactions', () => {
      render(<FollowupTransactions transactions={mockTransactions} />)

      expect(screen.getByText('Created')).toBeInTheDocument()
      expect(screen.getByText('Edited')).toBeInTheDocument()
      expect(screen.getByText('Snoozed')).toBeInTheDocument()
      expect(screen.getByText('Dismissed')).toBeInTheDocument()
    })
  })

  describe('Transaction Type Labels', () => {
    it('should label creation transactions correctly', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'creation' as const,
          transaction_data: {
            trigger: 'manual' as const,
            initial_time: '2024-01-02T12:00:00.000Z',
            initial_message: 'Test message',
          } as CreationTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText('Created')).toBeInTheDocument()
    })

    it('should label edit transactions correctly', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'edit' as const,
          transaction_data: {
            old_time: '2024-01-02T12:00:00.000Z',
            new_time: '2024-01-03T12:00:00.000Z',
            new_message: 'Updated message',
          } as EditTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText('Edited')).toBeInTheDocument()
    })

    it('should label snooze transactions correctly', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'snooze' as const,
          transaction_data: {
            snoozed_at: '2024-01-01T12:00:00.000Z',
            duration_minutes: 60,
            method: 'manual' as const,
          },
          created_at: '2024-01-01T12:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText('Snoozed')).toBeInTheDocument()
    })

    it('should label dismissal transactions correctly', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'dismissal' as const,
          transaction_data: {
            dismissed_at: '2024-01-01T14:00:00.000Z',
            type: 'followup' as const,
          } as DismissalTransactionData,
          created_at: '2024-01-01T14:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText('Dismissed')).toBeInTheDocument()
    })
  })

  describe('Transaction Data Rendering', () => {
    it('should render creation transaction data', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'creation' as const,
          transaction_data: {
            trigger: 'manual' as const,
            initial_time: '2024-01-02T12:00:00.000Z',
            initial_message: 'Test message',
          } as CreationTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Trigger: Manual/)).toBeInTheDocument()
    })

    it('should render edit transaction data with time change', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'edit' as const,
          transaction_data: {
            old_time: '2024-01-02T12:00:00.000Z',
            new_time: '2024-01-03T12:00:00.000Z',
            old_message: 'Original message',
            new_message: 'Updated message',
          } as EditTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Time:/)).toBeInTheDocument()
      expect(screen.getByText(/Message changed/)).toBeInTheDocument()
    })

    it('should render edit transaction data with only message change', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'edit' as const,
          transaction_data: {
            new_time: '2024-01-03T12:00:00.000Z',
            old_message: 'Old message',
            new_message: 'New message',
          } as EditTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Message changed/)).toBeInTheDocument()
    })

    it('should render snooze transaction data', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'snooze' as const,
          transaction_data: {
            snoozed_at: '2024-01-01T12:00:00.000Z',
            duration_minutes: 90,
            method: 'manual' as const,
          } as SnoozeTransactionData,
          created_at: '2024-01-01T12:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Snoozed by 1h 30m/)).toBeInTheDocument()
      expect(screen.getByText(/Manual/)).toBeInTheDocument()
    })

    it('should render snooze transaction with hours only', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'snooze' as const,
          transaction_data: {
            snoozed_at: '2024-01-01T12:00:00.000Z',
            duration_minutes: 120,
            method: 'manual' as const,
          } as SnoozeTransactionData,
          created_at: '2024-01-01T12:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Snoozed by 2h/)).toBeInTheDocument()
    })

    it('should render snooze transaction with minutes only', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'snooze' as const,
          transaction_data: {
            snoozed_at: '2024-01-01T12:00:00.000Z',
            duration_minutes: 30,
            method: 'manual' as const,
          } as SnoozeTransactionData,
          created_at: '2024-01-01T12:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Snoozed by 30m/)).toBeInTheDocument()
    })

    it('should render dismissal transaction data', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'dismissal' as const,
          transaction_data: {
            dismissed_at: '2024-01-01T14:00:00.000Z',
            type: 'followup' as const,
          } as DismissalTransactionData,
          created_at: '2024-01-01T14:00:00.000Z',
        },
      ]

      render(<FollowupTransactions transactions={transactions} />)

      expect(screen.getByText(/Dismissed \(Follow-up\)/)).toBeInTheDocument()
    })
  })

  describe('Transaction Colors', () => {
    it('should apply correct color for creation', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'creation' as const,
          transaction_data: {
            trigger: 'manual' as const,
            initial_time: '2024-01-02T12:00:00.000Z',
            initial_message: 'Test message',
          } as CreationTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const { container } = render(<FollowupTransactions transactions={transactions} />)

      const message = container.querySelector('[data-color]')
      expect(message?.getAttribute('data-color')).toBe('var(--accent-green)')
    })

    it('should apply correct color for edit', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'edit',
          transaction_data: {
            new_time: '2024-01-03T12:00:00.000Z',
            new_message: 'Updated message',
          } as EditTransactionData,
          created_at: '2024-01-01T00:00:00.000Z',
        },
      ]

      const { container } = render(<FollowupTransactions transactions={transactions} />)

      const message = container.querySelector('[data-color]')
      expect(message?.getAttribute('data-color')).toBe('var(--accent-blue)')
    })

    it('should apply correct color for snooze', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'snooze' as const,
          transaction_data: {
            snoozed_at: '2024-01-01T12:00:00.000Z',
            duration_minutes: 60,
            method: 'manual' as const,
          },
          created_at: '2024-01-01T12:00:00.000Z',
        },
      ]

      const { container } = render(<FollowupTransactions transactions={transactions} />)

      const message = container.querySelector('[data-color]')
      expect(message?.getAttribute('data-color')).toBe('var(--accent-yellow)')
    })

    it('should apply correct color for dismissal', () => {
      const transactions: FollowupTransaction[] = [
        {
          id: 'txn-1',
          followup_id: 'followup-1',
          transaction_type: 'dismissal' as const,
          transaction_data: {
            dismissed_at: '2024-01-01T14:00:00.000Z',
            type: 'followup' as const,
          } as DismissalTransactionData,
          created_at: '2024-01-01T14:00:00.000Z',
        },
      ]

      const { container } = render(<FollowupTransactions transactions={transactions} />)

      const message = container.querySelector('[data-color]')
      expect(message?.getAttribute('data-color')).toBe('var(--accent-pink)')
    })
  })
})

