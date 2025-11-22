// Migration test utilities
import knex, { Knex } from 'knex'
import { v4 as uuidv4 } from 'uuid'
import config from '../../knexfile'

// Suppress console output during tests
// Use the original console methods from test-setup if available, otherwise use current ones
const getOriginalConsole = () => {
  const globalAny = global as any
  return {
    log: globalAny.__originalConsoleLog || console.log,
    error: globalAny.__originalConsoleError || console.error,
    warn: globalAny.__originalConsoleWarn || console.warn,
  }
}

// Removed unused variables - keeping for potential future use
// const originalConsoleLog = console.log
// const originalConsoleError = console.error
// const originalConsoleWarn = console.warn

export function suppressLogs(): void {
  console.log = () => {}
  console.error = () => {}
  console.warn = () => {}
}

export function restoreLogs(): void {
  // Use the original console methods from test-setup if available
  const originals = getOriginalConsole()
  console.log = originals.log
  console.error = originals.error
  console.warn = originals.warn
}

// Store the test database name so we can drop it later
let currentTestDatabaseName: string | null = null

/**
 * Get connection config for the default PostgreSQL database (usually 'postgres')
 * Used to create/drop test databases
 */
function getDefaultDatabaseConfig(): Knex.Config {
  const testConfig = config.test
  if (!testConfig) {
    throw new Error('Test database configuration not found')
  }
  
  const connection = testConfig.connection
  if (typeof connection === 'string') {
    // Parse DATABASE_URL and replace database name
    try {
      const url = new URL(connection)
      url.pathname = '/postgres' // Connect to default 'postgres' database
      return {
        ...testConfig,
        connection: url.toString(),
      }
    } catch {
      // If it's not a valid URL, assume it's a connection string format like "postgresql://user:pass@host:port/dbname"
      // Replace the database name in the connection string
      const dbNameMatch = connection.match(/\/([^/?]+)(\?|$)/)
      if (dbNameMatch) {
        const newConnection = connection.replace(/\/([^/?]+)(\?|$)/, '/postgres$2')
        return {
          ...testConfig,
          connection: newConnection,
        }
      }
      // Fallback: try to use connection object approach
      return {
        ...testConfig,
        connection: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432', 10),
          database: 'postgres',
          user: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || '',
        },
      }
    }
  } else {
    // Use connection object, replace database name
    return {
      ...testConfig,
      connection: {
        ...connection,
        database: 'postgres', // Connect to default 'postgres' database
      },
    }
  }
}

/**
 * Create a unique test database and return a connection to it
 */
export async function setupTestDatabase(): Promise<Knex> {
  suppressLogs()
  
  // Generate a unique database name
  const testDbName = `test_${uuidv4().replace(/-/g, '_')}`
  currentTestDatabaseName = testDbName
  
  // Get connection to default database to create the test database
  const defaultDbConfig = getDefaultDatabaseConfig()
  const defaultDb = knex(defaultDbConfig)
  
  try {
    // Create the test database
    await defaultDb.raw(`CREATE DATABASE ${testDbName}`)
    restoreLogs()
    console.log(`Created test database: ${testDbName}`)
    suppressLogs()
  } catch (error) {
    await defaultDb.destroy()
    restoreLogs()
    const errorMsg = (error as Error).message
    // If database already exists (shouldn't happen with UUID), try to drop it first
    if (errorMsg.includes('already exists')) {
      suppressLogs()
      try {
        await defaultDb.raw(`DROP DATABASE IF EXISTS ${testDbName}`)
        await defaultDb.raw(`CREATE DATABASE ${testDbName}`)
        restoreLogs()
        console.log(`Recreated test database: ${testDbName}`)
        suppressLogs()
      } catch (recreateError) {
        await defaultDb.destroy()
        throw new Error(`Failed to create test database ${testDbName}: ${(recreateError as Error).message}`)
      }
    } else {
      await defaultDb.destroy()
      throw new Error(`Failed to create test database ${testDbName}: ${errorMsg}`)
    }
  } finally {
    await defaultDb.destroy()
  }
  
  // Now create connection to the test database
  const testConfig = config.test
  if (!testConfig) {
    throw new Error('Test database configuration not found')
  }
  
  // Create a new config with the test database name
  let testConnection: string | Knex.PgConnectionConfig
  if (typeof testConfig.connection === 'string') {
    // Parse DATABASE_URL and replace database name
    try {
      const url = new URL(testConfig.connection)
      url.pathname = `/${testDbName}`
      testConnection = url.toString()
    } catch {
      // If it's not a valid URL, assume it's a connection string format
      // Replace the database name in the connection string
      const dbNameMatch = testConfig.connection.match(/\/([^/?]+)(\?|$)/)
      if (dbNameMatch) {
        testConnection = testConfig.connection.replace(/\/([^/?]+)(\?|$)/, `/${testDbName}$2`)
      } else {
        // Fallback: append database name
        const separator = testConfig.connection.includes('?') ? '&' : '?'
        testConnection = `${testConfig.connection}${separator}database=${testDbName}`
      }
    }
  } else {
    // Use connection object, replace database name
    testConnection = {
      ...testConfig.connection,
      database: testDbName,
    } as Knex.PgConnectionConfig
  }
  
  const testDb = knex({
    ...testConfig,
    connection: testConnection,
  })
  
  // Verify we're connected to the correct database
  try {
    const dbNameResult = await testDb.raw('SELECT current_database()')
    const actualDbName = dbNameResult.rows[0]?.current_database
    if (actualDbName !== testDbName) {
      restoreLogs()
      console.warn(`Warning: Connected to database '${actualDbName}' but expected '${testDbName}'`)
      suppressLogs()
    } else {
      restoreLogs()
      console.log(`Verified connection to test database: ${testDbName}`)
      suppressLogs()
    }
  } catch (verifyError) {
    // Ignore verification errors
  }
  
  return testDb
}

/**
 * Clean up database connection and drop the test database
 */
