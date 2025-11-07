import { describe, it, expect, beforeEach } from 'vitest'
import { computeTagState, validateTransaction, type TagState } from './tag-state'
import type { TagTransaction } from '../types/tag-transactions'

describe('tag-state utils', () => {
  describe('validateTransaction', () => {
    it('should validate creation transaction with valid data', () => {
      expect(() => {
        validateTransaction('creation', { name: 'test', color: '#ff0000' })
      }).not.toThrow()
    })

    it('should validate creation transaction with null color', () => {
      expect(() => {
        validateTransaction('creation', { name: 'test', color: null })
      }).not.toThrow()
    })

    it('should throw error for creation transaction with empty name', () => {
      expect(() => {
        validateTransaction('creation', { name: '', color: '#ff0000' })
      }).toThrow('creation transaction requires non-empty name string')
    })

    it('should throw error for creation transaction with invalid color', () => {
      expect(() => {
        validateTransaction('creation', { name: 'test', color: 123 })
      }).toThrow('creation transaction color must be null or string')
    })

    it('should validate edit transaction with valid data', () => {
      expect(() => {
        validateTransaction('edit', { name: 'new name' })
      }).not.toThrow()
    })

    it('should throw error for edit transaction with empty name', () => {
      expect(() => {
        validateTransaction('edit', { name: '' })
      }).toThrow('edit transaction requires non-empty name string')
    })

    it('should validate set_color transaction with null color', () => {
      expect(() => {
        validateTransaction('set_color', { color: null })
      }).not.toThrow()
    })

    it('should validate set_color transaction with color string', () => {
      expect(() => {
        validateTransaction('set_color', { color: '#00ff00' })
      }).not.toThrow()
    })

    it('should throw error for set_color transaction with invalid color', () => {
      expect(() => {
        validateTransaction('set_color', { color: 123 })
      }).toThrow('set_color transaction color must be null or string')
    })

    it('should throw error for unknown transaction type', () => {
      expect(() => {
        validateTransaction('unknown' as any, {})
      }).toThrow('Unknown transaction type')
    })
  })

  describe('computeTagState', () => {
    let mockTransactions: TagTransaction[]

    beforeEach(() => {
      const now = new Date()
      mockTransactions = [
        {
          id: '1',
          tag_id: 'tag-1',
          transaction_type: 'creation',
          transaction_data: { name: 'original', color: '#ff0000' },
          created_at: now,
          automation_id: null,
        },
      ]
    })

    it('should compute state from creation transaction only', () => {
      const result = computeTagState(mockTransactions)
      
      expect(result).toEqual({
        name: 'original',
        color: '#ff0000',
        timestamp: mockTransactions[0].created_at,
        metadata: {},
      })
    })

    it('should apply edit transaction after creation', () => {
      const editTransaction: TagTransaction = {
        id: '2',
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: 'edited' },
        created_at: new Date(mockTransactions[0].created_at.getTime() + 1000),
        automation_id: null,
      }
      
      const result = computeTagState([...mockTransactions, editTransaction])
      
      expect(result).toEqual({
        name: 'edited',
        color: '#ff0000',
        timestamp: mockTransactions[0].created_at,
        metadata: {},
      })
    })

    it('should apply set_color transaction after creation', () => {
      const colorTransaction: TagTransaction = {
        id: '2',
        tag_id: 'tag-1',
        transaction_type: 'set_color',
        transaction_data: { color: '#00ff00' },
        created_at: new Date(mockTransactions[0].created_at.getTime() + 1000),
        automation_id: null,
      }
      
      const result = computeTagState([...mockTransactions, colorTransaction])
      
      expect(result).toEqual({
        name: 'original',
        color: '#00ff00',
        timestamp: mockTransactions[0].created_at,
        metadata: {},
      })
    })

    it('should apply multiple transactions in chronological order', () => {
      const editTransaction: TagTransaction = {
        id: '2',
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: 'first edit' },
        created_at: new Date(mockTransactions[0].created_at.getTime() + 1000),
        automation_id: null,
      }

      const colorTransaction: TagTransaction = {
        id: '3',
        tag_id: 'tag-1',
        transaction_type: 'set_color',
        transaction_data: { color: '#0000ff' },
        created_at: new Date(mockTransactions[0].created_at.getTime() + 2000),
        automation_id: null,
      }

      const finalEditTransaction: TagTransaction = {
        id: '4',
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: 'final name' },
        created_at: new Date(mockTransactions[0].created_at.getTime() + 3000),
        automation_id: null,
      }
      
      const result = computeTagState([...mockTransactions, editTransaction, colorTransaction, finalEditTransaction])
      
      expect(result).toEqual({
        name: 'final name',
        color: '#0000ff',
        timestamp: mockTransactions[0].created_at,
        metadata: {},
      })
    })

    it('should handle out-of-order transactions by sorting them', () => {
      const lateEdit: TagTransaction = {
        id: '2',
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: 'should be first' },
        created_at: new Date(mockTransactions[0].created_at.getTime() - 1000),
        automation_id: null,
      }

      const earlyColor: TagTransaction = {
        id: '3',
        tag_id: 'tag-1',
        transaction_type: 'set_color',
        transaction_data: { color: '#ffff00' },
        created_at: new Date(mockTransactions[0].created_at.getTime() - 500),
        automation_id: null,
      }
      
      const result = computeTagState([mockTransactions[0], lateEdit, earlyColor])
      
      expect(result).toEqual({
        name: 'should be first',
        color: '#ffff00',
        timestamp: mockTransactions[0].created_at,
        metadata: {},
      })
    })

    it('should throw error when no creation transaction exists', () => {
      expect(() => {
        computeTagState([])
      }).toThrow('Tag must have a creation transaction')
    })

    it('should skip invalid transactions and continue processing', () => {
      const invalidTransaction: TagTransaction = {
        id: '2',
        tag_id: 'tag-1',
        transaction_type: 'edit',
        transaction_data: { name: '' }, // Invalid empty name
        created_at: new Date(mockTransactions[0].created_at.getTime() + 1000),
        automation_id: null,
      }
      
      const result = computeTagState([...mockTransactions, invalidTransaction])
      
      // Should use creation transaction data since edit was invalid
      expect(result).toEqual({
        name: 'original',
        color: '#ff0000',
        timestamp: mockTransactions[0].created_at,
        metadata: {},
      })
    })

    it('should handle null color in creation transaction', () => {
      const creationWithNullColor: TagTransaction = {
        id: '1',
        tag_id: 'tag-1',
        transaction_type: 'creation',
        transaction_data: { name: 'no color', color: null },
        created_at: new Date(),
        automation_id: null,
      }
      
      const result = computeTagState([creationWithNullColor])
      
      expect(result).toEqual({
        name: 'no color',
        color: null,
        timestamp: creationWithNullColor.created_at,
        metadata: {},
      })
    })
  })
})
