import { describe, it, expect } from 'vitest'
import { applyEvents, validatePatch, createBaseState } from './jsonpatch'
import type { Operation } from 'fast-json-patch'
import type { EventData } from './jsonpatch'

describe('JSON Patch utilities', () => {
  describe('validatePatch', () => {
    it('should accept valid patch operations', () => {
      const patch: Operation[] = [
        { op: 'add', path: '/tags/-', value: { id: '1', name: 'work' } },
      ]
      expect(() => validatePatch(patch)).not.toThrow()
    })

    it('should reject empty patch', () => {
      expect(() => validatePatch([])).toThrow('Patch cannot be empty')
    })

    it('should reject invalid operation type', () => {
      const patch = [{ op: 'copy', path: '/tags/-', value: 'test' }] as Operation[]
      expect(() => validatePatch(patch)).toThrow('Operation "copy" is not allowed')
    })

    it('should reject disallowed path', () => {
      const patch: Operation[] = [
        { op: 'add', path: '/forbidden', value: 'test' },
      ]
      expect(() => validatePatch(patch)).toThrow('Path "/forbidden" is not allowed')
    })

    it('should reject operation without value for add', () => {
      const patch = [{ op: 'add', path: '/tags/-' }] as Operation[]
      expect(() => validatePatch(patch)).toThrow('requires a "value" field')
    })

    it('should accept valid paths', () => {
      const validPaths = [
        { op: 'add', path: '/tags/-', value: { id: '1', name: 'tag' } },
        { op: 'add', path: '/categories/-', value: { id: '1', name: 'cat', path: '/work' } },
        { op: 'replace', path: '/seed', value: 'new content' },
        { op: 'add', path: '/metadata/key', value: 'value' },
      ]

      for (const patch of validPaths) {
        expect(() => validatePatch([patch])).not.toThrow()
      }
    })
  })

  describe('createBaseState', () => {
    it('should create base state with seed content', () => {
      const content = 'Test seed content'
      const createdAt = new Date('2024-01-01')

      const state = createBaseState(content, createdAt)

      expect(state.seed).toBe(content)
      expect(state.timestamp).toEqual(createdAt)
      expect(state.metadata).toEqual({})
      expect(state.tags).toEqual([])
      expect(state.categories).toEqual([])
    })
  })

  describe('applyEvents', () => {
    it('should apply enabled events in chronological order', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '1', name: 'work' } }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
        {
          id: '2',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '2', name: 'personal' } }],
          enabled: true,
          created_at: new Date('2024-01-03'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(2)
      expect(result.tags?.[0]).toEqual({ id: '1', name: 'work' })
      expect(result.tags?.[1]).toEqual({ id: '2', name: 'personal' })
    })

    it('should ignore disabled events', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '1', name: 'work' } }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
        {
          id: '2',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '2', name: 'personal' } }],
          enabled: false,
          created_at: new Date('2024-01-03'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(1)
      expect(result.tags?.[0]).toEqual({ id: '1', name: 'work' })
    })

    it('should apply events in chronological order regardless of input order', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '2',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '2', name: 'second' } }],
          enabled: true,
          created_at: new Date('2024-01-03'),
        },
        {
          id: '1',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '1', name: 'first' } }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(2)
      expect(result.tags?.[0]).toEqual({ id: '1', name: 'first' })
      expect(result.tags?.[1]).toEqual({ id: '2', name: 'second' })
    })

    it('should handle string dates in created_at', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '1', name: 'work' } }],
          enabled: true,
          created_at: '2024-01-02T00:00:00Z',
        },
        {
          id: '2',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '2', name: 'personal' } }],
          enabled: true,
          created_at: '2024-01-03T00:00:00Z',
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(2)
    })

    it('should handle replace operation', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'replace', path: '/seed', value: 'Updated content' }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.seed).toBe('Updated content')
    })

    it('should handle remove operation', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      baseState.tags = [
        { id: '1', name: 'work' },
        { id: '2', name: 'personal' },
      ]

      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'remove', path: '/tags/0' }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(1)
      expect(result.tags?.[0]).toEqual({ id: '2', name: 'personal' })
    })

    it('should handle metadata updates', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'add', path: '/metadata/key1', value: 'value1' }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.metadata.key1).toBe('value1')
    })

    it('should not mutate original state', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const originalTags = baseState.tags ? [...baseState.tags] : []
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [{ op: 'add', path: '/tags/-', value: { id: '1', name: 'work' } }],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(1)
      expect(baseState.tags).toEqual(originalTags)
    })

    it('should handle multiple operations in one event', () => {
      const baseState = createBaseState('Initial content', new Date('2024-01-01'))
      const events: EventData[] = [
        {
          id: '1',
          patch_json: [
            { op: 'add', path: '/tags/-', value: { id: '1', name: 'work' } },
            { op: 'add', path: '/categories/-', value: { id: '1', name: 'work', path: '/work' } },
          ],
          enabled: true,
          created_at: new Date('2024-01-02'),
        },
      ]

      const result = applyEvents(baseState, events)

      expect(result.tags).toHaveLength(1)
      expect(result.categories).toHaveLength(1)
    })
  })
})
