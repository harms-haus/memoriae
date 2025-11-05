// Category change service tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { CategoryChangeService } from './category-change-service'
import { AutomationRegistry } from './automation/registry'
import { PressurePointsService } from './pressure'
import { SeedsService } from './seeds'
import { Automation, type AutomationContext, type CategoryChange } from './automation/base'
import type { Seed, SeedState } from './seeds'

// In-memory database store for mocking
const mockDb: {
  categories: Map<string, any>
  seeds: Map<string, any>
  seed_categories: Map<string, any>
} = {
  categories: new Map(),
  seeds: new Map(),
  seed_categories: new Map(),
}

// Helper to generate composite key for seed_categories
function getSeedCategoryKey(seedId: string, categoryId: string): string {
  return `${seedId}:${categoryId}`
}

// Mock database connection
vi.mock('../db/connection', () => {
  const createMockQueryBuilder = (table: string) => {
    const store = mockDb[table as keyof typeof mockDb]
    let queryFilters: Array<{ field: string; value: any }> = []
    let joinTable: string | null = null
    let joinOn: [string, string] | null = null
    let whereInValues: any[] = []
    let likePattern: string | null = null
    let selectFields: string[] = ['*']
    let distinctFlag = false

    const executeQuery = (): any[] => {
      const results: any[] = []
      
      if (table === 'seed_categories' && joinTable === 'seeds') {
        // Handle join query
        for (const [key, item] of store.entries()) {
          const seedId = item.seed_id
          const seed = mockDb.seeds.get(seedId)
          if (!seed) continue

          // Apply filters
          let matches = true
          for (const filter of queryFilters) {
            if (filter.field === 'category_id' && item.category_id !== filter.value) {
              matches = false
              break
            } else if (filter.field === 'seed_id' && item.seed_id !== filter.value) {
              matches = false
              break
            }
          }

          // Check whereIn
          if (whereInValues.length > 0) {
            const categoryIdFilter = queryFilters.find(f => f.field === 'category_id' && f.value === 'whereIn')
            if (categoryIdFilter && !whereInValues.includes(item.category_id)) {
              matches = false
            }
          }

          if (matches) {
            const result: any = {}
            // When joining seeds, always include id and user_id regardless of select fields
            // (The actual query selects 'seeds.id' and 'seeds.user_id')
            result.id = seed.id
            result.user_id = seed.user_id
            results.push(result)
          }
        }
      } else if (table === 'categories') {
        // Handle categories query
        for (const [key, item] of store.entries()) {
          let matches = true
          
          for (const filter of queryFilters) {
            if (item[filter.field] !== filter.value) {
              matches = false
              break
            }
          }

          // Check like pattern
          if (likePattern) {
            const pattern = likePattern.replace('%', '')
            if (!item.path.startsWith(pattern)) {
              matches = false
            }
          }

          if (matches) {
            const result: any = {}
            for (const field of selectFields) {
              if (field === '*' || field === 'id') {
                result.id = item.id
              }
              if (field === '*' || field === 'path') {
                result.path = item.path
              }
            }
            results.push(result)
          }
        }
      }

      // Remove duplicates if distinct BEFORE resetting fields
      let finalResults = results
      if (distinctFlag) {
        const seen = new Set<string>()
        finalResults = results.filter(r => {
          const key = `${r.id}:${r.user_id || ''}`
          if (seen.has(key)) return false
          seen.add(key)
          return true
        })
      }
      
      // Reset query state AFTER getting results
      queryFilters = []
      whereInValues = []
      likePattern = null
      joinTable = null
      joinOn = null
      selectFields = ['*']
      distinctFlag = false
      
      return finalResults
    }

    const builder: any = {
      where(field: string | object, value?: any) {
        if (typeof field === 'object') {
          Object.entries(field).forEach(([k, v]) => queryFilters.push({ field: k, value: v }))
        } else {
          // Handle 'like' operator
          if (typeof value === 'string' && value.includes('%')) {
            likePattern = value
          } else {
            queryFilters.push({ field, value })
          }
        }
        return builder
      },
      whereIn(field: string, values: any[]) {
        whereInValues = values
        queryFilters.push({ field, value: 'whereIn' })
        return builder
      },
      join(table: string, col1: string, col2: string) {
        joinTable = table
        joinOn = [col1, col2]
        return builder
      },
      select(fields?: string | string[]) {
        if (fields) {
          selectFields = Array.isArray(fields) ? fields : [fields]
        } else {
          selectFields = ['*']
        }
        return builder
      },
      distinct() {
        distinctFlag = true
        return builder
      },
      // Make builder thenable
      then(resolve: (value: any) => any) {
        return Promise.resolve(executeQuery()).then(resolve)
      },
    }
    return builder
  }

  return {
    default: vi.fn((table: string) => createMockQueryBuilder(table)),
  }
})

