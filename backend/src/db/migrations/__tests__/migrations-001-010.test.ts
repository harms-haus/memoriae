// Migration tests for migrations 001-010
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import type { Knex } from 'knex'
import {
  setupTestDatabase,
  teardownTestDatabase,
  rollbackAllMigrations,
  runMigrationsUpTo,
  getTableInfo,
  getIndexes,
  getForeignKeys,
  getPrimaryKey,
  getUniqueConstraints,
  createTestUser,
  createTestSeed,
  createTestAutomation,
  createTestCategory,
  createTestTag,
  tableExists,
} from './migration-test-helpers'

describe('Database Migrations 001-010', () => {
  let db: Knex

  beforeEach(async () => {
    db = setupTestDatabase()
    await rollbackAllMigrations(db)
  }, 30000)

  afterEach(async () => {
    await rollbackAllMigrations(db)
    await teardownTestDatabase(db)
  }, 30000)

  describe('Migration 001: create_users', () => {
    it('should create users table with correct schema', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const exists = await tableExists(db, 'users')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'users')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('email')
      expect(columns.email.type).toBe('character varying')
      expect(columns.email.nullable).toBe(false)
      expect(columns).toHaveProperty('name')
      expect(columns.name.type).toBe('character varying')
      expect(columns.name.nullable).toBe(false)
      expect(columns).toHaveProperty('provider')
      expect(columns.provider.type).toBe('character varying')
      expect(columns.provider.nullable).toBe(false)
      expect(columns).toHaveProperty('provider_id')
      expect(columns.provider_id.type).toBe('character varying')
      expect(columns.provider_id.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const primaryKey = await getPrimaryKey(db, 'users')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have unique constraint on email', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const uniqueConstraints = await getUniqueConstraints(db, 'users')
      const emailUnique = uniqueConstraints.find(
        (uc) => uc.column_names.length === 1 && uc.column_names[0] === 'email'
      )
      expect(emailUnique).toBeDefined()
    }, 30000)

    it('should have composite unique constraint on [provider, provider_id]', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const uniqueConstraints = await getUniqueConstraints(db, 'users')
      const compositeUnique = uniqueConstraints.find(
        (uc) =>
          uc.column_names.length === 2 &&
          uc.column_names.includes('provider') &&
          uc.column_names.includes('provider_id')
      )
      expect(compositeUnique).toBeDefined()
    }, 30000)

    it('should reject duplicate email', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const email = 'duplicate@example.com'
      await createTestUser(db, { email })

      await expect(
        createTestUser(db, { email, provider_id: 'different-id' })
      ).rejects.toThrow()
    }, 30000)

    it('should reject duplicate [provider, provider_id] combination', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const provider = 'google'
      const providerId = 'same-provider-id'
      await createTestUser(db, { provider, provider_id: providerId })

      await expect(
        createTestUser(db, {
          email: 'different@example.com',
          provider,
          provider_id: providerId,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should allow same email with different provider', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      const email = 'same@example.com'
      await createTestUser(db, { email, provider: 'google' })

      // Should succeed with different provider
      await expect(
        createTestUser(db, {
          email,
          provider: 'github',
          provider_id: 'different-id',
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should reject NULL values in required fields', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')

      await expect(
        db('users').insert({
          id: uuidv4(),
          email: null,
          name: 'Test',
          provider: 'google',
          provider_id: 'test-id',
        })
      ).rejects.toThrow()

      await expect(
        db('users').insert({
          id: uuidv4(),
          email: 'test@example.com',
          name: null,
          provider: 'google',
          provider_id: 'test-id',
        })
      ).rejects.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      // Rollback the last batch (should be just this migration since runMigrationsUpTo runs them individually)
      await db.migrate.rollback()

      const exists = await tableExists(db, 'users')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 002: create_seeds', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
    }, 30000)

    it('should create seeds table with correct schema', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      const exists = await tableExists(db, 'seeds')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('user_id')
      expect(columns.user_id.type).toBe('uuid')
      expect(columns.user_id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_content')
      expect(columns.seed_content.type).toBe('text')
      expect(columns.seed_content.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      const primaryKey = await getPrimaryKey(db, 'seeds')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign key to users table', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      const foreignKeys = await getForeignKeys(db, 'seeds')
      const userFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'users' && fk.column_name === 'user_id'
      )
      expect(userFk).toBeDefined()
      expect(userFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have indexes on user_id and created_at', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      const indexes = await getIndexes(db, 'seeds')
      const userIdIndex = indexes.find((idx) =>
        idx.indexdef.toLowerCase().includes('user_id')
      )
      const createdAtIndex = indexes.find((idx) =>
        idx.indexdef.toLowerCase().includes('created_at')
      )

      expect(userIdIndex).toBeDefined()
      expect(createdAtIndex).toBeDefined()
    }, 30000)

    it('should reject seed with non-existent user_id', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      await expect(
        db('seeds').insert({
          id: uuidv4(),
          user_id: uuidv4(), // Non-existent user
          seed_content: 'Test',
        })
      ).rejects.toThrow()
    }, 30000)

    it('should CASCADE delete seeds when user is deleted', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      // Verify seed exists
      const seed = await db('seeds').where({ id: seedId }).first()
      expect(seed).toBeDefined()

      // Delete user
      await db('users').where({ id: userId }).delete()

      // Verify seed was deleted
      const deletedSeed = await db('seeds').where({ id: seedId }).first()
      expect(deletedSeed).toBeUndefined()
    }, 30000)

    it('should allow empty seed_content', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')

      const userId = await createTestUser(db)
      await expect(
        createTestSeed(db, userId, { seed_content: '' })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'seeds')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 003: create_automations', () => {
    it('should create automations table with correct schema', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')

      const exists = await tableExists(db, 'automations')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'automations')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('name')
      expect(columns.name.type).toBe('character varying')
      expect(columns.name.nullable).toBe(false)
      expect(columns).toHaveProperty('description')
      expect(columns.description.type).toBe('text')
      expect(columns.description.nullable).toBe(true)
      expect(columns).toHaveProperty('handler_fn_name')
      expect(columns.handler_fn_name.type).toBe('character varying')
      expect(columns.handler_fn_name.nullable).toBe(false)
      expect(columns).toHaveProperty('enabled')
      expect(columns.enabled.type).toBe('boolean')
      expect(columns.enabled.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')

      const primaryKey = await getPrimaryKey(db, 'automations')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have unique constraint on name', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')

      const uniqueConstraints = await getUniqueConstraints(db, 'automations')
      const nameUnique = uniqueConstraints.find(
        (uc) => uc.column_names.length === 1 && uc.column_names[0] === 'name'
      )
      expect(nameUnique).toBeDefined()
    }, 30000)

    it('should default enabled to true', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')

      const automationId = await createTestAutomation(db)
      const automation = await db('automations').where({ id: automationId }).first()
      expect(automation?.enabled).toBe(true)
    }, 30000)

    it('should reject duplicate name', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')

      const name = 'duplicate-automation'
      await createTestAutomation(db, { name })

      await expect(createTestAutomation(db, { name })).rejects.toThrow()
    }, 30000)

    it('should allow NULL description', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')

      await expect(
        createTestAutomation(db, { description: null as string | null })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '003_create_automations.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'automations')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 004: create_events', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create events table with correct schema', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const exists = await tableExists(db, 'events')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'events')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('event_type')
      expect(columns.event_type.type).toBe('character varying')
      expect(columns.event_type.nullable).toBe(false)
      expect(columns).toHaveProperty('patch_json')
      expect(columns.patch_json.type).toBe('jsonb')
      expect(columns.patch_json.nullable).toBe(false)
      expect(columns).toHaveProperty('enabled')
      expect(columns.enabled.type).toBe('boolean')
      expect(columns.enabled.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
      expect(columns).toHaveProperty('automation_id')
      expect(columns.automation_id.type).toBe('uuid')
      expect(columns.automation_id.nullable).toBe(true)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const primaryKey = await getPrimaryKey(db, 'events')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign keys to seeds and automations', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const foreignKeys = await getForeignKeys(db, 'events')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      const automationFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'automations' &&
          fk.column_name === 'automation_id'
      )

      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
      expect(automationFk).toBeDefined()
      expect(automationFk?.on_delete).toBe('SET NULL')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const indexes = await getIndexes(db, 'events')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('enabled'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      // Check for composite index
      expect(
        indexNames.some(
          (name) =>
            name.includes('seed_id') &&
            name.includes('enabled') &&
            name.includes('created_at')
        )
      ).toBe(true)
    }, 30000)

    it('should default enabled to true', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const eventId = uuidv4()
      await db('events').insert({
        id: eventId,
        seed_id: seedId,
        event_type: 'ADD_TAG',
        patch_json: { op: 'add', path: '/tags/0', value: { id: 'tag-1', name: 'test' } },
      })

      const event = await db('events').where({ id: eventId }).first()
      expect(event?.enabled).toBe(true)
    }, 30000)

    it('should reject event with non-existent seed_id', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      await expect(
        db('events').insert({
          id: uuidv4(),
          seed_id: uuidv4(), // Non-existent seed
          event_type: 'ADD_TAG',
          patch_json: {},
        })
      ).rejects.toThrow()
    }, 30000)

    it('should allow NULL automation_id', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('events').insert({
          id: uuidv4(),
          seed_id: seedId,
          event_type: 'ADD_TAG',
          patch_json: {},
          automation_id: null,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should allow valid automation_id', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      await expect(
        db('events').insert({
          id: uuidv4(),
          seed_id: seedId,
          event_type: 'ADD_TAG',
          patch_json: {},
          automation_id: automationId,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should CASCADE delete events when seed is deleted', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const eventId = uuidv4()
      await db('events').insert({
        id: eventId,
        seed_id: seedId,
        event_type: 'ADD_TAG',
        patch_json: {},
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify event was deleted
      const deletedEvent = await db('events').where({ id: eventId }).first()
      expect(deletedEvent).toBeUndefined()
    }, 30000)

    it('should SET NULL automation_id when automation is deleted', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      const eventId = uuidv4()
      await db('events').insert({
        id: eventId,
        seed_id: seedId,
        event_type: 'ADD_TAG',
        patch_json: {},
        automation_id: automationId,
      })

      // Delete automation
      await db('automations').where({ id: automationId }).delete()

      // Verify automation_id was set to NULL
      const event = await db('events').where({ id: eventId }).first()
      expect(event?.automation_id).toBeNull()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '004_create_events.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'events')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 005: create_categories', () => {
    it('should create categories table with correct schema', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      const exists = await tableExists(db, 'categories')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'categories')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('parent_id')
      expect(columns.parent_id.type).toBe('uuid')
      expect(columns.parent_id.nullable).toBe(true)
      expect(columns).toHaveProperty('name')
      expect(columns.name.type).toBe('character varying')
      expect(columns.name.nullable).toBe(false)
      expect(columns).toHaveProperty('path')
      expect(columns.path.type).toBe('character varying')
      expect(columns.path.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      const primaryKey = await getPrimaryKey(db, 'categories')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have self-referencing foreign key on parent_id', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      const foreignKeys = await getForeignKeys(db, 'categories')
      const parentFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'categories' && fk.column_name === 'parent_id'
      )
      expect(parentFk).toBeDefined()
      expect(parentFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have indexes on path and parent_id', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      const indexes = await getIndexes(db, 'categories')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('path'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('parent_id'))
      ).toBe(true)
    }, 30000)

    it('should allow root category (parent_id = NULL)', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      await expect(
        createTestCategory(db, { parent_id: null })
      ).resolves.not.toThrow()
    }, 30000)

    it('should allow child category with valid parent_id', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      const parentId = await createTestCategory(db, { parent_id: null })

      await expect(
        createTestCategory(db, { parent_id: parentId })
      ).resolves.not.toThrow()
    }, 30000)

    it('should reject child category with non-existent parent_id', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      await expect(
        createTestCategory(db, { parent_id: uuidv4() })
      ).rejects.toThrow()
    }, 30000)

    it('should CASCADE delete children when parent is deleted', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')

      const parentId = await createTestCategory(db, { parent_id: null })
      const childId = await createTestCategory(db, { parent_id: parentId })

      // Delete parent
      await db('categories').where({ id: parentId }).delete()

      // Verify child was deleted
      const deletedChild = await db('categories').where({ id: childId }).first()
      expect(deletedChild).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '005_create_categories.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'categories')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 006: create_tags', () => {
    it('should create tags table with correct schema', async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')

      const exists = await tableExists(db, 'tags')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'tags')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('name')
      expect(columns.name.type).toBe('character varying')
      expect(columns.name.nullable).toBe(false)
      expect(columns).toHaveProperty('color')
      expect(columns.color.type).toBe('character varying')
      expect(columns.color.nullable).toBe(true)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')

      const primaryKey = await getPrimaryKey(db, 'tags')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have unique constraint on name', async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')

      const uniqueConstraints = await getUniqueConstraints(db, 'tags')
      const nameUnique = uniqueConstraints.find(
        (uc) => uc.column_names.length === 1 && uc.column_names[0] === 'name'
      )
      expect(nameUnique).toBeDefined()
    }, 30000)

    it('should reject duplicate name', async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')

      const name = 'duplicate-tag'
      await createTestTag(db, { name })

      await expect(createTestTag(db, { name })).rejects.toThrow()
    }, 30000)

    it('should allow NULL color', async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')

      await expect(createTestTag(db, { color: null })).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'tags')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 007: create_seed_tags', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '006_create_tags.ts')
      await runMigrationsUpTo(db, '004_create_events.ts')
    }, 30000)

    it('should create seed_tags table with correct schema', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const exists = await tableExists(db, 'seed_tags')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'seed_tags')
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('tag_id')
      expect(columns.tag_id.type).toBe('uuid')
      expect(columns.tag_id.nullable).toBe(false)
      expect(columns).toHaveProperty('added_by_event_id')
      expect(columns.added_by_event_id.type).toBe('uuid')
      expect(columns.added_by_event_id.nullable).toBe(true)
    }, 30000)

    it('should have composite primary key on [seed_id, tag_id]', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const primaryKey = await getPrimaryKey(db, 'seed_tags')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(2)
      expect(primaryKey?.map((pk) => pk.column_name).sort()).toEqual([
        'seed_id',
        'tag_id',
      ])
    }, 30000)

    it('should have foreign keys to seeds, tags, and events', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const foreignKeys = await getForeignKeys(db, 'seed_tags')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      const tagFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'tags' && fk.column_name === 'tag_id'
      )
      const eventFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'events' &&
          fk.column_name === 'added_by_event_id'
      )

      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
      expect(tagFk).toBeDefined()
      expect(tagFk?.on_delete).toBe('CASCADE')
      expect(eventFk).toBeDefined()
      expect(eventFk?.on_delete).toBe('SET NULL')
    }, 30000)

    it('should have indexes on seed_id and tag_id', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const indexes = await getIndexes(db, 'seed_tags')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('tag_id'))
      ).toBe(true)
    }, 30000)

    it('should reject duplicate [seed_id, tag_id] combination', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const tagId = await createTestTag(db)

      await db('seed_tags').insert({
        seed_id: seedId,
        tag_id: tagId,
      })

      await expect(
        db('seed_tags').insert({
          seed_id: seedId,
          tag_id: tagId,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should allow same seed_id with different tag_id', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const tagId1 = await createTestTag(db)
      const tagId2 = await createTestTag(db)

      await db('seed_tags').insert({
        seed_id: seedId,
        tag_id: tagId1,
      })

      await expect(
        db('seed_tags').insert({
          seed_id: seedId,
          tag_id: tagId2,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should reject with non-existent seed_id', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const tagId = await createTestTag(db)

      await expect(
        db('seed_tags').insert({
          seed_id: uuidv4(), // Non-existent
          tag_id: tagId,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should allow NULL added_by_event_id', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const tagId = await createTestTag(db)

      await expect(
        db('seed_tags').insert({
          seed_id: seedId,
          tag_id: tagId,
          added_by_event_id: null,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should CASCADE delete when seed is deleted', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const tagId = await createTestTag(db)

      await db('seed_tags').insert({
        seed_id: seedId,
        tag_id: tagId,
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify junction record was deleted
      const junction = await db('seed_tags')
        .where({ seed_id: seedId, tag_id: tagId })
        .first()
      expect(junction).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'seed_tags')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 008: create_seed_categories', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '005_create_categories.ts')
      await runMigrationsUpTo(db, '004_create_events.ts')
    }, 30000)

    it('should create seed_categories table with correct schema', async () => {
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')

      const exists = await tableExists(db, 'seed_categories')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'seed_categories')
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('category_id')
      expect(columns.category_id.type).toBe('uuid')
      expect(columns.category_id.nullable).toBe(false)
      expect(columns).toHaveProperty('added_by_event_id')
      expect(columns.added_by_event_id.type).toBe('uuid')
      expect(columns.added_by_event_id.nullable).toBe(true)
    }, 30000)

    it('should have composite primary key on [seed_id, category_id]', async () => {
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')

      const primaryKey = await getPrimaryKey(db, 'seed_categories')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(2)
      expect(primaryKey?.map((pk) => pk.column_name).sort()).toEqual([
        'category_id',
        'seed_id',
      ])
    }, 30000)

    it('should have foreign keys to seeds, categories, and events', async () => {
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')

      const foreignKeys = await getForeignKeys(db, 'seed_categories')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      const categoryFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'categories' &&
          fk.column_name === 'category_id'
      )
      const eventFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'events' &&
          fk.column_name === 'added_by_event_id'
      )

      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
      expect(categoryFk).toBeDefined()
      expect(categoryFk?.on_delete).toBe('CASCADE')
      expect(eventFk).toBeDefined()
      expect(eventFk?.on_delete).toBe('SET NULL')
    }, 30000)

    it('should reject duplicate [seed_id, category_id] combination', async () => {
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_categories').insert({
        seed_id: seedId,
        category_id: categoryId,
      })

      await expect(
        db('seed_categories').insert({
          seed_id: seedId,
          category_id: categoryId,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should CASCADE delete when category is deleted', async () => {
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_categories').insert({
        seed_id: seedId,
        category_id: categoryId,
      })

      // Delete category
      await db('categories').where({ id: categoryId }).delete()

      // Verify junction record was deleted
      const junction = await db('seed_categories')
        .where({ seed_id: seedId, category_id: categoryId })
        .first()
      expect(junction).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'seed_categories')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 009: create_pressure_points', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create pressure_points table with correct schema', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const exists = await tableExists(db, 'pressure_points')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'pressure_points')
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('automation_id')
      expect(columns.automation_id.type).toBe('uuid')
      expect(columns.automation_id.nullable).toBe(false)
      expect(columns).toHaveProperty('pressure_amount')
      expect(columns.pressure_amount.type).toBe('numeric')
      expect(columns.pressure_amount.nullable).toBe(false)
      expect(columns).toHaveProperty('last_updated')
      expect(columns.last_updated.nullable).toBe(false)
    }, 30000)

    it('should have composite primary key on [seed_id, automation_id]', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const primaryKey = await getPrimaryKey(db, 'pressure_points')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(2)
      expect(primaryKey?.map((pk) => pk.column_name).sort()).toEqual([
        'automation_id',
        'seed_id',
      ])
    }, 30000)

    it('should have foreign keys to seeds and automations', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const foreignKeys = await getForeignKeys(db, 'pressure_points')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      const automationFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'automations' &&
          fk.column_name === 'automation_id'
      )

      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
      expect(automationFk).toBeDefined()
      expect(automationFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const indexes = await getIndexes(db, 'pressure_points')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('automation_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('pressure_amount'))
      ).toBe(true)
      // Check for composite index
      expect(
        indexNames.some(
          (name) =>
            name.includes('automation_id') && name.includes('pressure_amount')
        )
      ).toBe(true)
    }, 30000)

    it('should default pressure_amount to 0', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      await db('pressure_points').insert({
        seed_id: seedId,
        automation_id: automationId,
        // pressure_amount not specified
      })

      const pressurePoint = await db('pressure_points')
        .where({ seed_id: seedId, automation_id: automationId })
        .first()
      expect(Number(pressurePoint?.pressure_amount)).toBe(0)
    }, 30000)

    it('should reject duplicate [seed_id, automation_id] combination', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      await db('pressure_points').insert({
        seed_id: seedId,
        automation_id: automationId,
        pressure_amount: 10,
      })

      await expect(
        db('pressure_points').insert({
          seed_id: seedId,
          automation_id: automationId,
          pressure_amount: 20,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should allow updating existing record', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      await db('pressure_points').insert({
        seed_id: seedId,
        automation_id: automationId,
        pressure_amount: 10,
      })

      await db('pressure_points')
        .where({ seed_id: seedId, automation_id: automationId })
        .update({ pressure_amount: 50 })

      const updated = await db('pressure_points')
        .where({ seed_id: seedId, automation_id: automationId })
        .first()
      expect(Number(updated?.pressure_amount)).toBe(50)
    }, 30000)

    it('should CASCADE delete when seed is deleted', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      await db('pressure_points').insert({
        seed_id: seedId,
        automation_id: automationId,
        pressure_amount: 10,
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify pressure point was deleted
      const deleted = await db('pressure_points')
        .where({ seed_id: seedId, automation_id: automationId })
        .first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '009_create_pressure_points.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'pressure_points')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 010: create_automation_queue', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create automation_queue table with correct schema', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const exists = await tableExists(db, 'automation_queue')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'automation_queue')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('automation_id')
      expect(columns.automation_id.type).toBe('uuid')
      expect(columns.automation_id.nullable).toBe(false)
      expect(columns).toHaveProperty('priority')
      expect(columns.priority.type).toBe('integer')
      expect(columns.priority.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const primaryKey = await getPrimaryKey(db, 'automation_queue')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign keys to seeds and automations', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const foreignKeys = await getForeignKeys(db, 'automation_queue')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      const automationFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'automations' &&
          fk.column_name === 'automation_id'
      )

      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
      expect(automationFk).toBeDefined()
      expect(automationFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const indexes = await getIndexes(db, 'automation_queue')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('automation_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('priority'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      // Check for composite index
      expect(
        indexNames.some(
          (name) => name.includes('priority') && name.includes('created_at')
        )
      ).toBe(true)
    }, 30000)

    it('should default priority to 0', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      const queueId = uuidv4()
      await db('automation_queue').insert({
        id: queueId,
        seed_id: seedId,
        automation_id: automationId,
        // priority not specified
      })

      const queueEntry = await db('automation_queue').where({ id: queueId }).first()
      expect(queueEntry?.priority).toBe(0)
    }, 30000)

    it('should reject with non-existent seed_id', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const automationId = await createTestAutomation(db)

      await expect(
        db('automation_queue').insert({
          id: uuidv4(),
          seed_id: uuidv4(), // Non-existent
          automation_id: automationId,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should CASCADE delete when automation is deleted', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      const queueId = uuidv4()
      await db('automation_queue').insert({
        id: queueId,
        seed_id: seedId,
        automation_id: automationId,
      })

      // Delete automation
      await db('automations').where({ id: automationId }).delete()

      // Verify queue entry was deleted
      const deleted = await db('automation_queue').where({ id: queueId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '010_create_automation_queue.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'automation_queue')
      expect(exists).toBe(false)
    }, 30000)
  })
})

