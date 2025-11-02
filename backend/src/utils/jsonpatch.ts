// JSON Patch (RFC 6902) utility functions for event application
import { applyPatch, Operation } from 'fast-json-patch'

/**
 * Seed state structure
 */
export interface SeedState {
  seed: string
  timestamp: Date
  metadata: Record<string, unknown>
  tags?: Array<{ id: string; name: string }>
  categories?: Array<{ id: string; name: string; path: string }>
}

/**
 * Event interface for patch application
 */
export interface EventData {
  id: string
  patch_json: Operation[]
  enabled: boolean
  created_at: Date | string
}

/**
 * Allowed JSON Patch operations
 */
const ALLOWED_OPERATIONS = ['add', 'remove', 'replace']

/**
 * Allowed JSON Patch paths (prefixes)
 * - /tags/- : Add to tags array
 * - /tags/{index} : Modify/remove tag at index
 * - /categories/- : Add to categories array
 * - /categories/{index} : Modify/remove category at index
 * - /metadata : Modify metadata object
 * - /seed : Update seed content
 */
const ALLOWED_PATH_PREFIXES = [
  '/tags',
  '/categories',
  '/metadata',
  '/seed',
]

/**
 * Validate a JSON Patch operation
 * @throws Error if patch is invalid
 */
export function validatePatch(patch: Operation[]): void {
  if (!Array.isArray(patch)) {
    throw new Error('Patch must be an array of operations')
  }

  if (patch.length === 0) {
    throw new Error('Patch cannot be empty')
  }

  for (const operation of patch) {
    // Validate operation structure
    if (!operation.op || typeof operation.op !== 'string') {
      throw new Error('Operation must have a valid "op" field')
    }

    if (!operation.path || typeof operation.path !== 'string') {
      throw new Error('Operation must have a valid "path" field')
    }

    // Validate operation type
    if (!ALLOWED_OPERATIONS.includes(operation.op)) {
      throw new Error(`Operation "${operation.op}" is not allowed. Allowed operations: ${ALLOWED_OPERATIONS.join(', ')}`)
    }

    // Validate path prefix
    const isAllowed = ALLOWED_PATH_PREFIXES.some(prefix => 
      operation.path.startsWith(prefix)
    )

    if (!isAllowed) {
      throw new Error(
        `Path "${operation.path}" is not allowed. Allowed paths must start with: ${ALLOWED_PATH_PREFIXES.join(', ')}`
      )
    }

    // Validate operation-specific requirements
    const op = operation.op
    if ((op === 'add' || op === 'replace') && !('value' in operation)) {
      throw new Error(`Operation "${op}" requires a "value" field`)
    }
  }
}

/**
 * Apply events to base state to compute current state
 * Events are filtered by enabled flag and sorted chronologically
 */
export function applyEvents(baseState: SeedState, events: EventData[]): SeedState {
  // Filter enabled events and sort by creation time
  const enabledEvents = events
    .filter(e => e.enabled)
    .sort((a, b) => {
      const timeA = typeof a.created_at === 'string' ? new Date(a.created_at).getTime() : a.created_at.getTime()
      const timeB = typeof b.created_at === 'string' ? new Date(b.created_at).getTime() : b.created_at.getTime()
      return timeA - timeB
    })

  // Deep clone base state to avoid mutation
  let state: SeedState = {
    seed: baseState.seed,
    timestamp: new Date(baseState.timestamp),
    metadata: { ...baseState.metadata },
    tags: baseState.tags ? [...baseState.tags] : [],
    categories: baseState.categories ? [...baseState.categories] : [],
  }

  // Apply each event's patch operations
  for (const event of enabledEvents) {
    try {
      // Validate patch before applying
      validatePatch(event.patch_json)

      // Apply patch using fast-json-patch
      const result = applyPatch(state, event.patch_json, false, false)

      if (result) {
        state = result.newDocument as SeedState

        // Ensure metadata and arrays exist
        if (!state.metadata) {
          state.metadata = {}
        }
        if (!state.tags) {
          state.tags = []
        }
        if (!state.categories) {
          state.categories = []
        }
      }
    } catch (error) {
      // Log error but continue processing other events
      // This allows partial state recovery if one event fails
      console.error(`Failed to apply event ${event.id}:`, error)
      
      // Re-throw if it's a validation error (shouldn't happen in production)
      if (error instanceof Error && error.message.includes('not allowed')) {
        throw error
      }
    }
  }

  return state
}

/**
 * Create base state from seed content
 */
export function createBaseState(seedContent: string, createdAt: Date): SeedState {
  return {
    seed: seedContent,
    timestamp: createdAt,
    metadata: {},
    tags: [],
    categories: [],
  }
}