// Mock automation class for testing
class TestAutomation extends Automation {
  readonly name = 'test-automation'
  readonly description = 'Test automation'
  readonly handlerFnName = 'processTest'
  id: string
  enabled: boolean = true

  constructor() {
    super()
    // Always set an ID in constructor
    this.id = uuidv4()
  }

  async process(seed: Seed, context: AutomationContext) {
    return { events: [] }
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    // Return pressure based on change type
    const change = changes[0]
    if (!change) return 0
    
    switch (change.type) {
      case 'rename':
        return 10
      case 'add_child':
        return 5
      case 'remove':
        return 20
      case 'move':
        return 15
      default:
        return 0
    }
  }

  getPressureThreshold(): number {
    return 50
  }
}

// Mock services
vi.mock('./automation/registry', () => ({
  AutomationRegistry: {
    getInstance: vi.fn(() => ({
      getEnabled: vi.fn(() => []),
    })),
  },
}))

vi.mock('./pressure', () => ({
  PressurePointsService: {
    addPressure: vi.fn().mockResolvedValue({
      seed_id: '',
      automation_id: '',
      pressure_amount: 0,
      last_updated: new Date(),
    }),
  },
}))

vi.mock('./seeds', () => ({
  SeedsService: {
    getById: vi.fn().mockResolvedValue(null),
  },
}))

vi.mock('./openrouter/client', () => ({
  createOpenRouterClient: vi.fn(() => ({
    chat: vi.fn(),
  })),
}))

