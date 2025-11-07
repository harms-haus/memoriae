// Tests for seed state computation and validation
import { describe, it, expect } from 'vitest'
import { validateTransaction, computeSeedState } from './seed-state'
import type { SeedTransaction } from '../types/seed-transactions'

describe('validateTransaction', () => {
  describe('create_seed transaction', () => {
    it('should validate create_seed with valid content', () => {
      expect(() => {
        validateTransaction('create_seed', { content: 'Valid content' })
      }).not.toThrow()
    })

    it('should reject create_seed with empty string', () => {
      expect(() => {
        validateTransaction('create_seed', { content: '' })
      }).toThrow('create_seed transaction requires non-empty content string')
    })

    it('should reject create_seed with whitespace-only content', () => {
      expect(() => {
        validateTransaction('create_seed', { content: '   ' })
      }).toThrow('create_seed transaction requires non-empty content string')
    })

    it('should reject create_seed with newline-only content', () => {
      expect(() => {
        validateTransaction('create_seed', { content: '\n\n\t  \n' })
      }).toThrow('create_seed transaction requires non-empty content string')
    })

    it('should reject create_seed with non-string content', () => {
      expect(() => {
        validateTransaction('create_seed', { content: 123 as any })
      }).toThrow('create_seed transaction requires non-empty content string')
    })

    it('should reject create_seed with null content', () => {
      expect(() => {
        validateTransaction('create_seed', { content: null as any })
      }).toThrow('create_seed transaction requires non-empty content string')
    })

    it('should reject create_seed with undefined content', () => {
      expect(() => {
        validateTransaction('create_seed', { content: undefined as any })
      }).toThrow('create_seed transaction requires non-empty content string')
    })

    it('should accept create_seed with content that has leading/trailing whitespace', () => {
      // Note: The validation checks trim().length, so this should still pass
      // The trimming happens at the service level before creating the transaction
      expect(() => {
        validateTransaction('create_seed', { content: '  Valid content  ' })
      }).not.toThrow()
    })
  })

  describe('edit_content transaction', () => {
    it('should validate edit_content with valid content', () => {
      expect(() => {
        validateTransaction('edit_content', { content: 'Updated content' })
      }).not.toThrow()
    })

    it('should validate edit_content with empty string (allowed for edits)', () => {
      // Note: edit_content allows empty strings (user might want to clear content)
      expect(() => {
        validateTransaction('edit_content', { content: '' })
      }).not.toThrow()
    })

    it('should reject edit_content with non-string content', () => {
      expect(() => {
        validateTransaction('edit_content', { content: 123 as any })
      }).toThrow('edit_content transaction requires content string')
    })
  })

  describe('add_tag transaction', () => {
    it('should validate add_tag with valid data', () => {
      expect(() => {
        validateTransaction('add_tag', { tag_id: 'tag-1', tag_name: 'Work' })
      }).not.toThrow()
    })

    it('should reject add_tag with missing tag_id', () => {
      expect(() => {
        validateTransaction('add_tag', { tag_name: 'Work' } as any)
      }).toThrow('add_tag transaction requires tag_id and tag_name strings')
    })

    it('should reject add_tag with missing tag_name', () => {
      expect(() => {
        validateTransaction('add_tag', { tag_id: 'tag-1' } as any)
      }).toThrow('add_tag transaction requires tag_id and tag_name strings')
    })
  })

  describe('remove_tag transaction', () => {
    it('should validate remove_tag with valid tag_id', () => {
      expect(() => {
        validateTransaction('remove_tag', { tag_id: 'tag-1' })
      }).not.toThrow()
    })

    it('should reject remove_tag with missing tag_id', () => {
      expect(() => {
        validateTransaction('remove_tag', {} as any)
      }).toThrow('remove_tag transaction requires tag_id string')
    })
  })

  describe('add_category transaction', () => {
    it('should validate add_category with valid data', () => {
      expect(() => {
        validateTransaction('add_category', {
          category_id: 'cat-1',
          category_name: 'Work',
          category_path: '/work',
        })
      }).not.toThrow()
    })

    it('should reject add_category with missing fields', () => {
      expect(() => {
        validateTransaction('add_category', {
          category_id: 'cat-1',
          category_name: 'Work',
        } as any)
      }).toThrow('add_category transaction requires category_id, category_name, and category_path strings')
    })
  })

  describe('remove_category transaction', () => {
    it('should validate remove_category with valid category_id', () => {
      expect(() => {
        validateTransaction('remove_category', { category_id: 'cat-1' })
      }).not.toThrow()
    })

    it('should reject remove_category with missing category_id', () => {
      expect(() => {
        validateTransaction('remove_category', {} as any)
      }).toThrow('remove_category transaction requires category_id string')
    })
  })

  describe('add_followup transaction', () => {
    it('should validate add_followup (minimal validation)', () => {
      expect(() => {
        validateTransaction('add_followup', { followup_id: 'followup-1' })
      }).not.toThrow()
    })
  })

  describe('unknown transaction type', () => {
    it('should reject unknown transaction type', () => {
      expect(() => {
        validateTransaction('unknown_type' as any, {})
      }).toThrow('Unknown transaction type: unknown_type')
    })
  })
})

