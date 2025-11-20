// Migration test utilities
import knex, { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
import config from '../../knexfile'

// Suppress console output during tests
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn

export function suppressLogs(): void {
  console.log = () => {}
  console.error = () => {}
  console.warn = () => {}
}

export function restoreLogs(): void {
  console.log = originalConsoleLog
  console.error = originalConsoleError
  console.warn = originalConsoleWarn
}

/**
 * Create a fresh test database connection
 */
export function setupTestDatabase(): Knex {
  suppressLogs()
  const testConfig = config.test
  if (!testConfig) {
    throw new Error('Test database configuration not found')
  }
  return knex(testConfig)
}

/**
 * Clean up database connection
 */
export async function teardownTestDatabase(db: Knex): Promise<void> {
  try {
    await db.destroy()
  } catch (error) {
    // Ignore errors during teardown
  }
  restoreLogs()
}

/**
 * Rollback all migrations to start fresh
 */
export async function rollbackAllMigrations(db: Knex): Promise<void> {
  try {
    await db.migrate.rollback(undefined, true)
  } catch (error) {
    const errorMessage = (error as Error).message
    // If no migrations exist, that's fine
    if (errorMessage.includes('Already at the base migration')) {
      return
    }
    // If migration table is locked, wait a bit and retry once
    if (errorMessage.includes('Migration table is already locked') || errorMessage.includes('MigrationLocked')) {
      // Wait 100ms and retry once
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        await db.migrate.rollback(undefined, true)
        return
      } catch (retryError) {
        // If retry also fails, throw the original error
        throw error
      }
    }
    throw error
  }
}

/**
 * Run migrations up to a specific migration file
 * @param db - Database connection
 * @param migrationName - Name of the migration file (e.g., '001_create_users.ts')
 */
export async function runMigrationsUpTo(
  db: Knex,
  migrationName: string
): Promise<void> {
  const migrations = await db.migrate.list()
  const allMigrations = migrations[0] || []
  const completedMigrations = migrations[1] || []
  
  const targetIndex = allMigrations.findIndex(
    (m: any) => m.name === migrationName
  )
  
  if (targetIndex === -1) {
    // Migration not found, try running all migrations
    await db.migrate.latest()
    return
  }
  
  // Check which migrations are already completed
  const completedNames = new Set(completedMigrations.map((m: any) => m.name))
  
  // Run migrations up to (and including) the target
  // Only run migrations that haven't been completed yet
  for (let i = 0; i <= targetIndex; i++) {
    const migration = allMigrations[i]
    if (migration && !completedNames.has(migration.name)) {
      await db.migrate.up()
    }
  }
}


/**
 * Get table schema information
 */
export async function getTableInfo(
  db: Knex,
  tableName: string
): Promise<Record<string, any>> {
  return await db(tableName).columnInfo()
}

/**
 * Get all indexes for a table
 */
export async function getIndexes(
  db: Knex,
  tableName: string
): Promise<Array<{ indexname: string; indexdef: string }>> {
  const result = await db.raw(`
    SELECT indexname, indexdef 
    FROM pg_indexes 
    WHERE tablename = ?
    AND schemaname = 'public'
    ORDER BY indexname
  `, [tableName])
  return result.rows || []
}

/**
 * Get all foreign keys for a table
 */
export async function getForeignKeys(
  db: Knex,
  tableName: string
): Promise<Array<{
  constraint_name: string
  table_name: string
  column_name: string
  foreign_table_name: string
  foreign_column_name: string
  on_delete: string
  on_update: string
}>> {
  const result = await db.raw(`
    SELECT
      tc.constraint_name,
      tc.table_name,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name,
      rc.delete_rule AS on_delete,
      rc.update_rule AS on_update
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    LEFT JOIN information_schema.referential_constraints AS rc
      ON tc.constraint_name = rc.constraint_name
      AND tc.table_schema = rc.constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = ?
      AND tc.table_schema = 'public'
    ORDER BY tc.constraint_name, kcu.ordinal_position
  `, [tableName])
  return result.rows || []
}

/**
 * Get primary key constraint for a table
 */
export async function getPrimaryKey(
  db: Knex,
  tableName: string
): Promise<Array<{ column_name: string }> | null> {
  const result = await db.raw(`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ?::regclass
      AND i.indisprimary
    ORDER BY a.attnum
  `, [tableName])
  return result.rows.length > 0 ? result.rows : null
}

/**
 * Get unique constraints for a table
 */
export async function getUniqueConstraints(
  db: Knex,
  tableName: string
): Promise<Array<{
  constraint_name: string
  column_names: string[]
}>> {
  const result = await db.raw(`
    SELECT
      tc.constraint_name,
      array_agg(kcu.column_name ORDER BY kcu.ordinal_position) AS column_names
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_name = ?
      AND tc.table_schema = 'public'
    GROUP BY tc.constraint_name
    ORDER BY tc.constraint_name
  `, [tableName])
  return result.rows || []
}