describe('CategoryChangeService', () => {
  let mockRegistry: any
  let testAutomation: TestAutomation
  let testSeedId: string
  let testUserId: string
  let testCategoryId: string

  beforeEach(() => {
    vi.clearAllMocks()
    
    // Suppress console.log during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    
    // Clear mock database
    mockDb.categories.clear()
    mockDb.seeds.clear()
    mockDb.seed_categories.clear()

    // Setup test data
    testUserId = uuidv4()
    testSeedId = uuidv4()
    testCategoryId = uuidv4()
    testAutomation = new TestAutomation()
    // ID should be set in constructor, but ensure it's set
    if (!testAutomation.id) {
      testAutomation.id = uuidv4()
    }

    // Setup mock registry
    mockRegistry = {
      getEnabled: vi.fn(() => [testAutomation]),
    }
    ;(AutomationRegistry.getInstance as any).mockReturnValue(mockRegistry)

    // Setup mock seed
    const mockSeed: Seed = {
      id: testSeedId,
      user_id: testUserId,
      seed_content: 'Test seed content',
      created_at: new Date(),
      currentState: {
        seed: 'Test seed content',
        timestamp: new Date().toISOString(),
        metadata: {},
        categories: [
          {
            id: testCategoryId,
            name: 'Test Category',
            path: '/test',
          },
        ],
      },
    }
    ;(SeedsService.getById as any).mockResolvedValue(mockSeed)

    // Add seed to mock database
    mockDb.seeds.set(testSeedId, {
      id: testSeedId,
      user_id: testUserId,
      seed_content: 'Test seed content',
      created_at: new Date(),
    })

    // Add category to mock database
    mockDb.categories.set(testCategoryId, {
      id: testCategoryId,
      parent_id: null,
      name: 'Test Category',
      path: '/test',
      created_at: new Date(),
    })

    // Add seed-category relationship
    mockDb.seed_categories.set(getSeedCategoryKey(testSeedId, testCategoryId), {
      seed_id: testSeedId,
      category_id: testCategoryId,
    })
  })

  describe('handleCategoryRename', () => {
    it('should detect seeds with renamed category and apply pressure', async () => {
      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      expect(mockRegistry.getEnabled).toHaveBeenCalled()
      expect(SeedsService.getById).toHaveBeenCalledWith(testSeedId, testUserId)
      expect(PressurePointsService.addPressure).toHaveBeenCalledWith(
        testSeedId,
        testAutomation.id,
        10 // rename pressure
      )
    })

    it('should skip if no automations enabled', async () => {
      mockRegistry.getEnabled.mockReturnValue([])

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      expect(PressurePointsService.addPressure).not.toHaveBeenCalled()
    })

    it('should skip if no seeds affected', async () => {
      mockDb.seed_categories.clear()

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      expect(SeedsService.getById).not.toHaveBeenCalled()
      expect(PressurePointsService.addPressure).not.toHaveBeenCalled()
    })

    it('should detect seeds with child categories', async () => {
      const childCategoryId = uuidv4()
      const childPath = '/test/child'
      const childSeedId = uuidv4()

      // Add child category
      mockDb.categories.set(childCategoryId, {
        id: childCategoryId,
        parent_id: testCategoryId,
        name: 'Child Category',
        path: childPath,
        created_at: new Date(),
      })

      // Add child seed
      mockDb.seeds.set(childSeedId, {
        id: childSeedId,
        user_id: testUserId,
        seed_content: 'Child seed',
        created_at: new Date(),
      })

      mockDb.seed_categories.set(getSeedCategoryKey(childSeedId, childCategoryId), {
        seed_id: childSeedId,
        category_id: childCategoryId,
      })

      // Mock child seed
      const childSeed: Seed = {
        id: childSeedId,
        user_id: testUserId,
        seed_content: 'Child seed',
        created_at: new Date(),
        currentState: {
          seed: 'Child seed',
          timestamp: new Date().toISOString(),
          metadata: {},
          categories: [
            {
              id: childCategoryId,
              name: 'Child Category',
              path: childPath,
            },
          ],
        },
      }
      ;(SeedsService.getById as any).mockImplementation((id: string, userId: string) => {
        if (id === childSeedId) return Promise.resolve(childSeed)
        if (id === testSeedId) {
          return Promise.resolve({
            id: testSeedId,
            user_id: testUserId,
            seed_content: 'Test seed content',
            created_at: new Date(),
            currentState: {
              seed: 'Test seed content',
              timestamp: new Date().toISOString(),
              metadata: {},
              categories: [
                {
                  id: testCategoryId,
                  name: 'Test Category',
                  path: '/test',
                },
              ],
            },
          })
        }
        return Promise.resolve(null)
      })

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      // Should process both seeds (direct + child)
      expect(PressurePointsService.addPressure).toHaveBeenCalledTimes(2)
    })
  })

  describe('handleCategoryAdd', () => {
    it('should detect seeds with parent category when child is added', async () => {
      const parentCategoryId = uuidv4()
      const newCategoryId = uuidv4()

      // Add parent category
      mockDb.categories.set(parentCategoryId, {
        id: parentCategoryId,
        parent_id: null,
        name: 'Parent',
        path: '/parent',
        created_at: new Date(),
      })

      // Add parent seed-category relationship
      mockDb.seed_categories.set(getSeedCategoryKey(testSeedId, parentCategoryId), {
        seed_id: testSeedId,
        category_id: parentCategoryId,
      })

      // Update seed to have parent category
      const seedWithParent: Seed = {
        id: testSeedId,
        user_id: testUserId,
        seed_content: 'Test seed',
        created_at: new Date(),
        currentState: {
          seed: 'Test seed',
          timestamp: new Date().toISOString(),
          metadata: {},
          categories: [
            {
              id: parentCategoryId,
              name: 'Parent',
              path: '/parent',
            },
          ],
        },
      }
      ;(SeedsService.getById as any).mockResolvedValue(seedWithParent)

      await CategoryChangeService.handleCategoryAdd(
        newCategoryId,
        parentCategoryId,
        '/parent/child',
        testUserId
      )

      expect(PressurePointsService.addPressure).toHaveBeenCalledWith(
        testSeedId,
        testAutomation.id,
        5 // add_child pressure
      )
    })

    it('should skip if parentId is null (no parent seeds to check)', async () => {
      // When parentId is null, we only check for direct seeds with the new category
      // Since we're adding a new category, there are no seeds with it yet
      // So no pressure should be added
      const newCategoryId = uuidv4()
      
      // Clear seed_categories to ensure no seeds are found
      mockDb.seed_categories.clear()
      
      await CategoryChangeService.handleCategoryAdd(
        newCategoryId,
        null,
        '/top-level',
        testUserId
      )

      // Should not find any seeds and not add pressure
      expect(PressurePointsService.addPressure).not.toHaveBeenCalled()
    })
  })

  describe('handleCategoryRemove', () => {
    it('should detect seeds with removed category and apply pressure', async () => {
      await CategoryChangeService.handleCategoryRemove(
        testCategoryId,
        '/test',
        testUserId
      )

      expect(PressurePointsService.addPressure).toHaveBeenCalledWith(
        testSeedId,
        testAutomation.id,
        20 // remove pressure
      )
    })

    it('should detect seeds with child categories', async () => {
      const childCategoryId = uuidv4()
      const childPath = '/test/child'

      mockDb.categories.set(childCategoryId, {
        id: childCategoryId,
        parent_id: testCategoryId,
        name: 'Child',
        path: childPath,
        created_at: new Date(),
      })

      const childSeedId = uuidv4()
      mockDb.seeds.set(childSeedId, {
        id: childSeedId,
        user_id: testUserId,
        seed_content: 'Child seed',
        created_at: new Date(),
      })

      mockDb.seed_categories.set(getSeedCategoryKey(childSeedId, childCategoryId), {
        seed_id: childSeedId,
        category_id: childCategoryId,
      })

      const childSeed: Seed = {
        id: childSeedId,
        user_id: testUserId,
        seed_content: 'Child seed',
        created_at: new Date(),
        currentState: {
          seed: 'Child seed',
          timestamp: new Date().toISOString(),
          metadata: {},
          categories: [
            {
              id: childCategoryId,
              name: 'Child',
              path: childPath,
            },
          ],
        },
      }
      ;(SeedsService.getById as any).mockImplementation((id: string, userId: string) => {
        if (id === childSeedId) return Promise.resolve(childSeed)
        if (id === testSeedId) {
          return Promise.resolve({
            id: testSeedId,
            user_id: testUserId,
            seed_content: 'Test seed content',
            created_at: new Date(),
            currentState: {
              seed: 'Test seed content',
              timestamp: new Date().toISOString(),
              metadata: {},
              categories: [
                {
                  id: testCategoryId,
                  name: 'Test Category',
                  path: '/test',
                },
              ],
            },
          })
        }
        return Promise.resolve(null)
      })

      await CategoryChangeService.handleCategoryRemove(
        testCategoryId,
        '/test',
        testUserId
      )

      // Should process both seeds (direct + child)
      expect(PressurePointsService.addPressure).toHaveBeenCalledTimes(2)
    })
  })

  describe('handleCategoryMove', () => {
    it('should detect seeds with moved category and apply pressure', async () => {
      const oldParentId = uuidv4()
      const newParentId = uuidv4()

      await CategoryChangeService.handleCategoryMove(
        testCategoryId,
        oldParentId,
        newParentId,
        '/old/path',
        '/new/path',
        testUserId
      )

      expect(PressurePointsService.addPressure).toHaveBeenCalledWith(
        testSeedId,
        testAutomation.id,
        15 // move pressure
      )
    })

    it('should handle null parent IDs correctly', async () => {
      await CategoryChangeService.handleCategoryMove(
        testCategoryId,
        null,
        null,
        '/old',
        '/new',
        testUserId
      )

      expect(PressurePointsService.addPressure).toHaveBeenCalled()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing seed gracefully', async () => {
      ;(SeedsService.getById as any).mockResolvedValue(null)

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      // Should not throw, but also not add pressure
      expect(PressurePointsService.addPressure).not.toHaveBeenCalled()
    })

    it('should handle automation calculation errors gracefully', async () => {
      const errorAutomation = new TestAutomation()
      errorAutomation.calculatePressure = vi.fn().mockImplementation(() => {
        throw new Error('Calculation error')
      })
      mockRegistry.getEnabled.mockReturnValue([errorAutomation])

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      // Should not throw, error should be logged
      expect(errorAutomation.calculatePressure).toHaveBeenCalled()
    })

    it('should skip automations without IDs', async () => {
      const noIdAutomation = new TestAutomation()
      noIdAutomation.id = undefined
      mockRegistry.getEnabled.mockReturnValue([noIdAutomation])

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      expect(PressurePointsService.addPressure).not.toHaveBeenCalled()
    })

    it('should not add pressure if calculation returns 0', async () => {
      const zeroPressureAutomation = new TestAutomation()
      zeroPressureAutomation.calculatePressure = vi.fn().mockReturnValue(0)
      mockRegistry.getEnabled.mockReturnValue([zeroPressureAutomation])

      await CategoryChangeService.handleCategoryRename(
        testCategoryId,
        '/test',
        '/renamed',
        testUserId
      )

      expect(PressurePointsService.addPressure).not.toHaveBeenCalled()
    })
  })
  
  afterEach(() => {
    // Restore console methods
    vi.restoreAllMocks()
  })
})