describe('computeSeedState', () => {
  it('should reject transactions without create_seed', () => {
    const transactions: SeedTransaction[] = [
      {
        id: 'txn-1',
        seed_id: 'seed-1',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1', tag_name: 'Work' },
        created_at: new Date(),
        automation_id: null,
      },
    ]

    expect(() => {
      computeSeedState(transactions)
    }).toThrow('Seed must have a create_seed transaction')
  })

  it('should compute state from create_seed with valid content', () => {
    const now = new Date()
    const transactions: SeedTransaction[] = [
      {
        id: 'txn-1',
        seed_id: 'seed-1',
        transaction_type: 'create_seed',
        transaction_data: { content: 'Initial content' },
        created_at: now,
        automation_id: null,
      },
    ]

    const state = computeSeedState(transactions)

    expect(state.seed).toBe('Initial content')
    expect(state.timestamp).toEqual(now)
    expect(state.metadata).toEqual({})
    expect(state.tags).toEqual([])
    expect(state.categories).toEqual([])
  })

  it('should skip invalid create_seed transactions with empty content', () => {
    const now = new Date()
    const transactions: SeedTransaction[] = [
      {
        id: 'txn-1',
        seed_id: 'seed-1',
        transaction_type: 'create_seed',
        transaction_data: { content: '' } as any, // Invalid: empty content
        created_at: now,
        automation_id: null,
      },
    ]

    // This should throw because create_seed is required and must be valid
    expect(() => {
      computeSeedState(transactions)
    }).toThrow('create_seed transaction requires non-empty content string')
  })

  it('should apply edit_content transactions in order', () => {
    const now = new Date()
    const transactions: SeedTransaction[] = [
      {
        id: 'txn-1',
        seed_id: 'seed-1',
        transaction_type: 'create_seed',
        transaction_data: { content: 'Initial' },
        created_at: new Date(now.getTime() - 2000),
        automation_id: null,
      },
      {
        id: 'txn-2',
        seed_id: 'seed-1',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Updated' },
        created_at: new Date(now.getTime() - 1000),
        automation_id: null,
      },
      {
        id: 'txn-3',
        seed_id: 'seed-1',
        transaction_type: 'edit_content',
        transaction_data: { content: 'Final' },
        created_at: now,
        automation_id: null,
      },
    ]

    const state = computeSeedState(transactions)

    expect(state.seed).toBe('Final')
  })

  it('should skip invalid transactions and continue processing', () => {
    const now = new Date()
    const transactions: SeedTransaction[] = [
      {
        id: 'txn-1',
        seed_id: 'seed-1',
        transaction_type: 'create_seed',
        transaction_data: { content: 'Initial' },
        created_at: new Date(now.getTime() - 3000),
        automation_id: null,
      },
      {
        id: 'txn-2',
        seed_id: 'seed-1',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1', tag_name: 'Work' },
        created_at: new Date(now.getTime() - 2000),
        automation_id: null,
      },
      {
        id: 'txn-3',
        seed_id: 'seed-1',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: null, tag_name: 'Invalid' } as any, // Invalid
        created_at: new Date(now.getTime() - 1000),
        automation_id: null,
      },
      {
        id: 'txn-4',
        seed_id: 'seed-1',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-2', tag_name: 'Personal' },
        created_at: now,
        automation_id: null,
      },
    ]

    const state = computeSeedState(transactions)

    expect(state.tags).toHaveLength(2)
    expect(state.tags?.map(t => t.id)).toEqual(['tag-1', 'tag-2'])
  })
})

