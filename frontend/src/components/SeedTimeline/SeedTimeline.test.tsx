// SeedTimeline component unit tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SeedTimeline } from './SeedTimeline'
import type { SeedTransaction, Sprout } from '../../types'
import type { TransactionHistoryMessage } from '../TransactionHistoryList/TransactionHistoryList'

// Mock react-router-dom navigate
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('SeedTimeline Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  const getColor = (message: TransactionHistoryMessage): string => {
    if (message.groupKey === 'add_tag' || message.title === 'Tags Added') {
      return 'var(--accent-purple)'
    }
    if (message.groupKey === 'create_seed') {
      return 'var(--accent-green)'
    }
    if (message.groupKey === 'sprout-followup') {
      return 'var(--accent-blue)'
    }
    if (message.groupKey === 'sprout-musing') {
      return 'var(--accent-yellow)'
    }
    return 'var(--text-secondary)'
  }

  describe('Empty Timeline', () => {
    it('should render empty timeline with no transactions or sprouts', () => {
      const { container } = render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      const timeline = container.querySelector('.seed-timeline')
      expect(timeline).toBeInTheDocument()
    })
  })

  describe('Transaction Rendering', () => {
    it('should render single transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Test content' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Seed Created')).toBeInTheDocument()
      expect(screen.getByText(/Content: Test content/)).toBeInTheDocument()
    })

    it('should render edit_content transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated content' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Content Edited')).toBeInTheDocument()
      expect(screen.getByText('Content updated')).toBeInTheDocument()
    })

    it('should render add_tag transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Tag Added')).toBeInTheDocument()
      expect(screen.getByText('Tag: work')).toBeInTheDocument()
    })

    it('should render remove_tag transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'remove_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Tag Removed')).toBeInTheDocument()
      expect(screen.getByText('Tag: work')).toBeInTheDocument()
    })

    it('should render remove_tag transaction without tag_name', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'remove_tag',
          transaction_data: { tag_id: 'tag-1' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Tag Removed')).toBeInTheDocument()
      expect(screen.getByText('Tag removed')).toBeInTheDocument()
    })

    it('should render set_category transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'set_category',
          transaction_data: { category_id: 'cat-1', category_name: 'Work', category_path: '/work' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Category Set')).toBeInTheDocument()
      expect(screen.getByText('Category: Work (/work)')).toBeInTheDocument()
    })

    it('should render set_category transaction without category_path', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'set_category',
          transaction_data: { category_id: 'cat-1', category_name: 'Work', category_path: '' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Category Set')).toBeInTheDocument()
      expect(screen.getByText('Category: Work')).toBeInTheDocument()
    })

    it('should render remove_category transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'remove_category',
          transaction_data: { category_id: 'cat-1' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Category Removed')).toBeInTheDocument()
      expect(screen.getByText('Category removed')).toBeInTheDocument()
    })

    it('should render add_sprout transaction', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_sprout',
          transaction_data: { sprout_id: 'sprout-1' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Sprout Added')).toBeInTheDocument()
      expect(screen.getByText('Sprout added')).toBeInTheDocument()
    })

    it('should render automated transaction with indicator', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: 'auto-1',
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText(/Tag: work.*automated/)).toBeInTheDocument()
    })

    it('should render unknown transaction type', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'unknown_type' as any,
          transaction_data: { content: '' }, // Use valid transaction data type
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('unknown_type')).toBeInTheDocument()
      expect(screen.getByText('Transaction')).toBeInTheDocument()
    })

    it('should truncate long content in create_seed transaction', () => {
      const longContent = 'a'.repeat(150)
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: longContent },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      const content = screen.getByText(/Content:/)
      expect(content.textContent).toContain('...')
      expect(content.textContent?.length).toBeLessThan(longContent.length + 20)
    })
  })

  describe('Sprout Rendering', () => {
    it('should render followup sprout', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: '2024-01-01T12:00:00.000Z',
            initial_message: 'Follow up on this',
          },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Follow-up Sprout')).toBeInTheDocument()
      expect(screen.getByText('Follow up on this')).toBeInTheDocument()
    })

    it('should render musing sprout', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'musing',
          sprout_data: {
            template_type: 'numbered_ideas',
            content: { ideas: ['Idea 1'] },
            dismissed: false,
            dismissed_at: null,
            completed: false,
            completed_at: null,
          },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Musing Sprout')).toBeInTheDocument()
      expect(screen.getByText('Musing (numbered_ideas)')).toBeInTheDocument()
    })

    it('should render extra_context sprout', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'extra_context',
          sprout_data: {},
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Extra Context Sprout')).toBeInTheDocument()
      expect(screen.getByText('Extra context sprout')).toBeInTheDocument()
    })

    it('should render fact_check sprout', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'fact_check',
          sprout_data: {},
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Fact Check Sprout')).toBeInTheDocument()
      expect(screen.getByText('Fact check sprout')).toBeInTheDocument()
    })

    it('should render automated sprout with indicator', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'automatic',
            initial_time: '2024-01-01T12:00:00.000Z',
            initial_message: 'Auto follow up',
          },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: 'auto-1',
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText(/Auto follow up.*automated/)).toBeInTheDocument()
    })

    it('should render followup sprout without initial_message', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: '2024-01-01T12:00:00.000Z',
            initial_message: '',
          },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Follow-up Sprout')).toBeInTheDocument()
      expect(screen.getByText('Follow-up sprout')).toBeInTheDocument()
    })
  })

  describe('Timeline Merging and Sorting', () => {
    it('should merge transactions and sprouts and sort by time (newest first)', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: '2024-01-01T10:00:00.000Z',
          automation_id: null,
        },
      ]

      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: '2024-01-01T12:00:00.000Z',
            initial_message: 'Follow up',
          },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
        {
          id: 'sprout-2',
          seed_id: 'seed-1',
          sprout_type: 'musing',
          sprout_data: {
            template_type: 'numbered_ideas',
            content: { ideas: [] },
            dismissed: false,
            dismissed_at: null,
            completed: false,
            completed_at: null,
          },
          created_at: '2024-01-01T11:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      const items = screen.getAllByText(/Follow-up Sprout|Musing Sprout|Seed Created/)
      // Should be sorted newest first: sprout-1 (12:00), sprout-2 (11:00), txn-1 (10:00)
      expect(items[0]?.textContent).toContain('Follow-up Sprout')
      expect(items[1]?.textContent).toContain('Musing Sprout')
      expect(items[2]?.textContent).toContain('Seed Created')
    })

    it('should handle transactions and sprouts with same timestamp', () => {
      const sameTime = '2024-01-01T12:00:00.000Z'
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: sameTime,
          automation_id: null,
        },
      ]

      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: sameTime,
            initial_message: 'Follow up',
          },
          created_at: sameTime,
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Tag Added')).toBeInTheDocument()
      expect(screen.getByText('Follow-up Sprout')).toBeInTheDocument()
    })
  })

  describe('Tag Grouping', () => {
    it('should group consecutive tag additions within 1 minute', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z').getTime()
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: new Date(baseTime).toISOString(),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2', tag_name: 'important' },
          created_at: new Date(baseTime - 30000).toISOString(), // 30 seconds earlier
          automation_id: null,
        },
        {
          id: 'txn-3',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-3', tag_name: 'urgent' },
          created_at: new Date(baseTime - 60000).toISOString(), // 1 minute earlier (within threshold)
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      // Should show grouped message
      expect(screen.getByText('Tags Added')).toBeInTheDocument()
      expect(screen.getByText(/Tags:.*work.*important.*urgent/)).toBeInTheDocument()
    })

    it('should not group tag additions separated by more than 1 minute', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z').getTime()
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: new Date(baseTime).toISOString(),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2', tag_name: 'important' },
          created_at: new Date(baseTime - 61000).toISOString(), // More than 1 minute earlier
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      // Should show individual messages
      const tagMessages = screen.getAllByText('Tag Added')
      expect(tagMessages.length).toBe(2)
    })

    it('should not group tag additions interrupted by other transaction', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z').getTime()
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: new Date(baseTime).toISOString(),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-1',
          transaction_type: 'edit_content',
          transaction_data: { content: 'Updated' },
          created_at: new Date(baseTime - 30000).toISOString(),
          automation_id: null,
        },
        {
          id: 'txn-3',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2', tag_name: 'important' },
          created_at: new Date(baseTime - 60000).toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      // Should show individual tag messages (not grouped)
      const tagMessages = screen.getAllByText('Tag Added')
      expect(tagMessages.length).toBe(2)
      expect(screen.getByText('Content Edited')).toBeInTheDocument()
    })

    it('should limit grouped tags to 10 for display', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z').getTime()
      const transactions: SeedTransaction[] = Array.from({ length: 15 }, (_, i) => ({
        id: `txn-${i}`,
        seed_id: 'seed-1',
        transaction_type: 'add_tag' as const,
        transaction_data: { tag_id: `tag-${i}`, tag_name: `tag${i}` },
        created_at: new Date(baseTime - i * 1000).toISOString(),
        automation_id: null,
      }))

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Tags Added')).toBeInTheDocument()
      expect(screen.getByText(/, and \d+ more/)).toBeInTheDocument()
    })

    it('should remove duplicate tag names in grouped message', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z').getTime()
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: new Date(baseTime).toISOString(),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2', tag_name: 'work' }, // Duplicate name
          created_at: new Date(baseTime - 30000).toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      const content = screen.getByText(/Tags:/)
      // Should only show 'work' once
      const matches = content.textContent?.match(/work/g) || []
      expect(matches.length).toBe(1)
    })

    it('should show automated indicator in grouped tags if any tag is automated', () => {
      const baseTime = new Date('2024-01-01T12:00:00.000Z').getTime()
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
          created_at: new Date(baseTime).toISOString(),
          automation_id: null,
        },
        {
          id: 'txn-2',
          seed_id: 'seed-1',
          transaction_type: 'add_tag',
          transaction_data: { tag_id: 'tag-2', tag_name: 'important' },
          created_at: new Date(baseTime - 30000).toISOString(),
          automation_id: 'auto-1',
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText(/Tags:.*automated/)).toBeInTheDocument()
    })
  })

  describe('Time Formatting', () => {
    beforeEach(() => {
      // Mock Date.now() to return a fixed time
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should show "just now" for very recent items', () => {
      const recentTime = new Date('2024-01-15T12:00:00.000Z')
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: recentTime.toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('just now')).toBeInTheDocument()
    })

    it('should show minutes ago for items within an hour', () => {
      const thirtyMinutesAgo = new Date('2024-01-15T11:30:00.000Z')
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: thirtyMinutesAgo.toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('30m ago')).toBeInTheDocument()
    })

    it('should show hours ago for items within 24 hours', () => {
      const twoHoursAgo = new Date('2024-01-15T10:00:00.000Z')
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: twoHoursAgo.toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('2h ago')).toBeInTheDocument()
    })

    it('should show date for items not from today', () => {
      const yesterday = new Date('2024-01-14T12:00:00.000Z')
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: yesterday.toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      // Should show date format like "Jan 14"
      expect(screen.getByText(/Jan 14/)).toBeInTheDocument()
    })

    it('should show year for items from different year', () => {
      const lastYear = new Date('2023-01-15T12:00:00.000Z')
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: lastYear.toISOString(),
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      // Should show date with year
      expect(screen.getByText(/Jan 15, 2023/)).toBeInTheDocument()
    })
  })

  describe('Sprout Navigation', () => {
    it('should make sprouts clickable and navigate to sprout detail', async () => {
      const user = userEvent.setup()
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {
            trigger: 'manual',
            initial_time: '2024-01-01T12:00:00.000Z',
            initial_message: 'Follow up',
          },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      const sproutItem = screen.getByText('Follow-up Sprout').closest('.transaction-history-item')
      expect(sproutItem).toHaveStyle({ cursor: 'pointer' })

      await user.click(sproutItem!)
      expect(mockNavigate).toHaveBeenCalledWith('/sprouts/sprout-1')
    })

    it('should not make transactions clickable', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      const transactionItem = screen.getByText('Seed Created').closest('.transaction-history-item')
      expect(transactionItem).toHaveStyle({ cursor: 'default' })
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing transaction data gracefully', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: {} as any,
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Seed Created')).toBeInTheDocument()
      expect(screen.getByText('Seed created')).toBeInTheDocument()
    })

    it('should handle missing sprout data gracefully', () => {
      const sprouts: Sprout[] = [
        {
          id: 'sprout-1',
          seed_id: 'seed-1',
          sprout_type: 'followup',
          sprout_data: {} as any,
          created_at: '2024-01-01T12:00:00.000Z',
          automation_id: null,
        },
      ]

      render(
        <MemoryRouter>
          <SeedTimeline transactions={[]} sprouts={sprouts} getColor={getColor} />
        </MemoryRouter>
      )

      expect(screen.getByText('Follow-up Sprout')).toBeInTheDocument()
    })

    it('should handle invalid date strings', () => {
      const transactions: SeedTransaction[] = [
        {
          id: 'txn-1',
          seed_id: 'seed-1',
          transaction_type: 'create_seed',
          transaction_data: { content: 'Content' },
          created_at: 'invalid-date',
          automation_id: null,
        },
      ]

      // Should not throw error
      expect(() => {
        render(
          <MemoryRouter>
            <SeedTimeline transactions={transactions} sprouts={[]} getColor={getColor} />
          </MemoryRouter>
        )
      }).not.toThrow()
    })
  })
})