/**
 * Create a test user
 */
export async function createTestUser(
  db: Knex,
  overrides?: {
    id?: string
    email?: string
    name?: string
    provider?: string
    provider_id?: string
    created_at?: Date
  }
): Promise<string> {
  const userId = overrides?.id || uuidv4()
  await db('users').insert({
    id: userId,
    email: overrides?.email || `test-${userId}@example.com`,
    name: overrides?.name || 'Test User',
    provider: overrides?.provider || 'google',
    provider_id: overrides?.provider_id || `test-provider-${userId}`,
    created_at: overrides?.created_at || new Date(),
  })
  return userId
}

/**
 * Create a test seed
 * Handles both pre-017 (with seed_content) and post-017 (transaction-based) schemas
 */
export async function createTestSeed(
  db: Knex,
  userId: string,
  overrides?: {
    id?: string
    seed_content?: string
    created_at?: Date
  }
): Promise<string> {
  const seedId = overrides?.id || uuidv4()
  const seedContent = overrides?.seed_content || 'Test seed content'
  const createdAt = overrides?.created_at || new Date()
  
  // Check if seed_content column exists (pre-017 schema)
  const hasSeedContent = await db.schema.hasColumn('seeds', 'seed_content')
  
  if (hasSeedContent) {
    // Pre-017: insert with seed_content
    await db('seeds').insert({
      id: seedId,
      user_id: userId,
      seed_content: seedContent,
      created_at: createdAt,
    })
  } else {
    // Post-017: insert seed without content, then create transaction
    await db('seeds').insert({
      id: seedId,
      user_id: userId,
      created_at: createdAt,
    })
    
    // Create the create_seed transaction
    await db('seed_transactions').insert({
      id: uuidv4(),
      seed_id: seedId,
      transaction_type: 'create_seed',
      transaction_data: db.raw('?::jsonb', [JSON.stringify({ content: seedContent })]),
      created_at: createdAt,
      automation_id: null,
    })
  }
  
  return seedId
}

/**
 * Create a test automation
 */
export async function createTestAutomation(
  db: Knex,
  overrides?: {
    id?: string
    name?: string
    description?: string | null
    handler_fn_name?: string
    enabled?: boolean
    created_at?: Date
  }
): Promise<string> {
  const automationId = overrides?.id || uuidv4()
  await db('automations').insert({
    id: automationId,
    name: overrides?.name || `test-automation-${automationId}`,
    description: overrides?.description || null,
    handler_fn_name: overrides?.handler_fn_name || 'testHandler',
    enabled: overrides?.enabled !== undefined ? overrides.enabled : true,
    created_at: overrides?.created_at || new Date(),
  })
  return automationId
}

/**
 * Create a test category
 */
export async function createTestCategory(
  db: Knex,
  overrides?: {
    id?: string
    parent_id?: string | null
    name?: string
    path?: string
    created_at?: Date
  }
): Promise<string> {
  const categoryId = overrides?.id || uuidv4()
  await db('categories').insert({
    id: categoryId,
    parent_id: overrides?.parent_id !== undefined ? overrides.parent_id : null,
    name: overrides?.name || `Test Category ${categoryId}`,
    path: overrides?.path || `/test-category-${categoryId}`,
    created_at: overrides?.created_at || new Date(),
  })
  return categoryId
}

/**
 * Create a test tag
 */
export async function createTestTag(
  db: Knex,
  overrides?: {
    id?: string
    name?: string
    color?: string | null
    created_at?: Date
  }
): Promise<string> {
  const tagId = overrides?.id || uuidv4()
  await db('tags').insert({
    id: tagId,
    name: overrides?.name || `test-tag-${tagId}`,
    color: overrides?.color !== undefined ? overrides.color : null,
    created_at: overrides?.created_at || new Date(),
  })
  return tagId
}

/**
 * Check if a table exists
 */
export async function tableExists(db: Knex, tableName: string): Promise<boolean> {
  return await db.schema.hasTable(tableName)
}

/**
 * Get enum type values
 */
export async function getEnumValues(
  db: Knex,
  enumName: string
): Promise<string[]> {
  const result = await db.raw(`
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = (
      SELECT oid 
      FROM pg_type 
      WHERE typname = ?
    )
    ORDER BY enumsortorder
  `, [enumName])
  return result.rows?.map((row: any) => row.enumlabel) || []
}

/**
 * Check if enum type exists
 */
export async function enumTypeExists(db: Knex, enumName: string): Promise<boolean> {
  const result = await db.raw(`
    SELECT EXISTS (
      SELECT 1 
      FROM pg_type 
      WHERE typname = ?
    )
  `, [enumName])
  return result.rows?.[0]?.exists === true
}

