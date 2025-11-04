// Pressure points service tests
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { PressurePointsService } from './pressure'
import { AutomationRegistry } from './automation/registry'
import { Automation, type AutomationContext, type CategoryChange } from './automation/base'
import type { Seed } from './seeds'

// In-memory database store for mocking
const mockDb: {
  users: Map<string, any>
  seeds: Map<string, any>
  automations: Map<string, any>
  pressure_points: Map<string, any>
} = {
  users: new Map(),
  seeds: new Map(),
  automations: new Map(),
  pressure_points: new Map(),
}

// Helper to generate composite key for pressure_points
function getPressureKey(seedId: string, automationId: string): string {
  return `${seedId}:${automationId}`
}

// Mock database connection
vi.mock('../db/connection', () => {
  const createMockQueryBuilder = (table: string) => {
    const store = mockDb[table as keyof typeof mockDb]
    let queryFilters: Array<{ field: string; value: any }> = []
    let selectFields: string[] = ['*']
    let conflictFields: string[] = []
    let mergeData: any = {}
    let updateData: any = null

    const executeQuery = (): any[] => {
      const results: any[] = []
      if (table === 'pressure_points') {
        // Handle composite key lookups for pressure_points
        for (const [key, item] of store.entries()) {
          let matches = true
          for (const filter of queryFilters) {
            if (filter.field === 'seed_id' && item.seed_id !== filter.value) {
              matches = false
              break
            } else if (filter.field === 'automation_id' && item.automation_id !== filter.value) {
              matches = false
              break
            } else if (filter.field !== 'seed_id' && filter.field !== 'automation_id' && item[filter.field] !== filter.value) {
              matches = false
              break
            }
          }
          if (matches) {
            results.push({ ...item })
          }
        }
      } else {
        // Standard table lookup
        for (const item of store.values()) {
          let matches = true
          for (const filter of queryFilters) {
            if (item[filter.field] !== filter.value) {
              matches = false
              break
            }
          }
          if (matches) {
            results.push({ ...item })
          }
        }
      }
      queryFilters = []
      return results
    }

    const builder: any = {
      where(field: string | object, value?: any) {
        if (typeof field === 'object') {
          Object.entries(field).forEach(([k, v]) => queryFilters.push({ field: k, value: v }))
        } else {
          queryFilters.push({ field, value })
        }
        return builder
      },
      first() {
        const results = executeQuery()
        return Promise.resolve(results.length > 0 ? results[0] : undefined)
      },
      select(fields?: string | string[]) {
        if (fields) {
          selectFields = Array.isArray(fields) ? fields : [fields]
        }
        const results = executeQuery()
        selectFields = ['*']
        return Promise.resolve(results)
      },
      // Make builder thenable so it can be awaited directly
      then(resolve: (value: any) => any) {
        return Promise.resolve(executeQuery()).then(resolve)
      },
      insert(data: any | any[]) {
        const items = Array.isArray(data) ? data : [data]
        const inserted: any[] = []
        for (const item of items) {
          if (table === 'pressure_points') {
            // Use composite key for pressure_points
            const key = getPressureKey(item.seed_id, item.automation_id)
            const record = { ...item, last_updated: item.last_updated || new Date() }
            store.set(key, record)
            inserted.push(record)
          } else {
            const id = item.id || uuidv4()
            const record = { ...item, id }
            store.set(id, record)
            inserted.push(record)
          }
        }
        return {
          ...builder,
          returning(field: string = '*') {
            return Promise.resolve(inserted)
          },
          onConflict(fields: string | string[]) {
            conflictFields = Array.isArray(fields) ? fields : [fields]
            return {
              merge(data: any) {
                mergeData = data
                // Handle upsert: check if exists by conflict fields
                const items = Array.isArray(data) ? data : [data]
                for (const item of items) {
                  const conflictKey = conflictFields[0] === 'id' ? item.id : item[conflictFields[0]]
                  const existing = Array.from(store.values()).find(r => 
                    conflictFields[0] === 'id' ? r.id === conflictKey : r[conflictFields[0]] === conflictKey
                  )
                  if (existing) {
                    Object.assign(existing, mergeData, { id: existing.id })
                    inserted.length = 0
                    inserted.push(existing)
                  } else {
                    const id = item.id || uuidv4()
                    const record = { ...item, id, ...mergeData }
                    store.set(id, record)
                    inserted.push(record)
                  }
                }
                return {
                  returning(field: string = '*') {
                    return Promise.resolve(inserted)
                  },
                }
              },
            }
          },
        }
      },
      update(data: any) {
        updateData = data
        const updated: any[] = []
        let updateCount = 0
        
        if (table === 'pressure_points') {
          // Handle composite key updates for pressure_points
          const seedIdFilter = queryFilters.find(f => f.field === 'seed_id')
          const automationIdFilter = queryFilters.find(f => f.field === 'automation_id')
          
          if (seedIdFilter && automationIdFilter) {
            // Update specific pressure point
            const key = getPressureKey(seedIdFilter.value, automationIdFilter.value)
            const existing = store.get(key)
            if (existing) {
              Object.assign(existing, updateData, { last_updated: updateData.last_updated || new Date() })
              updated.push(existing)
              updateCount = 1
            }
          } else if (seedIdFilter) {
            // Update all for seed
            for (const [key, item] of store.entries()) {
              if (item.seed_id === seedIdFilter.value) {
                Object.assign(item, updateData, { last_updated: updateData.last_updated || new Date() })
                updated.push(item)
                updateCount++
              }
            }
          } else if (automationIdFilter) {
            // Update all for automation
            for (const [key, item] of store.entries()) {
              if (item.automation_id === automationIdFilter.value) {
                Object.assign(item, updateData, { last_updated: updateData.last_updated || new Date() })
                updated.push(item)
                updateCount++
              }
            }
          }
        } else {
          // Standard table update
          const toUpdate: string[] = []
          for (const [key, item] of store.entries()) {
            let matches = true
            for (const filter of queryFilters) {
              if (item[filter.field] !== filter.value) {
                matches = false
                break
              }
            }
            if (matches) {
              toUpdate.push(key)
            }
          }
          for (const key of toUpdate) {
            const item = store.get(key)
            if (item) {
              Object.assign(item, updateData)
              updated.push(item)
              updateCount++
            }
          }
        }
        
        queryFilters = []
        updateData = null
        
        // Make update thenable (can be awaited directly, returns count)
        const updateBuilder: any = Promise.resolve(updateCount)
        updateBuilder.returning = (field: string = '*') => {
          return Promise.resolve(updated)
        }
        return updateBuilder
      },
      delete() {
        const deleted: any[] = []
        const toDelete: string[] = []
        for (const [key, item] of store.entries()) {
          let matches = true
          for (const filter of queryFilters) {
            if (table === 'pressure_points') {
              if (filter.field === 'seed_id') {
                // Delete all pressure points for this seed
                const automationId = queryFilters.find(f => f.field === 'automation_id')?.value
                if (automationId) {
                  const pressureKey = getPressureKey(filter.value, automationId)
                  if (mockDb.pressure_points.has(pressureKey)) {
                    toDelete.push(pressureKey)
                  }
                } else {
                  // Delete all for seed
                  for (const [ppKey, ppItem] of mockDb.pressure_points.entries()) {
                    if (ppItem.seed_id === filter.value) {
                      toDelete.push(ppKey)
                    }
                  }
                }
                matches = false // Don't use standard delete path
                break
              } else if (filter.field === 'automation_id') {
                // Delete all for automation
                for (const [ppKey, ppItem] of mockDb.pressure_points.entries()) {
                  if (ppItem.automation_id === filter.value) {
                    toDelete.push(ppKey)
                  }
                }
                matches = false
                break
              }
            } else if (item[filter.field] !== filter.value) {
              matches = false
              break
            }
          }
          if (matches && table !== 'pressure_points') {
            toDelete.push(key)
          }
        }
        for (const key of toDelete) {
          if (table === 'pressure_points') {
            const item = mockDb.pressure_points.get(key)
            if (item) deleted.push(item)
            mockDb.pressure_points.delete(key)
          } else {
            const item = store.get(key)
            if (item) deleted.push(item)
            store.delete(key)
          }
        }
        queryFilters = []
        return Promise.resolve(deleted.length)
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
  threshold: number = 50

  async process(seed: Seed, context: AutomationContext) {
    return { events: [] }
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    return changes.length * 10
  }

  getPressureThreshold(): number {
    return this.threshold
  }
}

class LowThresholdAutomation extends Automation {
  readonly name = 'low-threshold-automation'
  readonly description = 'Low threshold automation'
  readonly handlerFnName = 'processLow'
  threshold: number = 10

  async process(seed: Seed, context: AutomationContext) {
    return { events: [] }
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    return changes.length * 5
  }

  getPressureThreshold(): number {
    return this.threshold
  }
}

class HighThresholdAutomation extends Automation {
  readonly name = 'high-threshold-automation'
  readonly description = 'High threshold automation'
  readonly handlerFnName = 'processHigh'
  threshold: number = 80

  async process(seed: Seed, context: AutomationContext) {
    return { events: [] }
  }

  calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
    return changes.length * 20
  }

  getPressureThreshold(): number {
    return this.threshold
  }
}

// Helper function to create test user and seed
async function createTestSeed(userId: string = uuidv4()): Promise<{ userId: string; seedId: string }> {
  const seedId = uuidv4()
  mockDb.users.set(userId, {
    id: userId,
    email: `test-${userId}@example.com`,
    name: 'Test User',
    provider: 'google',
    provider_id: `google-${userId}`,
    created_at: new Date(),
  })
  mockDb.seeds.set(seedId, {
    id: seedId,
    user_id: userId,
    seed_content: 'Test seed content',
    created_at: new Date(),
  })
  return { userId, seedId }
}

// Helper function to create test automation in database
async function createTestAutomation(
  automation: Automation,
  automationId: string = uuidv4()
): Promise<string> {
  // Check if automation with same name exists
  const existing = Array.from(mockDb.automations.values()).find(a => a.name === automation.name)
  if (existing) {
    automation.id = existing.id
    return existing.id
  }

  mockDb.automations.set(automationId, {
    id: automationId,
    name: automation.name,
    description: automation.description,
    handler_fn_name: automation.handlerFnName,
    enabled: automation.enabled,
    created_at: new Date(),
  })
  automation.id = automationId

  // Register automation
  const registry = AutomationRegistry.getInstance()
  await registry.register(automation)

  return automationId
}

// Clean up test data
async function cleanupTestData(seedId?: string, automationId?: string) {
  if (seedId) {
    const keysToDelete: string[] = []
    for (const [key, item] of mockDb.pressure_points.entries()) {
      if (item.seed_id === seedId) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => mockDb.pressure_points.delete(key))
    mockDb.seeds.delete(seedId)
  }
  if (automationId) {
    const keysToDelete: string[] = []
    for (const [key, item] of mockDb.pressure_points.entries()) {
      if (item.automation_id === automationId) {
        keysToDelete.push(key)
      }
    }
    keysToDelete.forEach(key => mockDb.pressure_points.delete(key))
    mockDb.automations.delete(automationId)
  }
}

describe('PressurePointsService', () => {
  let testUserId: string
  let testSeedId: string
  let testAutomationId: string
  let testAutomation: TestAutomation

  beforeEach(async () => {
    vi.clearAllMocks()
    // Clear in-memory database
    mockDb.users.clear()
    mockDb.seeds.clear()
    mockDb.automations.clear()
    mockDb.pressure_points.clear()

    // Create test data
    const seedData = await createTestSeed()
    testUserId = seedData.userId
    testSeedId = seedData.seedId

    testAutomation = new TestAutomation()
    testAutomationId = await createTestAutomation(testAutomation)
  })

  afterEach(async () => {
    // Clean up test data
    await cleanupTestData(testSeedId, testAutomationId)
    // Also clean up any other test data that might have been created
    const registry = AutomationRegistry.getInstance()
    registry.clear()
  })

  describe('Basic CRUD Operations', () => {
    describe('Create/Read Operations', () => {
      it('should retrieve existing pressure point', async () => {
        // Create a pressure point
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)

        // Retrieve it
        const result = await PressurePointsService.get(testSeedId, testAutomationId)

        expect(result).not.toBeNull()
        expect(result?.seed_id).toBe(testSeedId)
        expect(result?.automation_id).toBe(testAutomationId)
        expect(result?.pressure_amount).toBe(25)
      })

      it('should return null for non-existent pressure point', async () => {
        // Use a valid UUID that doesn't exist
        const nonExistentId = uuidv4()
        const result = await PressurePointsService.get(testSeedId, nonExistentId)

        expect(result).toBeNull()
      })

      it('should retrieve all pressure points for a seed', async () => {
        // Create another automation
        const automation2 = new LowThresholdAutomation()
        const automation2Id = await createTestAutomation(automation2)

        try {
          // Create pressure points for both automations
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
          await PressurePointsService.addPressure(testSeedId, automation2Id, 15)

          // Retrieve all for seed
          const results = await PressurePointsService.getBySeedId(testSeedId)

          expect(results).toHaveLength(2)
          expect(results.some(p => p.automation_id === testAutomationId)).toBe(true)
          expect(results.some(p => p.automation_id === automation2Id)).toBe(true)
        } finally {
          await cleanupTestData(undefined, automation2Id)
        }
      })

      it('should return empty array for seed with no pressure points', async () => {
        const results = await PressurePointsService.getBySeedId(testSeedId)

        expect(results).toEqual([])
      })

      it('should retrieve all pressure points for an automation', async () => {
        // Create another seed
        const seedData2 = await createTestSeed()
        const seedId2 = seedData2.seedId

        try {
          // Create pressure points for both seeds
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
          await PressurePointsService.addPressure(seedId2, testAutomationId, 15)

          // Retrieve all for automation
          const results = await PressurePointsService.getByAutomationId(testAutomationId)

          expect(results).toHaveLength(2)
          expect(results.some(p => p.seed_id === testSeedId)).toBe(true)
          expect(results.some(p => p.seed_id === seedId2)).toBe(true)
        } finally {
          await cleanupTestData(seedId2)
        }
      })

      it('should return empty array for automation with no pressure points', async () => {
        const results = await PressurePointsService.getByAutomationId(testAutomationId)

        expect(results).toEqual([])
      })

      it('should retrieve all pressure points', async () => {
        // Create additional test data
        const automation2 = new LowThresholdAutomation()
        const automation2Id = await createTestAutomation(automation2)
        const seedData2 = await createTestSeed()
        const seedId2 = seedData2.seedId

        try {
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
          await PressurePointsService.addPressure(seedId2, automation2Id, 15)

          const results = await PressurePointsService.getAll()

          expect(results.length).toBeGreaterThanOrEqual(2)
          expect(results.some(p => p.seed_id === testSeedId && p.automation_id === testAutomationId)).toBe(true)
          expect(results.some(p => p.seed_id === seedId2 && p.automation_id === automation2Id)).toBe(true)
        } finally {
          await cleanupTestData(seedId2, automation2Id)
        }
      })

      it('should return empty array when no pressure points exist', async () => {
        mockDb.pressure_points.clear()

        const results = await PressurePointsService.getAll()

        expect(results).toEqual([])
      })
    })

    describe('Update Operations', () => {
      it('should create new pressure point when none exists', async () => {
        const result = await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)

        expect(result).not.toBeNull()
        expect(result.pressure_amount).toBe(25)
        expect(result.seed_id).toBe(testSeedId)
        expect(result.automation_id).toBe(testAutomationId)
      })

      it('should add to existing pressure amount', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
        const result = await PressurePointsService.addPressure(testSeedId, testAutomationId, 15)

        expect(result.pressure_amount).toBe(40)
      })

      it('should cap pressure at 100 (doesn\'t exceed 100)', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 75)
        const result = await PressurePointsService.addPressure(testSeedId, testAutomationId, 50)

        expect(result.pressure_amount).toBe(100)
      })

      it('should handle negative pressure (clamps to 0)', async () => {
        const result = await PressurePointsService.addPressure(testSeedId, testAutomationId, -10)

        expect(result.pressure_amount).toBe(0)
      })

      it('should handle pressure > 100 (clamps to 100)', async () => {
        const result = await PressurePointsService.addPressure(testSeedId, testAutomationId, 150)

        expect(result.pressure_amount).toBe(100)
      })

      it('should update last_updated timestamp', async () => {
        // Use fake timers to avoid real delays
        vi.useFakeTimers()
        const startTime = new Date('2024-01-01T00:00:00Z')
        vi.setSystemTime(startTime)

        const result1 = await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
        const timestamp1 = result1.last_updated

        // Advance time by 1 second
        vi.advanceTimersByTime(1000)

        const result2 = await PressurePointsService.addPressure(testSeedId, testAutomationId, 10)
        const timestamp2 = result2.last_updated

        expect(timestamp2.getTime()).toBeGreaterThan(timestamp1.getTime())
        vi.useRealTimers()
      })

      it('should set exact pressure value', async () => {
        const result = await PressurePointsService.setPressure(testSeedId, testAutomationId, 42)

        expect(result.pressure_amount).toBe(42)
      })

      it('should create new pressure point if doesn\'t exist when setting', async () => {
        const result = await PressurePointsService.setPressure(testSeedId, testAutomationId, 42)

        expect(result).not.toBeNull()
        expect(result.pressure_amount).toBe(42)
      })

      it('should update existing pressure point when setting', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
        const result = await PressurePointsService.setPressure(testSeedId, testAutomationId, 42)

        expect(result.pressure_amount).toBe(42)
      })

      it('should cap pressure at 100 when setting', async () => {
        const result = await PressurePointsService.setPressure(testSeedId, testAutomationId, 150)

        expect(result.pressure_amount).toBe(100)
      })

      it('should handle negative pressure when setting (clamps to 0)', async () => {
        const result = await PressurePointsService.setPressure(testSeedId, testAutomationId, -10)

        expect(result.pressure_amount).toBe(0)
      })

      it('should reset pressure to 0', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 75)
        const result = await PressurePointsService.resetPressure(testSeedId, testAutomationId)

        expect(result.pressure_amount).toBe(0)
      })

      it('should create pressure point at 0 if doesn\'t exist when resetting', async () => {
        const result = await PressurePointsService.resetPressure(testSeedId, testAutomationId)

        expect(result).not.toBeNull()
        expect(result.pressure_amount).toBe(0)
      })

      it('should reset all pressure for a seed', async () => {
        // Create multiple automations
        const automation2 = new LowThresholdAutomation()
        const automation2Id = await createTestAutomation(automation2)

        try {
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 50)
          await PressurePointsService.addPressure(testSeedId, automation2Id, 30)

          const resetCount = await PressurePointsService.resetAllForSeed(testSeedId)

          expect(resetCount).toBe(2)

          const point1 = await PressurePointsService.get(testSeedId, testAutomationId)
          const point2 = await PressurePointsService.get(testSeedId, automation2Id)

          expect(point1?.pressure_amount).toBe(0)
          expect(point2?.pressure_amount).toBe(0)
        } finally {
          await cleanupTestData(undefined, automation2Id)
        }
      })

      it('should reset all pressure for an automation', async () => {
        // Create multiple seeds
        const seedData2 = await createTestSeed()
        const seedId2 = seedData2.seedId

        try {
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 50)
          await PressurePointsService.addPressure(seedId2, testAutomationId, 30)

          const resetCount = await PressurePointsService.resetAllForAutomation(testAutomationId)

          expect(resetCount).toBe(2)

          const point1 = await PressurePointsService.get(testSeedId, testAutomationId)
          const point2 = await PressurePointsService.get(seedId2, testAutomationId)

          expect(point1?.pressure_amount).toBe(0)
          expect(point2?.pressure_amount).toBe(0)
        } finally {
          await cleanupTestData(seedId2)
        }
      })
    })

    describe('Delete Operations', () => {
      it('should delete existing pressure point', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)

        const deleted = await PressurePointsService.delete(testSeedId, testAutomationId)

        expect(deleted).toBe(true)

        const result = await PressurePointsService.get(testSeedId, testAutomationId)
        expect(result).toBeNull()
      })

      it('should return false for non-existent pressure point', async () => {
        // Use a valid UUID that doesn't exist
        const nonExistentId = uuidv4()
        const deleted = await PressurePointsService.delete(testSeedId, nonExistentId)

        expect(deleted).toBe(false)
      })

      it('should delete all pressure points for a seed', async () => {
        const automation2 = new LowThresholdAutomation()
        const automation2Id = await createTestAutomation(automation2)

        try {
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
          await PressurePointsService.addPressure(testSeedId, automation2Id, 15)

          const deletedCount = await PressurePointsService.deleteAllForSeed(testSeedId)

          expect(deletedCount).toBe(2)

          const point1 = await PressurePointsService.get(testSeedId, testAutomationId)
          const point2 = await PressurePointsService.get(testSeedId, automation2Id)

          expect(point1).toBeNull()
          expect(point2).toBeNull()
        } finally {
          await cleanupTestData(undefined, automation2Id)
        }
      })

      it('should return 0 if seed has no pressure points when deleting', async () => {
        const deletedCount = await PressurePointsService.deleteAllForSeed(testSeedId)

        expect(deletedCount).toBe(0)
      })

      it('should delete all pressure points for an automation', async () => {
        const seedData2 = await createTestSeed()
        const seedId2 = seedData2.seedId

        try {
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
          await PressurePointsService.addPressure(seedId2, testAutomationId, 15)

          const deletedCount = await PressurePointsService.deleteAllForAutomation(testAutomationId)

          expect(deletedCount).toBe(2)

          const point1 = await PressurePointsService.get(testSeedId, testAutomationId)
          const point2 = await PressurePointsService.get(seedId2, testAutomationId)

          expect(point1).toBeNull()
          expect(point2).toBeNull()
        } finally {
          await cleanupTestData(seedId2)
        }
      })

      it('should return 0 if automation has no pressure points when deleting', async () => {
        const deletedCount = await PressurePointsService.deleteAllForAutomation(testAutomationId)

        expect(deletedCount).toBe(0)
      })
    })
  })

  describe('Threshold Detection', () => {
    describe('Threshold Calculation', () => {
      it('should add threshold from automation', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
        const result = await PressurePointsService.get(testSeedId, testAutomationId)

        expect(result?.threshold).toBe(50) // Default threshold from TestAutomation
      })

      it('should use undefined threshold if automation not found', async () => {
        // Create an automation in DB but don't register it in the registry
        const automationId = uuidv4()
        mockDb.automations.set(automationId, {
          id: automationId,
          name: 'unregistered-automation',
          description: 'Not in registry',
          handler_fn_name: 'unregistered',
          enabled: true,
          created_at: new Date(),
        })
        
        const pressureKey = getPressureKey(testSeedId, automationId)
        mockDb.pressure_points.set(pressureKey, {
          seed_id: testSeedId,
          automation_id: automationId,
          pressure_amount: 25,
          last_updated: new Date(),
        })

        const result = await PressurePointsService.get(testSeedId, automationId)

        expect(result?.threshold).toBeUndefined()

        // Cleanup
        await cleanupTestData(undefined, automationId)
      })

      it('should use automation\'s custom threshold if set', async () => {
        const automation = new LowThresholdAutomation()
        const automationId = await createTestAutomation(automation)

        try {
          await PressurePointsService.addPressure(testSeedId, automationId, 25)
          const result = await PressurePointsService.get(testSeedId, automationId)

          expect(result?.threshold).toBe(10) // LowThresholdAutomation has threshold 10
        } finally {
          await cleanupTestData(undefined, automationId)
        }
      })

      it('should return true when pressure >= threshold', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 50) // Exactly at threshold
        const result = await PressurePointsService.get(testSeedId, testAutomationId)

        expect(PressurePointsService.exceedsThreshold(result!)).toBe(true)
      })

      it('should return false when pressure < threshold', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25) // Below threshold
        const result = await PressurePointsService.get(testSeedId, testAutomationId)

        expect(PressurePointsService.exceedsThreshold(result!)).toBe(false)
      })

      it('should return false when threshold is undefined', async () => {
        // Create an automation in DB but don't register it in the registry
        const automationId = uuidv4()
        mockDb.automations.set(automationId, {
          id: automationId,
          name: 'unregistered-automation-2',
          description: 'Not in registry',
          handler_fn_name: 'unregistered2',
          enabled: true,
          created_at: new Date(),
        })
        
        const pressureKey = getPressureKey(testSeedId, automationId)
        mockDb.pressure_points.set(pressureKey, {
          seed_id: testSeedId,
          automation_id: automationId,
          pressure_amount: 100,
          last_updated: new Date(),
        })

        const result = await PressurePointsService.get(testSeedId, automationId)

        expect(PressurePointsService.exceedsThreshold(result!)).toBe(false)

        // Cleanup
        await cleanupTestData(undefined, automationId)
      })
    })

    describe('Exceeded Threshold Queries', () => {
      it('should return only pressure points that exceed threshold', async () => {
        const lowAuto = new LowThresholdAutomation()
        const lowAutoId = await createTestAutomation(lowAuto)
        const highAuto = new HighThresholdAutomation()
        const highAutoId = await createTestAutomation(highAuto)

        try {
          // Create pressure points: one exceeds, one doesn't
          await PressurePointsService.addPressure(testSeedId, lowAutoId, 15) // Exceeds threshold 10
          await PressurePointsService.addPressure(testSeedId, highAutoId, 50) // Below threshold 80

          const exceeded = await PressurePointsService.getExceededThresholds()

          expect(exceeded.length).toBeGreaterThanOrEqual(1)
          expect(exceeded.some(p => p.automation_id === lowAutoId)).toBe(true)
          expect(exceeded.some(p => p.automation_id === highAutoId)).toBe(false)
        } finally {
          await cleanupTestData(undefined, lowAutoId)
          await cleanupTestData(undefined, highAutoId)
        }
      })

      it('should filter by automation ID when provided', async () => {
        const lowAuto = new LowThresholdAutomation()
        const lowAutoId = await createTestAutomation(lowAuto)

        try {
          await PressurePointsService.addPressure(testSeedId, testAutomationId, 75) // Exceeds threshold 50
          await PressurePointsService.addPressure(testSeedId, lowAutoId, 15) // Exceeds threshold 10

          const exceeded = await PressurePointsService.getExceededThresholds(testAutomationId)

          expect(exceeded.every(p => p.automation_id === testAutomationId)).toBe(true)
          expect(exceeded.length).toBeGreaterThanOrEqual(1)
        } finally {
          await cleanupTestData(undefined, lowAutoId)
        }
      })

      it('should return empty array when no thresholds exceeded', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 25) // Below threshold 50

        const exceeded = await PressurePointsService.getExceededThresholds()

        expect(exceeded.filter(p => p.seed_id === testSeedId && p.automation_id === testAutomationId)).toEqual([])
      })

      it('should handle pressure exactly at threshold (>=)', async () => {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 50) // Exactly at threshold

        const exceeded = await PressurePointsService.getExceededThresholds()

        expect(exceeded.some(p => p.seed_id === testSeedId && p.automation_id === testAutomationId)).toBe(true)
      })

      it('should work with custom automation thresholds', async () => {
        const lowAuto = new LowThresholdAutomation()
        const lowAutoId = await createTestAutomation(lowAuto)
        const highAuto = new HighThresholdAutomation()
        const highAutoId = await createTestAutomation(highAuto)

        try {
          await PressurePointsService.addPressure(testSeedId, lowAutoId, 15) // Exceeds low threshold 10
          await PressurePointsService.addPressure(testSeedId, highAutoId, 75) // Below high threshold 80

          const exceeded = await PressurePointsService.getExceededThresholds()

          expect(exceeded.some(p => p.automation_id === lowAutoId)).toBe(true)
          expect(exceeded.some(p => p.automation_id === highAutoId)).toBe(false)
        } finally {
          await cleanupTestData(undefined, lowAutoId)
          await cleanupTestData(undefined, highAutoId)
        }
      })
    })
  })

  describe('Integration with Automation System', () => {
    it('should work with registered automations', async () => {
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result).not.toBeNull()
      expect(result?.threshold).toBe(50)
    })

    it('should work when automation not in registry', async () => {
      // Create an automation in DB but don't register it in the registry
      const automationId = uuidv4()
      mockDb.automations.set(automationId, {
        id: automationId,
        name: 'unregistered-automation-3',
        description: 'Not in registry',
        handler_fn_name: 'unregistered3',
        enabled: true,
        created_at: new Date(),
      })
      
      const pressureKey = getPressureKey(testSeedId, automationId)
      mockDb.pressure_points.set(pressureKey, {
        seed_id: testSeedId,
        automation_id: automationId,
        pressure_amount: 25,
        last_updated: new Date(),
      })

      const result = await PressurePointsService.get(testSeedId, automationId)

      expect(result).not.toBeNull()
      expect(result?.threshold).toBeUndefined()

      // Cleanup
      await cleanupTestData(undefined, automationId)
    })

    it('should use automation\'s getPressureThreshold()', async () => {
      const lowAuto = new LowThresholdAutomation()
      const lowAutoId = await createTestAutomation(lowAuto)

      try {
        await PressurePointsService.addPressure(testSeedId, lowAutoId, 5)
        const result = await PressurePointsService.get(testSeedId, lowAutoId)

        expect(result?.threshold).toBe(10) // From LowThresholdAutomation.getPressureThreshold()
      } finally {
        await cleanupTestData(undefined, lowAutoId)
      }
    })

    it('should handle custom threshold automations correctly', async () => {
      const highAuto = new HighThresholdAutomation()
      const highAutoId = await createTestAutomation(highAuto)

      try {
        await PressurePointsService.addPressure(testSeedId, highAutoId, 75)
        const result = await PressurePointsService.get(testSeedId, highAutoId)

        expect(result?.threshold).toBe(80) // From HighThresholdAutomation.getPressureThreshold()
        expect(PressurePointsService.exceedsThreshold(result!)).toBe(false) // 75 < 80
      } finally {
        await cleanupTestData(undefined, highAutoId)
      }
    })
  })

  describe('Pressure Accumulation', () => {
    it('should accumulate correctly with multiple addPressure calls', async () => {
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 25)
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 15)
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 10)

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(50)
    })

    it('should cap pressure accumulation at 100', async () => {
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 60)
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 50)

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(100)
    })

    it('should maintain separate pressure for different automations for same seed', async () => {
      const automation2 = new LowThresholdAutomation()
      const automation2Id = await createTestAutomation(automation2)

      try {
        await PressurePointsService.addPressure(testSeedId, testAutomationId, 30)
        await PressurePointsService.addPressure(testSeedId, automation2Id, 20)

        const point1 = await PressurePointsService.get(testSeedId, testAutomationId)
        const point2 = await PressurePointsService.get(testSeedId, automation2Id)

        expect(point1?.pressure_amount).toBe(30)
        expect(point2?.pressure_amount).toBe(20)
      } finally {
        await cleanupTestData(undefined, automation2Id)
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle NaN pressure gracefully (clamps to 0)', async () => {
      const result = await PressurePointsService.addPressure(testSeedId, testAutomationId, NaN as any)

      expect(result.pressure_amount).toBe(0)
    })

    it('should handle NaN pressure when setting (clamps to 0)', async () => {
      const result = await PressurePointsService.setPressure(testSeedId, testAutomationId, NaN as any)

      expect(result.pressure_amount).toBe(0)
    })

    it('should handle pressure at exactly 0', async () => {
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 0)
      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(0)
    })

    it('should handle pressure at exactly 100', async () => {
      await PressurePointsService.setPressure(testSeedId, testAutomationId, 100)
      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(100)
    })

    it('should handle threshold at exactly 0', async () => {
      // Create automation with threshold 0
      class ZeroThresholdAutomation extends Automation {
        readonly name = 'zero-threshold'
        readonly description = 'Zero threshold'
        readonly handlerFnName = 'processZero'

        async process(seed: Seed, context: AutomationContext) {
          return { events: [] }
        }

        calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
          return 0
        }

        getPressureThreshold(): number {
          return 0
        }
      }

      const zeroAuto = new ZeroThresholdAutomation()
      const zeroAutoId = await createTestAutomation(zeroAuto)

      try {
        await PressurePointsService.addPressure(testSeedId, zeroAutoId, 1) // Above threshold 0
        const result = await PressurePointsService.get(testSeedId, zeroAutoId)

        expect(PressurePointsService.exceedsThreshold(result!)).toBe(true) // 1 >= 0
      } finally {
        await cleanupTestData(undefined, zeroAutoId)
      }
    })

    it('should handle threshold at exactly 100', async () => {
      class MaxThresholdAutomation extends Automation {
        readonly name = 'max-threshold'
        readonly description = 'Max threshold'
        readonly handlerFnName = 'processMax'

        async process(seed: Seed, context: AutomationContext) {
          return { events: [] }
        }

        calculatePressure(seed: Seed, context: AutomationContext, changes: CategoryChange[]): number {
          return 0
        }

        getPressureThreshold(): number {
          return 100
        }
      }

      const maxAuto = new MaxThresholdAutomation()
      const maxAutoId = await createTestAutomation(maxAuto)

      try {
        await PressurePointsService.addPressure(testSeedId, maxAutoId, 100) // Exactly at threshold
        const result = await PressurePointsService.get(testSeedId, maxAutoId)

        expect(PressurePointsService.exceedsThreshold(result!)).toBe(true) // 100 >= 100
      } finally {
        await cleanupTestData(undefined, maxAutoId)
      }
    })

    it('should handle pressure exactly equals threshold (should exceed)', async () => {
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 50) // Exactly at threshold 50

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(PressurePointsService.exceedsThreshold(result!)).toBe(true) // 50 >= 50
    })
  })

  describe('Real-World Scenarios', () => {
    it('should simulate category rename adding pressure to affected seeds', async () => {
      // Simulate category rename: add pressure
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 15) // Category rename adds pressure

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(15)
    })

    it('should simulate category remove adding pressure to affected seeds', async () => {
      // Simulate category remove: add high pressure
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 30) // Category remove adds high pressure

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(30)
    })

    it('should simulate category move adding pressure to affected seeds', async () => {
      // Simulate category move: add moderate pressure
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 25) // Category move adds moderate pressure

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(25)
    })

    it('should accumulate pressure from multiple category changes', async () => {
      // Simulate multiple category changes
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 10) // Rename
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 5) // Add child
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 20) // Remove

      const result = await PressurePointsService.get(testSeedId, testAutomationId)

      expect(result?.pressure_amount).toBe(35)
    })

    it('should handle pressure starting below threshold then crossing threshold', async () => {
      // Start below threshold
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 30) // Below threshold 50

      let result = await PressurePointsService.get(testSeedId, testAutomationId)
      expect(PressurePointsService.exceedsThreshold(result!)).toBe(false)

      // Add more pressure to cross threshold
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 25) // Now at 55, exceeds threshold 50

      result = await PressurePointsService.get(testSeedId, testAutomationId)
      expect(PressurePointsService.exceedsThreshold(result!)).toBe(true)
    })

    it('should handle pressure crossing threshold, then reset, then crossing again', async () => {
      // Cross threshold
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 60)

      let result = await PressurePointsService.get(testSeedId, testAutomationId)
      expect(PressurePointsService.exceedsThreshold(result!)).toBe(true)

      // Reset
      await PressurePointsService.resetPressure(testSeedId, testAutomationId)

      result = await PressurePointsService.get(testSeedId, testAutomationId)
      expect(PressurePointsService.exceedsThreshold(result!)).toBe(false)

      // Cross again
      await PressurePointsService.addPressure(testSeedId, testAutomationId, 60)

      result = await PressurePointsService.get(testSeedId, testAutomationId)
      expect(PressurePointsService.exceedsThreshold(result!)).toBe(true)
    })

    it('should handle multiple automations for same seed with independent thresholds', async () => {
      const lowAuto = new LowThresholdAutomation()
      const lowAutoId = await createTestAutomation(lowAuto)
      const highAuto = new HighThresholdAutomation()
      const highAutoId = await createTestAutomation(highAuto)

      try {
        // Both get same pressure amount
        await PressurePointsService.addPressure(testSeedId, lowAutoId, 15) // Exceeds threshold 10
        await PressurePointsService.addPressure(testSeedId, highAutoId, 15) // Below threshold 80

        const lowPoint = await PressurePointsService.get(testSeedId, lowAutoId)
        const highPoint = await PressurePointsService.get(testSeedId, highAutoId)

        expect(PressurePointsService.exceedsThreshold(lowPoint!)).toBe(true) // 15 >= 10
        expect(PressurePointsService.exceedsThreshold(highPoint!)).toBe(false) // 15 < 80
      } finally {
        await cleanupTestData(undefined, lowAutoId)
        await cleanupTestData(undefined, highAutoId)
      }
    })

    it('should handle automation with low threshold vs high threshold', async () => {
      const lowAuto = new LowThresholdAutomation()
      const lowAutoId = await createTestAutomation(lowAuto)
      const highAuto = new HighThresholdAutomation()
      const highAutoId = await createTestAutomation(highAuto)

      try {
        await PressurePointsService.addPressure(testSeedId, lowAutoId, 15) // Exceeds low threshold 10
        await PressurePointsService.addPressure(testSeedId, highAutoId, 75) // Below high threshold 80

        const exceeded = await PressurePointsService.getExceededThresholds()

        expect(exceeded.some(p => p.automation_id === lowAutoId)).toBe(true)
        expect(exceeded.some(p => p.automation_id === highAutoId)).toBe(false)
      } finally {
        await cleanupTestData(undefined, lowAutoId)
        await cleanupTestData(undefined, highAutoId)
      }
    })
  })
})