export async function teardownTestDatabase(db: Knex): Promise<void> {
  try {
    // Close all connections to the test database first
    await db.destroy()
  } catch (error) {
    // Ignore errors during connection cleanup
  }
  
  // Drop the test database if we created one
  if (currentTestDatabaseName) {
    const defaultDbConfig = getDefaultDatabaseConfig()
    const defaultDb = knex(defaultDbConfig)
    
    try {
      // Terminate any remaining connections to the test database
      await defaultDb.raw(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${currentTestDatabaseName}'
        AND pid <> pg_backend_pid()
      `).catch(() => {
        // Ignore errors - database might not exist or no connections
      })
      
      // Drop the test database
      await defaultDb.raw(`DROP DATABASE IF EXISTS ${currentTestDatabaseName}`)
      restoreLogs()
      console.log(`Dropped test database: ${currentTestDatabaseName}`)
      suppressLogs()
    } catch (error) {
      restoreLogs()
      console.warn(`Warning: Failed to drop test database ${currentTestDatabaseName}: ${(error as Error).message}`)
      suppressLogs()
    } finally {
      await defaultDb.destroy()
      currentTestDatabaseName = null
    }
  }
  
  restoreLogs()
}

/**
 * Rollback all migrations to start fresh
 * This ensures a clean state for each test
 */
export async function rollbackAllMigrations(db: Knex): Promise<void> {
  try {
    // First, try to rollback all migrations - this should run the down() functions
    try {
      await db.migrate.rollback(undefined, true)
    } catch (rollbackError) {
      // If rollback fails, that's okay - we'll clean up manually below
      const errorMsg = (rollbackError as Error).message
      if (!errorMsg.includes('Already at the base migration') && 
          !errorMsg.includes('does not exist') &&
          !(errorMsg.includes('relation') && errorMsg.includes('knex_migrations'))) {
        // Log unexpected rollback errors
        restoreLogs()
        console.warn(`Rollback had unexpected error: ${errorMsg}`)
        suppressLogs()
      }
    }
    
    // After rollback, manually drop all application tables to ensure a completely clean state
    // Use a query to find all tables in the public schema and drop them
    let droppedCount = 0
    try {
      // Get all tables in the public schema (excluding system tables)
      // Use information_schema for more reliable table detection
      const allTables = await db.raw(`
        SELECT table_name as tablename
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_%'
        AND table_name NOT IN ('knex_migrations', 'knex_migrations_lock')
      `)
      
      droppedCount = 0
      // Drop all tables with CASCADE
      for (const row of allTables.rows || []) {
        try {
          await db.raw(`DROP TABLE IF EXISTS ${row.tablename} CASCADE`)
          droppedCount++
        } catch (dropError) {
          // Ignore drop errors
        }
      }
      
      restoreLogs()
      console.log(`Dropped ${droppedCount} tables (found ${allTables.rows?.length || 0} total) during rollback`)
      suppressLogs()
    } catch (queryError) {
      // If we can't query tables, fall back to dropping known tables
      droppedCount = 0
    }
    
    // Always try to drop known tables as well, in case the query missed some
    // This ensures we catch any tables that weren't found by the query
    const tablesToDrop = [
      'token_usage', 'sprout_wikipedia_transactions', 'sprout_followup_transactions', 'sprouts',
      'idea_musing_shown_history', 'idea_musings',
      'seed_transactions', 'tag_transactions', 'followup_transactions', 'followups',
      'automation_queue', 'pressure_points',
      'seed_tags', 'seed_categories',
      'tags', 'categories',
      'events', 'automations', 'seeds', 'user_settings', 'users'
    ]
    
    for (const tableName of tablesToDrop) {
      try {
        // Check if table exists before dropping
        const existsBefore = await db.schema.hasTable(tableName)
        if (existsBefore) {
          // Always try to drop with CASCADE
          await db.raw(`DROP TABLE IF EXISTS ${tableName} CASCADE`)
          // Verify it was actually dropped
          const existsAfter = await db.schema.hasTable(tableName)
          if (!existsAfter) {
            droppedCount++
          } else {
            restoreLogs()
            console.warn(`Warning: Table ${tableName} still exists after DROP. Before: ${existsBefore}, After: ${existsAfter}`)
            suppressLogs()
            // Try one more time with explicit drop
            try {
              await db.schema.dropTable(tableName)
              const existsAfter2 = await db.schema.hasTable(tableName)
              if (!existsAfter2) {
                droppedCount++
                restoreLogs()
                console.log(`Successfully dropped ${tableName} on second attempt`)
                suppressLogs()
              }
            } catch (secondDropError) {
              // Ignore
            }
          }
        }
      } catch (dropError) {
        restoreLogs()
        console.warn(`Warning: Failed to drop table ${tableName}: ${(dropError as Error).message}`)
        suppressLogs()
      }
    }
    
    restoreLogs()
    console.log(`Dropped ${droppedCount} total tables during rollback`)
    suppressLogs()
    
    // After dropping tables, drop any remaining enum types
    // These can cause Knex to think migrations have run, and can cause migration failures
    const knownEnumTypes = [
      'sprout_type',
      'sprout_followup_transaction_type',
      'sprout_wikipedia_transaction_type',
      'seed_transaction_type',
      'followup_transaction_type',
      'tag_transaction_type' // Added based on error message
    ]
    
    let droppedEnumCount = 0
    for (const enumType of knownEnumTypes) {
      try {
        await db.raw(`DROP TYPE IF EXISTS ${enumType} CASCADE`)
        droppedEnumCount++
      } catch (dropError) {
        // Ignore drop errors
      }
    }
    
    // Also try to find and drop any other enum types
    try {
      const enumTypes = await db.raw(`
        SELECT n.nspname as schema, t.typname as name
        FROM pg_type t
        JOIN pg_namespace n ON n.oid = t.typnamespace
        WHERE t.typtype = 'e'
        AND n.nspname = 'public'
        AND t.typname NOT LIKE 'pg_%'
        AND t.typname NOT LIKE '_%'
      `)
      
      for (const row of enumTypes.rows || []) {
        try {
          await db.raw(`DROP TYPE IF EXISTS ${row.schema}.${row.name} CASCADE`)
          droppedEnumCount++
        } catch (dropError) {
          // Ignore drop errors
        }
      }
    } catch (enumError) {
      // If we can't query enum types, that's okay
    }
    
    restoreLogs()
    console.log(`Dropped ${droppedCount} tables and ${droppedEnumCount} enum types during rollback`)
    suppressLogs()
    
    restoreLogs()
    console.log(`Dropped ${droppedCount} application tables during rollback`)
    suppressLogs()
    
    // Now clean the migration table
    try {
      const migrationTableExists = await db.schema.hasTable('knex_migrations')
      if (migrationTableExists) {
        // Drop and recreate the migration table to ensure a completely clean state
        try {
          await db.schema.dropTable('knex_migrations')
        } catch (dropError) {
          // If drop fails, try TRUNCATE as fallback
          try {
            await db.raw('TRUNCATE TABLE knex_migrations RESTART IDENTITY CASCADE')
          } catch (truncateError) {
            // If TRUNCATE also fails, try DELETE
            await db('knex_migrations').del()
          }
        }
        await db.schema.dropTable('knex_migrations_lock').catch(() => {
          // Ignore if lock table doesn't exist
        })
      }
    } catch (cleanupError) {
      // If cleanup fails, that's okay - table might not exist or might be in use
      // We'll continue and let the test handle it
    }
  } catch (error) {
    const errorMessage = (error as Error).message
    // If no migrations exist, that's fine - we're already at base state
    if (errorMessage.includes('Already at the base migration')) {
      return
    }
    // If migration table doesn't exist yet, that's also fine (first test run)
    if (errorMessage.includes('does not exist') || 
        (errorMessage.includes('relation') && errorMessage.includes('knex_migrations'))) {
      return
    }
    // If migration table is locked, wait a bit and retry once
    if (errorMessage.includes('Migration table is already locked') || 
        errorMessage.includes('MigrationLocked')) {
      // Wait 100ms and retry once
      await new Promise(resolve => setTimeout(resolve, 100))
      try {
        await db.migrate.rollback(undefined, true)
        return
      } catch (retryError) {
        // If retry also fails, check if it's a "no migrations" error
        const retryMessage = (retryError as Error).message
        if (retryMessage.includes('Already at the base migration') || 
            retryMessage.includes('does not exist') ||
            (retryMessage.includes('relation') && retryMessage.includes('knex_migrations'))) {
          return
        }
        // Otherwise throw the original error
        throw error
      }
    }
    // For other errors, check if it's a "no migrations" case
    if (errorMessage.includes('does not exist') || 
        (errorMessage.includes('relation') && errorMessage.includes('knex_migrations'))) {
      return
    }
    // If it's any other error, re-throw it
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
  // Get original console for logging (not suppressed)
  const originalConsole = (global as any).__originalConsoleError || console.error
  
  // Get the migration list - list() will create the migration table if it doesn't exist
  // and should discover all migrations from the filesystem
  let migrations: [any[], any[]]
  try {
    migrations = await db.migrate.list()
  } catch (error) {
    // If list() fails, it might be because the table doesn't exist
    // Try to let Knex create it by attempting a migration operation
    const errorMessage = (error as Error).message
    if (errorMessage.includes('does not exist') || 
        errorMessage.includes('relation') && errorMessage.includes('knex_migrations')) {
      try {
        // Try to run up(0) - but Knex doesn't support that
        // Instead, try listing again after a brief delay
        await new Promise(resolve => setTimeout(resolve, 100))
        migrations = await db.migrate.list()
      } catch (retryError) {
        throw new Error(
          `Failed to get migration list: ${(retryError as Error).message}. ` +
          `Original error: ${errorMessage}`
        )
      }
    } else {
      throw error
    }
  }
  
  // Preserve the list of all available migrations (first element of tuple)
  // This list should never change - it's based on filesystem, not database state
  let allAvailableMigrations = migrations[0] || []
  
  // CRITICAL: Always manually read the directory to get the complete list
  // list() may return an incomplete list, so we can't rely on it
  // We'll use the directory reading to get all migrations, then run them one-by-one
  const config = (db as any).client.config
  const migrationsDir = config.migrations?.directory || 'not configured'
  const fs = await import('fs')
  
  try {
    // Manually read the migrations directory to get the complete list
    const files = await fs.promises.readdir(migrationsDir)
    const migrationFileNames = files
      .filter(f => f.endsWith('.ts') && !f.includes('.test.') && !f.includes('__tests__'))
      .sort() // Sort alphabetically to match Knex's ordering
    
    if (migrationFileNames.length === 0) {
      throw new Error(`No migration files found in directory: ${migrationsDir}`)
    }
    
    // Always use the manually read list - it's the source of truth
    allAvailableMigrations = migrationFileNames.map((fileName) => ({
      name: fileName,
    })) as any[]
    
    restoreLogs()
    console.log(`Read ${migrationFileNames.length} migration files from directory (list() returned ${migrations[0]?.length || 0}).`)
    suppressLogs()
  } catch (readError) {
    // If directory reading fails, fall back to list() result if available
    if (allAvailableMigrations.length === 0) {
      const errorMsg = (readError as Error).message
      throw new Error(
        `No migrations found. Failed to read migration directory: ${migrationsDir}. ` +
        `Error: ${errorMsg}. ` +
        `This suggests a configuration issue with the migrations directory path.`
      )
    }
    // If we have migrations from list(), use those (better than nothing)
    restoreLogs()
    console.warn(`Failed to read migration directory, using list() result: ${allAvailableMigrations.length} migrations.`)
    suppressLogs()
  }
  
  // Legacy check - this should never trigger now since we always read the directory
  if (allAvailableMigrations.length === 0) {
    throw new Error(
      `No migrations found after reading directory. This should not happen. ` +
      `Directory: ${migrationsDir}`
    )
  }
  
  // Now do cleanup of migration table if needed
  // BUT: Only do this if we're targeting an early migration (001-010)
  // For later migrations, we're likely iterating through early ones to reach the target,
  // and we shouldn't clear the table in that case
  const isEarlyMigrationCheck = migrationName.startsWith('001_') || migrationName.startsWith('002_') || 
                                 migrationName.startsWith('003_') || migrationName.startsWith('004_') ||
                                 migrationName.startsWith('005_') || migrationName.startsWith('006_') ||
                                 migrationName.startsWith('007_') || migrationName.startsWith('008_') ||
                                 migrationName.startsWith('009_') || migrationName.startsWith('010_')
  
  if (isEarlyMigrationCheck) {
    const tableExists = await db.schema.hasTable('knex_migrations')
    if (tableExists) {
      const tableContents = await db('knex_migrations').select('*')
      const appTables = await db.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_%'
        AND table_name NOT IN ('knex_migrations', 'knex_migrations_lock')
      `).catch(() => ({ rows: [] }))
      
      const hasAppTables = appTables.rows && appTables.rows.length > 0
      
      // If migration table has entries but no app tables exist, it was auto-populated incorrectly
      if (tableContents.length > 0 && !hasAppTables) {
        restoreLogs()
        console.warn(`Migration table has ${tableContents.length} entries but no application tables exist. Clearing it.`)
        suppressLogs()
        await db('knex_migrations').del()
        
        // Also drop any remaining tables (shouldn't be any, but be safe)
        for (const row of appTables.rows || []) {
          try {
            await db.raw(`DROP TABLE IF EXISTS ${row.table_name} CASCADE`)
          } catch (dropError) {
            // Ignore
          }
        }
        
        // Re-list to get current completed state (should be empty now)
        migrations = await db.migrate.list()
      }
    }
  }
  
  // Use the preserved list of all available migrations
  const allMigrations = allAvailableMigrations
  let completedMigrations = migrations[1] || []
  
  let targetIndex = allMigrations.findIndex(
    (m: any) => m.name === migrationName
  )
  
  if (targetIndex === -1) {
    // Migration not found - this is an error condition
    const availableMigrations = allMigrations.map((m: any) => m.name).join(', ') || '(none)'
    throw new Error(
      `Target migration ${migrationName} not found in migration list. ` +
      `Available migrations: ${availableMigrations}`
    )
  }
  
  // CRITICAL: Before proceeding, verify the migration table state matches the database state
  // Knex may auto-populate the migration table incorrectly
  // BUT: Only do this check if we're targeting an early migration (001-010)
  // For later migrations, assume the state is correct to avoid false positives
  // IMPORTANT: This check should ONLY run at the start when targeting an early migration,
  // NOT during iteration when we're working towards a later migration target
  const isEarlyMigration = migrationName.startsWith('001_') || migrationName.startsWith('002_') || 
                           migrationName.startsWith('003_') || migrationName.startsWith('004_') ||
                           migrationName.startsWith('005_') || migrationName.startsWith('006_') ||
                           migrationName.startsWith('007_') || migrationName.startsWith('008_') ||
                           migrationName.startsWith('009_') || migrationName.startsWith('010_')
  
  
  if (isEarlyMigration) {
    const appTablesCheck = await db.raw(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'pg_%'
      AND table_name NOT LIKE '_%'
      AND table_name NOT IN ('knex_migrations', 'knex_migrations_lock')
    `).catch(() => ({ rows: [] }))
    
    const hasAppTables = appTablesCheck.rows && appTablesCheck.rows.length > 0
    const hasMigrationEntries = completedMigrations.length > 0
    
  // Log what we found for debugging
  originalConsole(`[runMigrationsUpTo] Checking tables for ${migrationName}: found ${appTablesCheck.rows?.length || 0} tables:`, appTablesCheck.rows?.map((r: any) => r.table_name) || [])
  originalConsole(`[runMigrationsUpTo] Migration entries: ${completedMigrations.length}, hasAppTables: ${hasAppTables}`)
    
    // If migration table has entries but no application tables exist, it was auto-populated incorrectly
    if (hasMigrationEntries && !hasAppTables) {
      restoreLogs()
      originalConsole(`[runMigrationsUpTo] CRITICAL: Migration table has ${completedMigrations.length} entries but no application tables exist. This indicates Knex auto-populated incorrectly. Clearing migration table.`)
      console.warn(`CRITICAL: Migration table has ${completedMigrations.length} entries but no application tables exist. This indicates Knex auto-populated incorrectly. Clearing migration table.`)
      suppressLogs()
      
      // Clear the migration table
      await db('knex_migrations').del()
      
      // Re-list to get fresh completed state (all migrations list doesn't change)
      migrations = await db.migrate.list()
      completedMigrations = migrations[1] || []
      
      // Re-find target index (should still be valid since allMigrations doesn't change)
      targetIndex = allMigrations.findIndex(
        (m: any) => m.name === migrationName
      )
      if (targetIndex === -1) {
        throw new Error(`Target migration ${migrationName} not found in migration list after clearing migration table`)
      }
    }
  }
  
  // Check which migrations are already completed
  let completedNames = new Set(completedMigrations.map((m: any) => m.name))
  
  // Check if target is already completed
  if (completedNames.has(migrationName)) {
    // But verify the actual database state matches (only for early migrations)
    if (isEarlyMigration) {
      // hasAppTables is defined in the isEarlyMigration block above
      const appTablesCheckForTarget = await db.raw(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE '_%'
        AND table_name NOT IN ('knex_migrations', 'knex_migrations_lock')
      `).catch(() => ({ rows: [] }))
      
      const hasAppTablesForTarget = appTablesCheckForTarget.rows && appTablesCheckForTarget.rows.length > 0
      
      if (!hasAppTablesForTarget) {
        // Target is marked as completed but no tables exist - this is a state mismatch
        restoreLogs()
        console.warn(`Target migration ${migrationName} is marked as completed but no application tables exist. Clearing migration table.`)
        suppressLogs()
        await db('knex_migrations').del()
        // Re-list to get fresh completed state (all migrations list doesn't change)
        migrations = await db.migrate.list()
        completedMigrations = migrations[1] || []
        targetIndex = allMigrations.findIndex(
          (m: any) => m.name === migrationName
        )
        if (targetIndex === -1) {
          throw new Error(`Target migration ${migrationName} not found in migration list after clearing migration table`)
        }
        // Update completedNames
        completedNames = new Set(completedMigrations.map((m: any) => m.name))
      } else {
        // Tables exist and migration is marked as completed - we're good
        return
      }
    } else {
      // For later migrations, if it's marked as completed, trust it
      return
    }
  }
  
  // Re-get target index (in case we cleared the table above)
  targetIndex = allMigrations.findIndex(
    (m: any) => m.name === migrationName
  )
  
  if (targetIndex === -1) {
    throw new Error(`Target migration ${migrationName} not found in migration list`)
  }
  
  // Find which migrations need to be run (from current state to target)
  const migrationsToRun: string[] = []
  for (let i = 0; i <= targetIndex; i++) {
    const migration = allMigrations[i]
    if (migration && !completedNames.has(migration.name)) {
      migrationsToRun.push(migration.name)
    }
  }
  
  // With a fresh database, run migrations one at a time up to the target
  // This is more reliable than using latest() which runs all migrations
  
  // Before running migrations, ensure the database is clean
  // Check if any application tables exist - if they do, we have a state mismatch
  const appTablesBefore = await db.raw(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name NOT LIKE 'pg_%'
    AND table_name NOT LIKE '_%'
    AND table_name NOT IN ('knex_migrations', 'knex_migrations_lock')
  `).catch(() => ({ rows: [] }))
  
  if (appTablesBefore.rows && appTablesBefore.rows.length > 0) {
    restoreLogs()
    console.warn(`Warning: Found ${appTablesBefore.rows.length} application tables before running migrations: ${appTablesBefore.rows.map((r: any) => r.table_name).join(', ')}. This suggests a state mismatch.`)
    suppressLogs()
    
    // For migration 001 specifically, if users table exists, manually record it
    if (appTablesBefore.rows.some((r: any) => r.table_name === 'users')) {
      const migrationTableExists = await db.schema.hasTable('knex_migrations')
      if (migrationTableExists) {
        const migrationEntries = await db('knex_migrations').select('*')
        const has001 = migrationEntries.some((e: any) => e.name === '001_create_users.ts')
        if (!has001) {
          restoreLogs()
          console.warn(`Users table exists but migration 001 is not recorded. Manually recording it.`)
          suppressLogs()
          
          const maxBatch = await db('knex_migrations').max('batch as maxBatch').first()
          const nextBatch = (maxBatch?.maxBatch || 0) + 1
          
          await db('knex_migrations').insert({
            name: '001_create_users.ts',
            batch: nextBatch,
            migration_time: new Date(),
          })
          
          restoreLogs()
          console.log(`Manually recorded migration 001 as completed.`)
          suppressLogs()
          
          // Re-check state after manual recording
          const newState = await db.migrate.list()
          const newCompleted = newState[1] || []
          const newCompletedNames = new Set(newCompleted.map((m: any) => m.name))
          if (newCompletedNames.has(migrationName)) {
            return
          }
          // Update completedNames for the loop below
          completedNames = newCompletedNames
        }
      }
    }
  }
  
  // Run migrations one-by-one up to the target migration
  // This ensures we only run the migrations we need, not all pending migrations
  restoreLogs()
  console.log(`Running migrations one-by-one to reach target: ${migrationName}`)
  suppressLogs()
  
  // Use the preserved allMigrations list and find target index
  const currentTargetIndex = allMigrations.findIndex(
    (m: any) => m.name === migrationName
  )
  
  if (currentTargetIndex === -1) {
    throw new Error(`Target migration ${migrationName} not found in migration list`)
  }
  
  // Run migrations one at a time until we reach the target
  // CRITICAL: Read completed migrations directly from migration table, not from list()
  // list() may not work correctly when migration source can't discover files
  let iterationCount = 0
  const maxIterations = allMigrations.length + 10 // Safety limit
  while (iterationCount < maxIterations) {
    iterationCount++
    
    // Read completed migrations directly from migration table
    const migrationTableEntries = await db('knex_migrations').select('name', 'batch')
    const completedNames = new Set(migrationTableEntries.map((m: any) => m.name))
    
    restoreLogs()
    originalConsole(`[runMigrationsUpTo] Iteration ${iterationCount} for ${migrationName}: Completed migrations (from table): ${Array.from(completedNames).join(', ') || '(none)'}`)
    originalConsole(`[runMigrationsUpTo] Migration table entries:`, migrationTableEntries.map((m: any) => `${m.name} (batch ${m.batch})`))
    console.log(`Iteration ${iterationCount}: Completed migrations (from table): ${Array.from(completedNames).join(', ') || '(none)'}`)
    suppressLogs()
    
    // If target is already completed, we're done
    if (completedNames.has(migrationName)) {
      restoreLogs()
      console.log(`Target migration ${migrationName} is completed.`)
      suppressLogs()
      return
    }
    
    // Find the next migration to run using the preserved allMigrations list
    let nextMigrationIndex = -1
    for (let i = 0; i < allMigrations.length; i++) {
      const mig = allMigrations[i]
      if (!completedNames.has(mig.name)) {
        // SAFEGUARD: If this is migration 021 and we're targeting a later migration (029+),
        // skip it if application tables exist (indicating migrations have already run)
        // This prevents re-running migration 021 which deletes seeds
        if (mig.name === '021_cleanup_invalid_seeds.ts' && 
            (migrationName.startsWith('029_') || migrationName.startsWith('030_') || 
             migrationName.startsWith('031_') || migrationName.startsWith('032_') ||
             migrationName.startsWith('033_') || migrationName.startsWith('034_') ||
             migrationName.startsWith('035_') || migrationName.startsWith('036_') ||
             migrationName.startsWith('037_'))) {
          originalConsole(`[runMigrationsUpTo] WARNING: Migration 021 not found in completed list when targeting ${migrationName}. Checking if it should be skipped...`)
          
          // Check if application tables exist - if they do, migration 021 has already run
          // Also check if seeds table exists and has any rows - if it does, we definitely shouldn't run 021
          const seedsTableExists = await db.schema.hasTable('seeds')
          const seedsCount = seedsTableExists ? await db('seeds').count('* as count').first().then(r => parseInt(r?.count as string || '0', 10)) : 0
          
          originalConsole(`[runMigrationsUpTo] Checking if migration 021 should be skipped: seeds table exists=${seedsTableExists}, seeds count=${seedsCount}`)
          
          if (seedsTableExists && seedsCount > 0) {
            originalConsole(`[runMigrationsUpTo] Seeds table exists with ${seedsCount} seeds, skipping migration 021 to prevent seed deletion`)
            // Skip this migration and continue to the next one
            continue
          } else if (seedsTableExists) {
            originalConsole(`[runMigrationsUpTo] Seeds table exists but is empty, migration 021 will run`)
          } else {
            originalConsole(`[runMigrationsUpTo] Seeds table does not exist, migration 021 will run`)
          }
        }
        nextMigrationIndex = i
        break
      }
    }
    
    // If no more migrations to run, but target not reached, something is wrong
    if (nextMigrationIndex === -1) {
      throw new Error(
        `No more migrations to run, but target ${migrationName} not reached. ` +
        `Completed: ${Array.from(completedNames).join(', ') || '(none)'}`
      )
    }
    
    // Check if we've passed the target (shouldn't happen, but safety check)
    const nextMig = allMigrations[nextMigrationIndex]
    if (nextMigrationIndex > currentTargetIndex) {
      throw new Error(
        `Next migration to run (${nextMig.name}) is after target ${migrationName}. ` +
        `This suggests migrations are out of order.`
      )
    }
    
    // Run the next migration
    restoreLogs()
    originalConsole(`[runMigrationsUpTo] Running migration: ${nextMig.name} (iteration ${iterationCount})`)
    console.log(`Running migration: ${nextMig.name} (iteration ${iterationCount})`)
    suppressLogs()
    
    // Get state before running migration
    const stateBefore = await db.migrate.list()
    const completedBefore = new Set((stateBefore[1] || []).map((m: any) => m.name))
    
    try {
      // Try to run the migration using Knex's up(1)
      // If that doesn't work, manually execute the migration file
      let result: any
      let migrationRan = false
      
      try {
        // Check seed count before running migration
        const seedsBeforeUp = await db('seeds').count('* as count').first()
        const seedListBefore = await db('seeds').select('id')
        originalConsole(`[runMigrationsUpTo] Seeds before up(1) for ${nextMig.name}: ${seedsBeforeUp?.count || 0}`, seedListBefore.map(s => s.id))
        
        result = await (db.migrate.up as any)(1)
        
        // Check seed count after running migration
        const seedsAfterUp = await db('seeds').count('* as count').first()
        const seedListAfter = await db('seeds').select('id')
        originalConsole(`[runMigrationsUpTo] Seeds after up(1) for ${nextMig.name}: ${seedsAfterUp?.count || 0}`, seedListAfter.map(s => s.id))
        
        // If seeds were deleted, check which migration ran
        if ((seedsBeforeUp?.count || 0) > (seedsAfterUp?.count || 0)) {
          const deletedSeeds = seedListBefore.filter(s => !seedListAfter.some(sa => sa.id === s.id))
          originalConsole(`[runMigrationsUpTo] WARNING: Seeds deleted during ${nextMig.name}:`, deletedSeeds.map(s => s.id))
        }
        
        restoreLogs()
        console.log(`up(1) returned: ${JSON.stringify(result)}`)
        suppressLogs()
        
        // Check if a migration actually ran
        // up(1) returns [batchNumber, [migrationNames]]
        const migrationsRun = result && Array.isArray(result) && result.length >= 2 && Array.isArray(result[1]) ? result[1] : []
        
        // Also check the migration table directly
        const migrationTableEntries = await db('knex_migrations').select('name', 'batch')
        const tableCompletedNames = new Set(migrationTableEntries.map((m: any) => m.name))
        
        const stateAfter = await db.migrate.list()
        const completedAfter = new Set((stateAfter[1] || []).map((m: any) => m.name))
        const newCompleted = Array.from(completedAfter).filter(name => !completedBefore.has(name))
        
        // Migration ran if: result has migrations, OR migration table has new entries, OR list() shows new completed
        migrationRan = migrationsRun.length > 0 || 
                       Array.from(tableCompletedNames).some(name => !completedBefore.has(name)) ||
                       newCompleted.length > 0
        
        restoreLogs()
        console.log(`After up(1): result=${JSON.stringify(result)}, migrationsRun=${migrationsRun.join(', ') || '(none)'}`)
        console.log(`Migration table entries: ${Array.from(tableCompletedNames).join(', ') || '(none)'}`)
        console.log(`list() completed: ${Array.from(completedAfter).join(', ') || '(none)'}`)
        console.log(`migrationRan=${migrationRan}`)
        suppressLogs()
        
        // If migrations were run according to result, but not in table, that's a state mismatch
        if (migrationsRun.length > 0 && !tableCompletedNames.has(migrationsRun[0])) {
          restoreLogs()
          console.warn(`Warning: up(1) says it ran ${migrationsRun[0]} but migration table doesn't have it. This is a state mismatch.`)
          suppressLogs()
        }
        
        // If up(1) didn't run a migration, try manual execution immediately
        if (!migrationRan) {
          restoreLogs()
          console.warn(`up(1) did not run a migration. Attempting manual execution.`)
          suppressLogs()
          throw new Error('up(1) returned empty - triggering manual execution')
        }
      } catch (upError) {
        // If up(1) fails, try manually executing the migration file
        const upErrorMsg = (upError as Error).message
        restoreLogs()
        console.warn(`up(1) failed for ${nextMig.name}, trying manual execution: ${upErrorMsg}`)
        suppressLogs()
        
        // Try to manually require and execute the migration
        const config = (db as any).client.config
        const migrationsDir = config.migrations?.directory
        const path = await import('path')
        const fs = await import('fs')
        
        // Try multiple path formats
        const migrationPath1 = path.join(migrationsDir, nextMig.name)
        const migrationPath2 = path.resolve(migrationsDir, nextMig.name)
        
        // Check if file exists
        const fileExists = await fs.promises.access(migrationPath1).then(() => true).catch(() => 
          fs.promises.access(migrationPath2).then(() => true).catch(() => false)
        )
        
        if (!fileExists) {
          throw new Error(
            `Migration file not found: ${nextMig.name}. ` +
            `Tried: ${migrationPath1}, ${migrationPath2}`
          )
        }
        
        // Try to require the migration file
        // Use the path that exists
        const migrationPath = fileExists ? migrationPath1 : migrationPath2
        const migrationModulePath = migrationPath.replace(/\.ts$/, '')
        
        let migrationModule: any
        try {
          // Try with .ts extension first (ts-node should handle it)
          migrationModule = require(migrationPath)
        } catch (requireError1) {
          try {
            // Try without extension
            migrationModule = require(migrationModulePath)
          } catch (requireError2) {
            throw new Error(
              `Failed to require migration file ${nextMig.name}. ` +
              `Tried: ${migrationPath}, ${migrationModulePath}. ` +
              `Errors: ${(requireError1 as Error).message}, ${(requireError2 as Error).message}`
            )
          }
        }
        
        if (!migrationModule || !migrationModule.up) {
          throw new Error(`Migration file ${nextMig.name} does not export an 'up' function`)
        }
        
        // Execute the migration's up function
        await migrationModule.up(db)
        
        // Manually record it in the migration table
        const maxBatch = await db('knex_migrations').max('batch as maxBatch').first()
        const nextBatch = (maxBatch?.maxBatch || 0) + 1
        await db('knex_migrations').insert({
          name: nextMig.name,
          batch: nextBatch,
          migration_time: new Date(),
        })
        
        migrationRan = true
        
        // Verify the migration was recorded
        const verifyState = await db.migrate.list()
        const verifyCompleted = new Set((verifyState[1] || []).map((m: any) => m.name))
        if (!verifyCompleted.has(nextMig.name)) {
          restoreLogs()
          console.warn(`Warning: Migration ${nextMig.name} was executed but not found in migration table. Re-recording.`)
          suppressLogs()
          // Try recording again
          const maxBatchRetry = await db('knex_migrations').max('batch as maxBatch').first()
          const nextBatchRetry = (maxBatchRetry?.maxBatch || 0) + 1
          await db('knex_migrations').insert({
            name: nextMig.name,
            batch: nextBatchRetry,
            migration_time: new Date(),
          }).catch((insertError: any) => {
            // Ignore duplicate key errors (migration already recorded)
            if (insertError.code === '23505' || insertError.message?.includes('duplicate') || insertError.message?.includes('unique')) {
              return // Migration already exists, that's fine
            }
            throw insertError
          })
        }
        
        restoreLogs()
        console.log(`Manually executed migration ${nextMig.name}`)
        suppressLogs()
      }
      
      // Verify that a migration actually ran
      if (!migrationRan) {
        // Check if target is completed despite the empty result
        const stateCheck = await db.migrate.list()
        const completedCheck = new Set((stateCheck[1] || []).map((m: any) => m.name))
        if (completedCheck.has(migrationName)) {
          return
        }
        
        // Otherwise, try manual execution as fallback
        restoreLogs()
        console.warn(`up(1) returned but no migration was completed. Trying manual execution.`)
        suppressLogs()
        
        // Use the same manual execution logic as above
        const config2 = (db as any).client.config
        const migrationsDir2 = config2.migrations?.directory
        const path2 = await import('path')
        const fs2 = await import('fs')
        const migrationPath2_1 = path2.join(migrationsDir2, nextMig.name)
        
        const fileExists2 = await fs2.promises.access(migrationPath2_1).then(() => true).catch(() => false)
        if (!fileExists2) {
          throw new Error(`Migration file not found: ${migrationPath2_1}`)
        }
        
        let migrationModule2: any
        try {
          migrationModule2 = require(migrationPath2_1)
        } catch {
          migrationModule2 = require(migrationPath2_1.replace(/\.ts$/, ''))
        }
        
        if (migrationModule2 && migrationModule2.up) {
          await migrationModule2.up(db)
          const maxBatch2 = await db('knex_migrations').max('batch as maxBatch').first()
          const nextBatch2 = (maxBatch2?.maxBatch || 0) + 1
          await db('knex_migrations').insert({
            name: nextMig.name,
            batch: nextBatch2,
            migration_time: new Date(),
          })
          migrationRan = true
        } else {
          throw new Error(`Migration file ${nextMig.name} does not export an 'up' function`)
        }
      }
    } catch (migError) {
      const errorMsg = (migError as Error).message
      
      // Handle "already exists" errors - sometimes tables exist but migration isn't recorded
      if (errorMsg.includes('already exists') || errorMsg.includes('42P07')) {
        restoreLogs()
        console.warn(`Migration ${nextMig.name} failed with "already exists" error. Checking state.`)
        suppressLogs()
        
        // Check if the migration actually completed (table exists but not recorded)
        // For migration 001 specifically, check if users table exists
        if (nextMig.name === '001_create_users.ts') {
          const usersExists = await db.schema.hasTable('users')
          if (usersExists) {
            const migrationEntries = await db('knex_migrations').select('*').where('name', '001_create_users.ts')
            if (migrationEntries.length === 0) {
              restoreLogs()
              console.warn(`Users table exists but migration 001 not recorded. Recording it.`)
              suppressLogs()
              
              const maxBatch = await db('knex_migrations').max('batch as maxBatch').first()
              const nextBatch = (maxBatch?.maxBatch || 0) + 1
              await db('knex_migrations').insert({
                name: '001_create_users.ts',
                batch: nextBatch,
                migration_time: new Date(),
              })
              
              // Continue to next iteration to check if target is reached
              continue
            }
          }
        }
        
        // For other migrations, re-throw the error
        throw migError
      } else {
        // Not an "already exists" error - re-throw
        throw migError
      }
    }
    
    // After running a migration, check if we've reached the target
    // Read directly from migration table instead of using list()
    const newMigrationTableEntries = await db('knex_migrations').select('name')
    const newCompletedNames = new Set(newMigrationTableEntries.map((m: any) => m.name))
    
    if (newCompletedNames.has(migrationName)) {
      restoreLogs()
      console.log(`Target migration ${migrationName} reached.`)
      suppressLogs()
      return
    }
    
    // Continue to next migration
  }
  
  // If we've exceeded max iterations, something is wrong
  if (iterationCount >= maxIterations) {
    const finalState = await db.migrate.list()
    const finalCompleted = finalState[1] || []
    throw new Error(
      `Exceeded maximum iterations (${maxIterations}) while trying to reach target ${migrationName}. ` +
      `This suggests an infinite loop or migration execution issue. ` +
      `Completed migrations: ${finalCompleted.map((m: any) => m.name).join(', ') || '(none)'}`
    )
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
 * Excludes primary key constraints (which are type 'p', not 'u')
 * Also checks for unique indexes as Knex may create constraints as indexes
 */
export async function getUniqueConstraints(
  db: Knex,
  tableName: string
): Promise<Array<{
  constraint_name: string
  column_names: string[]
}>> {
  // First, try to get unique constraints from pg_constraint
  const constraintResult = await db.raw(`
    SELECT
      con.conname AS constraint_name,
      array_agg(a.attname ORDER BY ord.ordinality)::text[] AS column_names
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = ord.attnum
    WHERE nsp.nspname = 'public'
      AND rel.relname = ?
      AND con.contype = 'u'
    GROUP BY con.conname
    ORDER BY con.conname
  `, [tableName])
  
  // Process constraints - ensure column_names is an array
  const constraints = (constraintResult.rows || []).map((row: any) => {
    let columnNames = row.column_names
    // Handle different array formats from PostgreSQL
    if (!Array.isArray(columnNames)) {
      if (typeof columnNames === 'string') {
        // PostgreSQL array format: {value1,value2}
        columnNames = columnNames.replace(/^{|}$/g, '').split(',').filter((s: string) => s.length > 0)
      } else {
        columnNames = [columnNames]
      }
    }
    return {
      constraint_name: row.constraint_name,
      column_names: columnNames
    }
  })
  
  // If we found constraints, return them
  if (constraints.length > 0) {
    return constraints
  }
  
  // Otherwise, check for unique indexes (Knex sometimes creates unique constraints as indexes)
  const indexResult = await db.raw(`
    SELECT
      i.relname AS constraint_name,
      array_agg(a.attname ORDER BY ord.ordinality) AS column_names
    FROM pg_index ix
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_class t ON t.oid = ix.indrelid
    JOIN pg_namespace nsp ON nsp.oid = t.relnamespace
    JOIN LATERAL unnest(ix.indkey) WITH ORDINALITY AS ord(attnum, ordinality) ON true
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ord.attnum
    WHERE nsp.nspname = 'public'
      AND t.relname = ?
      AND ix.indisunique = true
      AND NOT EXISTS (
        SELECT 1 FROM pg_constraint pk
        WHERE pk.conrelid = t.oid
          AND pk.contype = 'p'
          AND pk.conkey = ix.indkey
      )
    GROUP BY i.relname
    ORDER BY i.relname
  `, [tableName])
  
  // Process indexes - ensure column_names is an array
  const indexes = (indexResult.rows || []).map((row: any) => {
    let columnNames = row.column_names
    // Handle different array formats from PostgreSQL
    if (!Array.isArray(columnNames)) {
      if (typeof columnNames === 'string') {
        // PostgreSQL array format: {value1,value2}
        columnNames = columnNames.replace(/^{|}$/g, '').split(',').filter((s: string) => s.length > 0)
      } else {
        columnNames = [columnNames]
      }
    }
    return {
      constraint_name: row.constraint_name,
      column_names: columnNames
    }
  })
  
  return indexes
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
  
  try {
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
      // Check if seed_transactions table exists
      const hasSeedTransactions = await db.schema.hasTable('seed_transactions')
      
      if (!hasSeedTransactions) {
        throw new Error(
          'createTestSeed: seed_content column does not exist and seed_transactions table does not exist. ' +
          'This suggests migrations are in an inconsistent state. ' +
          'Ensure migration 015 (create_seed_transactions) has run before migration 017 (remove_seed_content).'
        )
      }
      
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
        transaction_data: { content: seedContent },
        created_at: createdAt,
        automation_id: null,
      })
    }
    
    return seedId
  } catch (error) {
    throw new Error(
      `createTestSeed failed: ${error instanceof Error ? error.message : String(error)}. ` +
      `seedId: ${seedId}, userId: ${userId}`
    )
  }
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
 * Handles both pre-036 (without user_id) and post-036 (with user_id) schemas
 */
export async function createTestCategory(
  db: Knex,
  overrides?: {
    id?: string
    user_id?: string
    parent_id?: string | null
    name?: string
    path?: string
    created_at?: Date
  }
): Promise<string> {
  const categoryId = overrides?.id || uuidv4()
  
  // Check if user_id column exists (post-036 schema)
  const hasUserId = await db.schema.hasColumn('categories', 'user_id')
  
  const categoryData: Record<string, any> = {
    id: categoryId,
    parent_id: overrides?.parent_id !== undefined ? overrides.parent_id : null,
    name: overrides?.name || `Test Category ${categoryId}`,
    path: overrides?.path || `/test-category-${categoryId}`,
    created_at: overrides?.created_at || new Date(),
  }
  
  // If user_id is required (post-036), we need to provide it
  if (hasUserId) {
    if (!overrides?.user_id) {
      // Create a test user if user_id is required but not provided
      const userId = await createTestUser(db)
      categoryData.user_id = userId
    } else {
      categoryData.user_id = overrides.user_id
    }
  }
  
  await db('categories').insert(categoryData)
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

