// Migration tests for migrations 021-030
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
  createTestTag,
  tableExists,
  getEnumValues,
  enumTypeExists,
} from './migration-test-helpers'

describe('Database Migrations 021-030', () => {
  let db: Knex

  beforeEach(async () => {
    db = setupTestDatabase()
    await rollbackAllMigrations(db)
  }, 30000)

  afterEach(async () => {
    await rollbackAllMigrations(db)
    await teardownTestDatabase(db)
  }, 30000)

  describe('Migration 021: cleanup_invalid_seeds', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
      await runMigrationsUpTo(db, '004_create_events.ts')
      await runMigrationsUpTo(db, '013_create_followups.ts')
    }, 30000)

    it('should delete seeds without create_seed transactions', async () => {
      const userId = await createTestUser(db)
      const validSeed = await createTestSeed(db, userId)
      const invalidSeed = await createTestSeed(db, userId)

      // Create transaction for valid seed
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: validSeed,
        transaction_type: 'create_seed',
        transaction_data: { content: 'Valid content' },
      })

      // Run migration
      await runMigrationsUpTo(db, '021_cleanup_invalid_seeds.ts')

      // Verify valid seed still exists
      const kept = await db('seeds').where({ id: validSeed }).first()
      expect(kept).toBeDefined()

      // Verify invalid seed was deleted
      const deleted = await db('seeds').where({ id: invalidSeed }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should delete seeds with invalid create_seed transaction data', async () => {
      const userId = await createTestUser(db)
      const seedWithNullData = await createTestSeed(db, userId)
      const seedWithEmptyContent = await createTestSeed(db, userId)
      const validSeed = await createTestSeed(db, userId)

      // Invalid: NULL transaction_data
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedWithNullData,
        transaction_type: 'create_seed',
        transaction_data: null as any,
      })

      // Invalid: empty content
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedWithEmptyContent,
        transaction_type: 'create_seed',
        transaction_data: { content: '' },
      })

      // Valid seed
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: validSeed,
        transaction_type: 'create_seed',
        transaction_data: { content: 'Valid content' },
      })

      // Run migration
      await runMigrationsUpTo(db, '021_cleanup_invalid_seeds.ts')

      // Verify valid seed still exists
      const kept = await db('seeds').where({ id: validSeed }).first()
      expect(kept).toBeDefined()

      // Verify invalid seeds were deleted
      const deleted1 = await db('seeds').where({ id: seedWithNullData }).first()
      const deleted2 = await db('seeds').where({ id: seedWithEmptyContent }).first()
      expect(deleted1).toBeUndefined()
      expect(deleted2).toBeUndefined()
    }, 30000)

    it('should clean up related data when deleting seeds', async () => {
      const userId = await createTestUser(db)
      const invalidSeed = await createTestSeed(db, userId)

      // Create related data
      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: invalidSeed,
        transaction_type: 'edit_content',
        transaction_data: {},
      })

      const eventId = uuidv4()
      await db('events').insert({
        id: eventId,
        seed_id: invalidSeed,
        event_type: 'ADD_TAG',
        patch_json: {},
      })

      const followupId = uuidv4()
      await db('followups').insert({
        id: followupId,
        seed_id: invalidSeed,
      })

      // Run migration
      await runMigrationsUpTo(db, '021_cleanup_invalid_seeds.ts')

      // Verify seed and related data were deleted
      expect(await db('seeds').where({ id: invalidSeed }).first()).toBeUndefined()
      expect(await db('seed_transactions').where({ id: transactionId }).first()).toBeUndefined()
      expect(await db('events').where({ id: eventId }).first()).toBeUndefined()
      expect(await db('followups').where({ id: followupId }).first()).toBeUndefined()
    }, 30000)

    it('should handle empty seeds table', async () => {
      // Don't create any seeds
      await expect(
        runMigrationsUpTo(db, '021_cleanup_invalid_seeds.ts')
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback without errors (no-op)', async () => {
      await runMigrationsUpTo(db, '021_cleanup_invalid_seeds.ts')
      await expect(db.migrate.down()).resolves.not.toThrow()
    }, 30000)
  })

  describe('Migration 022: change_add_category_to_set_category', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
    }, 30000)

    it('should update existing add_category transactions to set_category', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      // Create add_category transaction
      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: seedId,
        transaction_type: 'add_category',
        transaction_data: { category: { id: uuidv4(), name: 'test' } },
      })

      // Run migration
      await runMigrationsUpTo(db, '022_change_add_category_to_set_category.ts')

      // Verify transaction was updated
      const transaction = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(transaction?.transaction_type).toBe('set_category')
    }, 30000)

    it('should recreate enum with set_category instead of add_category', async () => {
      await runMigrationsUpTo(db, '022_change_add_category_to_set_category.ts')

      const values = await getEnumValues(db, 'seed_transaction_type')
      expect(values).toContain('set_category')
      expect(values).not.toContain('add_category')
      expect(values).toContain('create_seed')
      expect(values).toContain('edit_content')
    }, 30000)

    it('should reject add_category after migration', async () => {
      await runMigrationsUpTo(db, '022_change_add_category_to_set_category.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('seed_transactions').insert({
          id: uuidv4(),
          seed_id: seedId,
          transaction_type: 'add_category' as any,
          transaction_data: {},
        })
      ).rejects.toThrow()
    }, 30000)

    it('should accept set_category after migration', async () => {
      await runMigrationsUpTo(db, '022_change_add_category_to_set_category.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('seed_transactions').insert({
          id: uuidv4(),
          seed_id: seedId,
          transaction_type: 'set_category',
          transaction_data: {},
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      // Create set_category transaction
      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: {},
      })

      await runMigrationsUpTo(db, '022_change_add_category_to_set_category.ts')
      await db.migrate.down()

      // Verify enum was restored
      const values = await getEnumValues(db, 'seed_transaction_type')
      expect(values).toContain('add_category')
      expect(values).not.toContain('set_category')

      // Verify transaction was updated back
      const transaction = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(transaction?.transaction_type).toBe('add_category')
    }, 30000)
  })

  describe('Migration 023: create_tag_transactions', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '006_create_tags.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create enum type tag_transaction_type', async () => {
      await runMigrationsUpTo(db, '023_create_tag_transactions.ts')

      const exists = await enumTypeExists(db, 'tag_transaction_type')
      expect(exists).toBe(true)

      const values = await getEnumValues(db, 'tag_transaction_type')
      expect(values).toContain('creation')
      expect(values).toContain('edit')
      expect(values).toContain('set_color')
      expect(values.length).toBe(3)
    }, 30000)

    it('should create tag_transactions table with correct schema', async () => {
      await runMigrationsUpTo(db, '023_create_tag_transactions.ts')

      const exists = await tableExists(db, 'tag_transactions')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'tag_transactions')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('tag_id')
      expect(columns.tag_id.type).toBe('uuid')
      expect(columns.tag_id.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_type')
      expect(columns.transaction_type.type).toBe('USER-DEFINED')
      expect(columns.transaction_type.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_data')
      expect(columns.transaction_data.type).toBe('jsonb')
      expect(columns.transaction_data.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
      expect(columns).toHaveProperty('automation_id')
      expect(columns.automation_id.type).toBe('uuid')
      expect(columns.automation_id.nullable).toBe(true)
    }, 30000)

    it('should have foreign keys to tags and automations', async () => {
      await runMigrationsUpTo(db, '023_create_tag_transactions.ts')

      const foreignKeys = await getForeignKeys(db, 'tag_transactions')
      const tagFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'tags' && fk.column_name === 'tag_id'
      )
      const automationFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'automations' &&
          fk.column_name === 'automation_id'
      )

      expect(tagFk).toBeDefined()
      expect(tagFk?.on_delete).toBe('CASCADE')
      expect(automationFk).toBeDefined()
      expect(automationFk?.on_delete).toBe('SET NULL')
    }, 30000)

    it('should accept valid enum values', async () => {
      await runMigrationsUpTo(db, '023_create_tag_transactions.ts')

      const tagId = await createTestTag(db)

      const validTypes = ['creation', 'edit', 'set_color']
      for (const type of validTypes) {
        await expect(
          db('tag_transactions').insert({
            id: uuidv4(),
            tag_id: tagId,
            transaction_type: type,
            transaction_data: {},
          })
        ).resolves.not.toThrow()
      }
    }, 30000)

    it('should CASCADE delete when tag is deleted', async () => {
      await runMigrationsUpTo(db, '023_create_tag_transactions.ts')

      const tagId = await createTestTag(db)
      const transactionId = uuidv4()
      await db('tag_transactions').insert({
        id: transactionId,
        tag_id: tagId,
        transaction_type: 'creation',
        transaction_data: {},
      })

      // Delete tag
      await db('tags').where({ id: tagId }).delete()

      // Verify transaction was deleted
      const deleted = await db('tag_transactions')
        .where({ id: transactionId })
        .first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '023_create_tag_transactions.ts')
      await db.migrate.down()

      const exists = await tableExists(db, 'tag_transactions')
      expect(exists).toBe(false)

      const enumExists = await enumTypeExists(db, 'tag_transaction_type')
      expect(enumExists).toBe(false)
    }, 30000)
  })

  describe('Migration 024: add_timezone_to_user_settings', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '011_create_user_settings.ts')
    }, 30000)

    it('should add timezone column', async () => {
      await runMigrationsUpTo(db, '024_add_timezone_to_user_settings.ts')

      const columns = await getTableInfo(db, 'user_settings')
      expect(columns).toHaveProperty('timezone')
      expect(columns.timezone.type).toBe('character varying')
      expect(columns.timezone.nullable).toBe(true)
    }, 30000)

    it('should not affect existing records', async () => {
      const userId = await createTestUser(db)
      const settingsId = uuidv4()
      await db('user_settings').insert({
        id: settingsId,
        user_id: userId,
        openrouter_api_key: 'test-key',
      })

      await runMigrationsUpTo(db, '024_add_timezone_to_user_settings.ts')

      const settings = await db('user_settings').where({ id: settingsId }).first()
      expect(settings?.openrouter_api_key).toBe('test-key')
      expect(settings?.timezone).toBeNull()
    }, 30000)

    it('should allow IANA timezone string', async () => {
      await runMigrationsUpTo(db, '024_add_timezone_to_user_settings.ts')

      const userId = await createTestUser(db)
      await expect(
        db('user_settings').insert({
          id: uuidv4(),
          user_id: userId,
          timezone: 'America/New_York',
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '024_add_timezone_to_user_settings.ts')
      await db.migrate.down()

      const columns = await getTableInfo(db, 'user_settings')
      expect(columns).not.toHaveProperty('timezone')
    }, 30000)
  })

  describe('Migration 025: create_idea_musings', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
    }, 30000)

    it('should create idea_musings table with correct schema', async () => {
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')

      const exists = await tableExists(db, 'idea_musings')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'idea_musings')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('template_type')
      expect(columns.template_type.type).toBe('character varying')
      expect(columns.template_type.nullable).toBe(false)
      expect(columns).toHaveProperty('content')
      expect(columns.content.type).toBe('jsonb')
      expect(columns.content.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
      expect(columns).toHaveProperty('dismissed')
      expect(columns.dismissed.type).toBe('boolean')
      expect(columns.dismissed.nullable).toBe(false)
      expect(columns).toHaveProperty('dismissed_at')
      expect(columns.dismissed_at.type).toBe('timestamp without time zone')
      expect(columns.dismissed_at.nullable).toBe(true)
    }, 30000)

    it('should default dismissed to false', async () => {
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const musingId = uuidv4()
      await db('idea_musings').insert({
        id: musingId,
        seed_id: seedId,
        template_type: 'numbered_ideas',
        content: {},
      })

      const musing = await db('idea_musings').where({ id: musingId }).first()
      expect(musing?.dismissed).toBe(false)
    }, 30000)

    it('should have foreign key to seeds', async () => {
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')

      const foreignKeys = await getForeignKeys(db, 'idea_musings')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')

      const indexes = await getIndexes(db, 'idea_musings')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('dismissed'))
      ).toBe(true)
    }, 30000)

    it('should CASCADE delete when seed is deleted', async () => {
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const musingId = uuidv4()
      await db('idea_musings').insert({
        id: musingId,
        seed_id: seedId,
        template_type: 'numbered_ideas',
        content: {},
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify musing was deleted
      const deleted = await db('idea_musings').where({ id: musingId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')
      await db.migrate.down()

      const exists = await tableExists(db, 'idea_musings')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 026: create_idea_musing_shown_history', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
    }, 30000)

    it('should create idea_musing_shown_history table with correct schema', async () => {
      await runMigrationsUpTo(db, '026_create_idea_musing_shown_history.ts')

      const exists = await tableExists(db, 'idea_musing_shown_history')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'idea_musing_shown_history')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('shown_date')
      expect(columns.shown_date.type).toBe('date')
      expect(columns.shown_date.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have foreign key to seeds', async () => {
      await runMigrationsUpTo(db, '026_create_idea_musing_shown_history.ts')

      const foreignKeys = await getForeignKeys(db, 'idea_musing_shown_history')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '026_create_idea_musing_shown_history.ts')

      const indexes = await getIndexes(db, 'idea_musing_shown_history')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('shown_date'))
      ).toBe(true)
      // Check for composite index
      expect(
        indexNames.some(
          (name) => name.includes('seed_id') && name.includes('shown_date')
        )
      ).toBe(true)
    }, 30000)

    it('should allow multiple history entries for same seed', async () => {
      await runMigrationsUpTo(db, '026_create_idea_musing_shown_history.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await db('idea_musing_shown_history').insert({
        id: uuidv4(),
        seed_id: seedId,
        shown_date: '2024-01-01',
      })

      await expect(
        db('idea_musing_shown_history').insert({
          id: uuidv4(),
          seed_id: seedId,
          shown_date: '2024-01-02',
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '026_create_idea_musing_shown_history.ts')
      await db.migrate.down()

      const exists = await tableExists(db, 'idea_musing_shown_history')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 027: add_completed_to_idea_musings', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')
    }, 30000)

    it('should add completed and completed_at columns', async () => {
      await runMigrationsUpTo(db, '027_add_completed_to_idea_musings.ts')

      const columns = await getTableInfo(db, 'idea_musings')
      expect(columns).toHaveProperty('completed')
      expect(columns.completed.type).toBe('boolean')
      expect(columns.completed.nullable).toBe(false)
      expect(columns).toHaveProperty('completed_at')
      expect(columns.completed_at.type).toBe('timestamp without time zone')
      expect(columns.completed_at.nullable).toBe(true)
    }, 30000)

    it('should default completed to false for existing records', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const musingId = uuidv4()
      await db('idea_musings').insert({
        id: musingId,
        seed_id: seedId,
        template_type: 'numbered_ideas',
        content: {},
      })

      await runMigrationsUpTo(db, '027_add_completed_to_idea_musings.ts')

      const musing = await db('idea_musings').where({ id: musingId }).first()
      expect(musing?.completed).toBe(false)
      expect(musing?.completed_at).toBeNull()
    }, 30000)

    it('should have index on completed', async () => {
      await runMigrationsUpTo(db, '027_add_completed_to_idea_musings.ts')

      const indexes = await getIndexes(db, 'idea_musings')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('completed'))
      ).toBe(true)
    }, 30000)

    it('should allow setting completed with completed_at', async () => {
      await runMigrationsUpTo(db, '027_add_completed_to_idea_musings.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const musingId = uuidv4()
      await db('idea_musings').insert({
        id: musingId,
        seed_id: seedId,
        template_type: 'numbered_ideas',
        content: {},
        completed: true,
        completed_at: new Date(),
      })

      const musing = await db('idea_musings').where({ id: musingId }).first()
      expect(musing?.completed).toBe(true)
      expect(musing?.completed_at).not.toBeNull()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '027_add_completed_to_idea_musings.ts')
      await db.migrate.down()

      const columns = await getTableInfo(db, 'idea_musings')
      expect(columns).not.toHaveProperty('completed')
      expect(columns).not.toHaveProperty('completed_at')
    }, 30000)
  })

  describe('Migration 028: add_seed_slug', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
    }, 30000)

    it('should add slug column', async () => {
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).toHaveProperty('slug')
      expect(columns.slug.type).toBe('character varying')
      expect(columns.slug.nullable).toBe(true)
    }, 30000)

    it('should have unique constraint on slug', async () => {
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')

      const uniqueConstraints = await getUniqueConstraints(db, 'seeds')
      const slugUnique = uniqueConstraints.find(
        (uc) => uc.column_names.length === 1 && uc.column_names[0] === 'slug'
      )
      expect(slugUnique).toBeDefined()
    }, 30000)

    it('should have index on slug', async () => {
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')

      const indexes = await getIndexes(db, 'seeds')
      const slugIndex = indexes.find((idx) =>
        idx.indexdef.toLowerCase().includes('slug')
      )
      expect(slugIndex).toBeDefined()
    }, 30000)

    it('should reject duplicate slug', async () => {
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')

      const userId = await createTestUser(db)
      const seedId1 = await createTestSeed(db, userId)
      const seedId2 = await createTestSeed(db, userId)

      await db('seeds').where({ id: seedId1 }).update({ slug: 'test-slug' })

      await expect(
        db('seeds').where({ id: seedId2 }).update({ slug: 'test-slug' })
      ).rejects.toThrow()
    }, 30000)

    it('should allow multiple NULL slugs', async () => {
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')

      const userId = await createTestUser(db)
      const seedId1 = await createTestSeed(db, userId)
      const seedId2 = await createTestSeed(db, userId)

      // Both should have NULL slug
      const seed1 = await db('seeds').where({ id: seedId1 }).first()
      const seed2 = await db('seeds').where({ id: seedId2 }).first()
      expect(seed1?.slug).toBeNull()
      expect(seed2?.slug).toBeNull()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')
      await db.migrate.down()

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).not.toHaveProperty('slug')
    }, 30000)
  })

  describe('Migration 029: backfill_seed_slugs', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
      await runMigrationsUpTo(db, '028_add_seed_slug.ts')
    }, 30000)

    it('should generate slugs for seeds without slugs', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      // Create create_seed transaction with content
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'create_seed',
        transaction_data: { content: 'This is test seed content for slug generation' },
      })

      // Verify seed has no slug
      let seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).toBeNull()

      // Run migration
      await runMigrationsUpTo(db, '029_backfill_seed_slugs.ts')

      // Verify slug was generated
      seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).not.toBeNull()
      expect(seed?.slug).toMatch(/^[a-f0-9]{7}\//)
    }, 30000)

    it('should skip seeds without create_seed transactions', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      // Don't create create_seed transaction

      // Run migration
      await runMigrationsUpTo(db, '029_backfill_seed_slugs.ts')

      // Verify seed still has no slug
      const seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).toBeNull()
    }, 30000)

    it('should skip seeds with empty content', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      // Create create_seed transaction with empty content
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'create_seed',
        transaction_data: { content: '' },
      })

      // Run migration
      await runMigrationsUpTo(db, '029_backfill_seed_slugs.ts')

      // Verify seed still has no slug
      const seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).toBeNull()
    }, 30000)

    it('should use UUID prefix in slug', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const uuidPrefix = seedId.substring(0, 7)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'create_seed',
        transaction_data: { content: 'Test content' },
      })

      await runMigrationsUpTo(db, '029_backfill_seed_slugs.ts')

      const seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).toMatch(new RegExp(`^${uuidPrefix}/`))
    }, 30000)

    it('should rollback correctly', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'create_seed',
        transaction_data: { content: 'Test content' },
      })

      await runMigrationsUpTo(db, '029_backfill_seed_slugs.ts')

      // Verify slug was set
      let seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).not.toBeNull()

      // Rollback
      await db.migrate.down()

      // Verify slug was set to NULL
      seed = await db('seeds').where({ id: seedId }).first()
      expect(seed?.slug).toBeNull()
    }, 30000)
  })

  describe('Migration 030: create_sprouts', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create enum type sprout_type', async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')

      const exists = await enumTypeExists(db, 'sprout_type')
      expect(exists).toBe(true)

      const values = await getEnumValues(db, 'sprout_type')
      expect(values).toContain('followup')
      expect(values).toContain('musing')
      expect(values).toContain('extra_context')
      expect(values).toContain('fact_check')
      expect(values.length).toBe(4)
    }, 30000)

    it('should create sprouts table with correct schema', async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')

      const exists = await tableExists(db, 'sprouts')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'sprouts')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
      expect(columns).toHaveProperty('sprout_type')
      expect(columns.sprout_type.type).toBe('USER-DEFINED')
      expect(columns.sprout_type.nullable).toBe(false)
      expect(columns).toHaveProperty('sprout_data')
      expect(columns.sprout_data.type).toBe('jsonb')
      expect(columns.sprout_data.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
      expect(columns).toHaveProperty('automation_id')
      expect(columns.automation_id.type).toBe('uuid')
      expect(columns.automation_id.nullable).toBe(true)
    }, 30000)

    it('should have foreign keys to seeds and automations', async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')

      const foreignKeys = await getForeignKeys(db, 'sprouts')
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
      await runMigrationsUpTo(db, '030_create_sprouts.ts')

      const indexes = await getIndexes(db, 'sprouts')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('sprout_type'))
      ).toBe(true)
      // Check for composite index
      expect(
        indexNames.some(
          (name) => name.includes('seed_id') && name.includes('created_at')
        )
      ).toBe(true)
    }, 30000)

    it('should accept valid enum values', async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const validTypes = ['followup', 'musing', 'extra_context', 'fact_check']
      for (const type of validTypes) {
        await expect(
          db('sprouts').insert({
            id: uuidv4(),
            seed_id: seedId,
            sprout_type: type,
            sprout_data: {},
          })
        ).resolves.not.toThrow()
      }
    }, 30000)

    it('should CASCADE delete when seed is deleted', async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const sproutId = uuidv4()
      await db('sprouts').insert({
        id: sproutId,
        seed_id: seedId,
        sprout_type: 'followup',
        sprout_data: {},
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify sprout was deleted
      const deleted = await db('sprouts').where({ id: sproutId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')
      await db.migrate.down()

      const exists = await tableExists(db, 'sprouts')
      expect(exists).toBe(false)

      const enumExists = await enumTypeExists(db, 'sprout_type')
      expect(enumExists).toBe(false)
    }, 30000)
  })
})


