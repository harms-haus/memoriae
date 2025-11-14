// TransactionHistoryList component unit tests
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TransactionHistoryList, type TransactionHistoryMessage } from './TransactionHistoryList'

describe('TransactionHistoryList Component', () => {
  const mockGetColor = (message: TransactionHistoryMessage): string => {
    return 'var(--accent-purple)'
  }

  describe('Tag Removal Display', () => {
    it('should display single tag removal with tag name', () => {
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag: work',
          time: new Date('2024-01-02T00:00:00.000Z'),
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} />
      )

      expect(screen.getByText('Tag Removed')).toBeInTheDocument()
      expect(screen.getByText('Tag: work')).toBeInTheDocument()
    })

    it('should display grouped tag removals with tag names in header and body', () => {
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag: work',
          time: new Date('2024-01-02T00:00:00.000Z'),
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Removed',
          content: 'Tag: important',
          time: new Date('2024-01-02T00:00:00.001Z'),
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-3',
          title: 'Tag Removed',
          content: 'Tag: urgent',
          time: new Date('2024-01-02T00:00:00.002Z'),
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} />
      )

      // Should show "Tags Removed" in header (not "3x Tag Removed")
      expect(screen.getByText('Tags Removed')).toBeInTheDocument()
      
      // Should show tag names in body (order may vary, so check for all three tags)
      const content = screen.getByText(/Tags removed:/)
      expect(content).toBeInTheDocument()
      expect(content.textContent).toContain('work')
      expect(content.textContent).toContain('important')
      expect(content.textContent).toContain('urgent')
    })

    it('should handle tag removals without tag names (backward compatibility)', () => {
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag removed',
          time: new Date('2024-01-02T00:00:00.000Z'),
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Removed',
          content: 'Tag removed',
          time: new Date('2024-01-02T00:00:00.001Z'),
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} />
      )

      expect(screen.getByText('Tags Removed')).toBeInTheDocument()
      // Should show count when tag names are not available
      expect(screen.getByText(/2x Tag removed/)).toBeInTheDocument()
    })

    it('should handle mixed tag removals (some with names, some without)', () => {
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag: work',
          time: new Date('2024-01-02T00:00:00.000Z'),
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Removed',
          content: 'Tag removed',
          time: new Date('2024-01-02T00:00:00.001Z'),
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} />
      )

      expect(screen.getByText('Tags Removed')).toBeInTheDocument()
      // Should show the tag name that's available
      expect(screen.getByText(/Tags removed: work/)).toBeInTheDocument()
    })

    it('should handle tag removals with automated flag', () => {
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag: work • (automated)',
          time: new Date('2024-01-02T00:00:00.000Z'),
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Removed',
          content: 'Tag: important • (automated)',
          time: new Date('2024-01-02T00:00:00.001Z'),
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} />
      )

      expect(screen.getByText('Tags Removed')).toBeInTheDocument()
      // Check that it contains the tags and automated flag (order may vary)
      const content = screen.getByText(/Tags removed:/)
      expect(content).toBeInTheDocument()
      expect(content.textContent).toContain('work')
      expect(content.textContent).toContain('important')
      expect(content.textContent).toContain('(automated)')
    })
  })

  describe('Tag Addition Display (for comparison)', () => {
    it('should display grouped tag additions correctly', () => {
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Added',
          content: 'Tag: work',
          time: new Date('2024-01-02T00:00:00.000Z'),
          groupKey: 'add_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Added',
          content: 'Tag: important',
          time: new Date('2024-01-02T00:00:00.001Z'),
          groupKey: 'add_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} />
      )

      expect(screen.getByText('Tags Added')).toBeInTheDocument()
      // Check that it contains both tags (order may vary)
      const content = screen.getByText(/Tags:/)
      expect(content).toBeInTheDocument()
      expect(content.textContent).toContain('work')
      expect(content.textContent).toContain('important')
    })
  })

  describe('Grouping Logic', () => {
    it('should group tag removals within threshold time', () => {
      const now = new Date('2024-01-02T12:00:00.000Z')
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag: work',
          time: new Date(now.getTime() - 1000), // 1 second ago
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Removed',
          content: 'Tag: important',
          time: new Date(now.getTime() - 2000), // 2 seconds ago
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} groupThresholdMs={60000} />
      )

      // Should be grouped
      expect(screen.getByText('Tags Removed')).toBeInTheDocument()
      expect(screen.getByText(/Tags removed: work, important/)).toBeInTheDocument()
    })

    it('should not group tag removals beyond threshold time', () => {
      const now = new Date('2024-01-02T12:00:00.000Z')
      const messages: TransactionHistoryMessage[] = [
        {
          id: 'msg-1',
          title: 'Tag Removed',
          content: 'Tag: work',
          time: new Date(now.getTime() - 1000), // 1 second ago
          groupKey: 'remove_tag',
        },
        {
          id: 'msg-2',
          title: 'Tag Removed',
          content: 'Tag: important',
          time: new Date(now.getTime() - 120000), // 2 minutes ago (beyond 1 minute threshold)
          groupKey: 'remove_tag',
        },
      ]

      render(
        <TransactionHistoryList messages={messages} getColor={mockGetColor} groupThresholdMs={60000} />
      )

      // Should not be grouped - should show as separate items
      const removedElements = screen.getAllByText('Tag Removed')
      expect(removedElements.length).toBe(2)
    })
  })
})

