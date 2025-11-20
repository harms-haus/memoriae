// Migration tests for migrations 011-020
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
  tableExists,
  getEnumValues,
  enumTypeExists,
} from './migration-test-helpers'

describe('Database Migrations 011-020', () => {
  let db: Knex

  beforeEach(async () => {
    db = setupTestDatabase()
    await rollbackAllMigrations(db)
  }, 30000)

  afterEach(async () => {
    await rollbackAllMigrations(db)
    await teardownTestDatabase(db)
  }, 30000)

  describe('Migration 011: create_user_settings', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
    }, 30000)

    it('should create user_settings table with correct schema', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const exists = await tableExists(db, 'user_settings')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'user_settings')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('user_id')
      expect(columns.user_id.type).toBe('uuid')
      expect(columns.user_id.nullable).toBe(false)
      expect(columns).toHaveProperty('openrouter_api_key')
      expect(columns.openrouter_api_key.type).toBe('character varying')
      expect(columns.openrouter_api_key.nullable).toBe(true)
      expect(columns).toHaveProperty('openrouter_model')
      expect(columns.openrouter_model.type).toBe('character varying')
      expect(columns.openrouter_model.nullable).toBe(true)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
      expect(columns).toHaveProperty('updated_at')
      expect(columns.updated_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const primaryKey = await getPrimaryKey(db, 'user_settings')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have unique constraint on user_id', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const uniqueConstraints = await getUniqueConstraints(db, 'user_settings')
      const userIdUnique = uniqueConstraints.find(
        (uc) => uc.column_names.length === 1 && uc.column_names[0] === 'user_id'
      )
      expect(userIdUnique).toBeDefined()
    }, 30000)

    it('should have foreign key to users table', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const foreignKeys = await getForeignKeys(db, 'user_settings')
      const userFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'users' && fk.column_name === 'user_id'
      )
      expect(userFk).toBeDefined()
      expect(userFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have index on user_id', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const indexes = await getIndexes(db, 'user_settings')
      const userIdIndex = indexes.find((idx) =>
        idx.indexdef.toLowerCase().includes('user_id')
      )
      expect(userIdIndex).toBeDefined()
    }, 30000)

    it('should reject duplicate user_id', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const userId = await createTestUser(db)
      await db('user_settings').insert({
        id: uuidv4(),
        user_id: userId,
      })

      await expect(
        db('user_settings').insert({
          id: uuidv4(),
          user_id: userId,
        })
      ).rejects.toThrow()
    }, 30000)

    it('should allow NULL openrouter_api_key and openrouter_model', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const userId = await createTestUser(db)
      await expect(
        db('user_settings').insert({
          id: uuidv4(),
          user_id: userId,
          openrouter_api_key: null,
          openrouter_model: null,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should reject with non-existent user_id', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      await expect(
        db('user_settings').insert({
          id: uuidv4(),
          user_id: uuidv4(), // Non-existent
        })
      ).rejects.toThrow()
    }, 30000)

    it('should CASCADE delete when user is deleted', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')

      const userId = await createTestUser(db)
      const settingsId = uuidv4()
      await db('user_settings').insert({
        id: settingsId,
        user_id: userId,
      })

      // Delete user
      await db('users').where({ id: userId }).delete()

      // Verify settings were deleted
      const deleted = await db('user_settings').where({ id: settingsId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '011_create_user_settings.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'user_settings')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 012: add_openrouter_model_name', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '011_create_user_settings.ts')
    }, 30000)

    it('should add openrouter_model_name column', async () => {
      await runMigrationsUpTo(db, '012_add_openrouter_model_name.ts')

      const columns = await getTableInfo(db, 'user_settings')
      expect(columns).toHaveProperty('openrouter_model_name')
      expect(columns.openrouter_model_name.type).toBe('character varying')
      expect(columns.openrouter_model_name.nullable).toBe(true)
    }, 30000)

    it('should not affect existing records', async () => {
      const userId = await createTestUser(db)
      const settingsId = uuidv4()
      await db('user_settings').insert({
        id: settingsId,
        user_id: userId,
        openrouter_api_key: 'test-key',
        openrouter_model: 'test-model',
      })

      await runMigrationsUpTo(db, '012_add_openrouter_model_name.ts')

      const settings = await db('user_settings').where({ id: settingsId }).first()
      expect(settings?.openrouter_api_key).toBe('test-key')
      expect(settings?.openrouter_model).toBe('test-model')
      expect(settings?.openrouter_model_name).toBeNull()
    }, 30000)

    it('should allow NULL value', async () => {
      await runMigrationsUpTo(db, '012_add_openrouter_model_name.ts')

      const userId = await createTestUser(db)
      await expect(
        db('user_settings').insert({
          id: uuidv4(),
          user_id: userId,
          openrouter_model_name: null,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should allow string value', async () => {
      await runMigrationsUpTo(db, '012_add_openrouter_model_name.ts')

      const userId = await createTestUser(db)
      await expect(
        db('user_settings').insert({
          id: uuidv4(),
          user_id: userId,
          openrouter_model_name: 'GPT-4',
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '012_add_openrouter_model_name.ts')
      await db.migrate.rollback()

      const columns = await getTableInfo(db, 'user_settings')
      expect(columns).not.toHaveProperty('openrouter_model_name')
    }, 30000)
  })

  describe('Migration 013: create_followups', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
    }, 30000)

    it('should create followups table with correct schema', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')

      const exists = await tableExists(db, 'followups')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'followups')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')

      const primaryKey = await getPrimaryKey(db, 'followups')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign key to seeds table', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')

      const foreignKeys = await getForeignKeys(db, 'followups')
      const seedFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'seeds' && fk.column_name === 'seed_id'
      )
      expect(seedFk).toBeDefined()
      expect(seedFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have index on seed_id', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')

      const indexes = await getIndexes(db, 'followups')
      const seedIdIndex = indexes.find((idx) =>
        idx.indexdef.toLowerCase().includes('seed_id')
      )
      expect(seedIdIndex).toBeDefined()
    }, 30000)

    it('should reject with non-existent seed_id', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')

      await expect(
        db('followups').insert({
          id: uuidv4(),
          seed_id: uuidv4(), // Non-existent
        })
      ).rejects.toThrow()
    }, 30000)

    it('should CASCADE delete when seed is deleted', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()
      await db('followups').insert({
        id: followupId,
        seed_id: seedId,
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify followup was deleted
      const deleted = await db('followups').where({ id: followupId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '013_create_followups.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'followups')
      expect(exists).toBe(false)
    }, 30000)
  })

  describe('Migration 014: create_followup_transactions', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '013_create_followups.ts')
    }, 30000)

    it('should create enum type followup_transaction_type', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const exists = await enumTypeExists(db, 'followup_transaction_type')
      expect(exists).toBe(true)

      const values = await getEnumValues(db, 'followup_transaction_type')
      expect(values).toContain('creation')
      expect(values).toContain('edit')
      expect(values).toContain('dismissal')
      expect(values).toContain('snooze')
      expect(values.length).toBe(4)
    }, 30000)

    it('should create followup_transactions table with correct schema', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const exists = await tableExists(db, 'followup_transactions')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'followup_transactions')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('followup_id')
      expect(columns.followup_id.type).toBe('uuid')
      expect(columns.followup_id.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_type')
      expect(columns.transaction_type.type).toBe('USER-DEFINED')
      expect(columns.transaction_type.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_data')
      expect(columns.transaction_data.type).toBe('jsonb')
      expect(columns.transaction_data.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const primaryKey = await getPrimaryKey(db, 'followup_transactions')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign key to followups table', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const foreignKeys = await getForeignKeys(db, 'followup_transactions')
      const followupFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'followups' &&
          fk.column_name === 'followup_id'
      )
      expect(followupFk).toBeDefined()
      expect(followupFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const indexes = await getIndexes(db, 'followup_transactions')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('followup_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('transaction_type'))
      ).toBe(true)
    }, 30000)

    it('should reject invalid enum value', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()
      await db('followups').insert({
        id: followupId,
        seed_id: seedId,
      })

      await expect(
        db('followup_transactions').insert({
          id: uuidv4(),
          followup_id: followupId,
          transaction_type: 'invalid_type' as any,
          transaction_data: {},
        })
      ).rejects.toThrow()
    }, 30000)

    it('should accept valid enum values', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()
      await db('followups').insert({
        id: followupId,
        seed_id: seedId,
      })

      const validTypes = ['creation', 'edit', 'dismissal', 'snooze']
      for (const type of validTypes) {
        await expect(
          db('followup_transactions').insert({
            id: uuidv4(),
            followup_id: followupId,
            transaction_type: type,
            transaction_data: {},
          })
        ).resolves.not.toThrow()
      }
    }, 30000)

    it('should CASCADE delete when followup is deleted', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()
      await db('followups').insert({
        id: followupId,
        seed_id: seedId,
      })

      const transactionId = uuidv4()
      await db('followup_transactions').insert({
        id: transactionId,
        followup_id: followupId,
        transaction_type: 'creation',
        transaction_data: {},
      })

      // Delete followup
      await db('followups').where({ id: followupId }).delete()

      // Verify transaction was deleted
      const deleted = await db('followup_transactions')
        .where({ id: transactionId })
        .first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'followup_transactions')
      expect(exists).toBe(false)

      const enumExists = await enumTypeExists(db, 'followup_transaction_type')
      expect(enumExists).toBe(false)
    }, 30000)
  })

  describe('Migration 015: create_seed_transactions', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create enum type seed_transaction_type', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const exists = await enumTypeExists(db, 'seed_transaction_type')
      expect(exists).toBe(true)

      const values = await getEnumValues(db, 'seed_transaction_type')
      expect(values).toContain('create_seed')
      expect(values).toContain('edit_content')
      expect(values).toContain('add_tag')
      expect(values).toContain('remove_tag')
      expect(values).toContain('add_category')
      expect(values).toContain('remove_category')
      expect(values).toContain('add_followup')
      expect(values.length).toBe(7)
    }, 30000)

    it('should create seed_transactions table with correct schema', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const exists = await tableExists(db, 'seed_transactions')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'seed_transactions')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('seed_id')
      expect(columns.seed_id.type).toBe('uuid')
      expect(columns.seed_id.nullable).toBe(false)
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

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const primaryKey = await getPrimaryKey(db, 'seed_transactions')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign keys to seeds and automations', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const foreignKeys = await getForeignKeys(db, 'seed_transactions')
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
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const indexes = await getIndexes(db, 'seed_transactions')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('seed_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('transaction_type'))
      ).toBe(true)
      // Check for composite index
      expect(
        indexNames.some(
          (name) => name.includes('seed_id') && name.includes('created_at')
        )
      ).toBe(true)
    }, 30000)

    it('should reject invalid enum value', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('seed_transactions').insert({
          id: uuidv4(),
          seed_id: seedId,
          transaction_type: 'invalid_type' as any,
          transaction_data: {},
        })
      ).rejects.toThrow()
    }, 30000)

    it('should accept valid enum values', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const validTypes = [
        'create_seed',
        'edit_content',
        'add_tag',
        'remove_tag',
        'add_category',
        'remove_category',
        'add_followup',
      ]
      for (const type of validTypes) {
        await expect(
          db('seed_transactions').insert({
            id: uuidv4(),
            seed_id: seedId,
            transaction_type: type,
            transaction_data: {},
          })
        ).resolves.not.toThrow()
      }
    }, 30000)

    it('should allow NULL automation_id', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('seed_transactions').insert({
          id: uuidv4(),
          seed_id: seedId,
          transaction_type: 'edit_content',
          transaction_data: {},
          automation_id: null,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should CASCADE delete when seed is deleted', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: seedId,
        transaction_type: 'edit_content',
        transaction_data: {},
      })

      // Delete seed
      await db('seeds').where({ id: seedId }).delete()

      // Verify transaction was deleted
      const deleted = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should SET NULL automation_id when automation is deleted', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const automationId = await createTestAutomation(db)

      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: seedId,
        transaction_type: 'add_tag',
        transaction_data: {},
        automation_id: automationId,
      })

      // Delete automation
      await db('automations').where({ id: automationId }).delete()

      // Verify automation_id was set to NULL
      const transaction = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(transaction?.automation_id).toBeNull()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'seed_transactions')
      expect(exists).toBe(false)

      const enumExists = await enumTypeExists(db, 'seed_transaction_type')
      expect(enumExists).toBe(false)
    }, 30000)
  })

  describe('Migration 017: remove_seed_content', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
    }, 30000)

    it('should delete seeds without create_seed transactions', async () => {
      const userId = await createTestUser(db)
      const seedWithTransaction = await createTestSeed(db, userId)
      const seedWithoutTransaction = await createTestSeed(db, userId)

      // Create transaction for one seed
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedWithTransaction,
        transaction_type: 'create_seed',
        transaction_data: { content: 'Test content' },
      })

      // Run migration
      await runMigrationsUpTo(db, '017_remove_seed_content.ts')

      // Verify seed with transaction still exists
      const kept = await db('seeds').where({ id: seedWithTransaction }).first()
      expect(kept).toBeDefined()

      // Verify seed without transaction was deleted
      const deleted = await db('seeds').where({ id: seedWithoutTransaction }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should remove seed_content column', async () => {
      await runMigrationsUpTo(db, '017_remove_seed_content.ts')

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).not.toHaveProperty('seed_content')
    }, 30000)

    it('should preserve other columns', async () => {
      await runMigrationsUpTo(db, '017_remove_seed_content.ts')

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).toHaveProperty('id')
      expect(columns).toHaveProperty('user_id')
      expect(columns).toHaveProperty('created_at')
    }, 30000)

    it('should handle empty seeds table', async () => {
      // Don't create any seeds
      await runMigrationsUpTo(db, '017_remove_seed_content.ts')

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).not.toHaveProperty('seed_content')
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '017_remove_seed_content.ts')
      await db.migrate.rollback()

      const columns = await getTableInfo(db, 'seeds')
      expect(columns).toHaveProperty('seed_content')
      expect(columns.seed_content.type).toBe('text')
      expect(columns.seed_content.nullable).toBe(false)
    }, 30000)
  })

  describe('Migration 018: drop_seed_tags_table', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '006_create_tags.ts')
      await runMigrationsUpTo(db, '004_create_events.ts')
      await runMigrationsUpTo(db, '007_create_seed_tags.ts')
    }, 30000)

    it('should drop seed_tags table', async () => {
      // Verify table exists before migration
      const existsBefore = await tableExists(db, 'seed_tags')
      expect(existsBefore).toBe(true)

      await runMigrationsUpTo(db, '018_drop_seed_tags_table.ts')

      const existsAfter = await tableExists(db, 'seed_tags')
      expect(existsAfter).toBe(false)
    }, 30000)

    it('should not affect other tables', async () => {
      await runMigrationsUpTo(db, '018_drop_seed_tags_table.ts')

      expect(await tableExists(db, 'seeds')).toBe(true)
      expect(await tableExists(db, 'tags')).toBe(true)
      expect(await tableExists(db, 'events')).toBe(true)
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '018_drop_seed_tags_table.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'seed_tags')
      expect(exists).toBe(true)

      // Verify schema is correct
      const columns = await getTableInfo(db, 'seed_tags')
      expect(columns).toHaveProperty('seed_id')
      expect(columns).toHaveProperty('tag_id')
      expect(columns).toHaveProperty('added_by_event_id')

      const primaryKey = await getPrimaryKey(db, 'seed_tags')
      expect(primaryKey?.length).toBe(2)
    }, 30000)
  })

  describe('Migration 019: drop_seed_categories_table', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '005_create_categories.ts')
      await runMigrationsUpTo(db, '004_create_events.ts')
      await runMigrationsUpTo(db, '008_create_seed_categories.ts')
    }, 30000)

    it('should drop seed_categories table', async () => {
      // Verify table exists before migration
      const existsBefore = await tableExists(db, 'seed_categories')
      expect(existsBefore).toBe(true)

      await runMigrationsUpTo(db, '019_drop_seed_categories_table.ts')

      const existsAfter = await tableExists(db, 'seed_categories')
      expect(existsAfter).toBe(false)
    }, 30000)

    it('should not affect other tables', async () => {
      await runMigrationsUpTo(db, '019_drop_seed_categories_table.ts')

      expect(await tableExists(db, 'seeds')).toBe(true)
      expect(await tableExists(db, 'categories')).toBe(true)
      expect(await tableExists(db, 'events')).toBe(true)
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '019_drop_seed_categories_table.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'seed_categories')
      expect(exists).toBe(true)

      // Verify schema is correct
      const columns = await getTableInfo(db, 'seed_categories')
      expect(columns).toHaveProperty('seed_id')
      expect(columns).toHaveProperty('category_id')
      expect(columns).toHaveProperty('added_by_event_id')

      const primaryKey = await getPrimaryKey(db, 'seed_categories')
      expect(primaryKey?.length).toBe(2)
    }, 30000)
  })

  describe('Migration 020: deprecate_events_table', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
      await runMigrationsUpTo(db, '004_create_events.ts')
    }, 30000)

    it('should run without errors', async () => {
      await expect(
        runMigrationsUpTo(db, '020_deprecate_events_table.ts')
      ).resolves.not.toThrow()
    }, 30000)

    it('should not drop events table', async () => {
      await runMigrationsUpTo(db, '020_deprecate_events_table.ts')

      const exists = await tableExists(db, 'events')
      expect(exists).toBe(true)
    }, 30000)

    it('should not change schema', async () => {
      const columnsBefore = await getTableInfo(db, 'events')

      await runMigrationsUpTo(db, '020_deprecate_events_table.ts')

      const columnsAfter = await getTableInfo(db, 'events')
      expect(columnsAfter).toEqual(columnsBefore)
    }, 30000)

    it('should rollback without errors', async () => {
      await runMigrationsUpTo(db, '020_deprecate_events_table.ts')
      await expect(db.migrate.down()).resolves.not.toThrow()
    }, 30000)

    it('should be idempotent', async () => {
      await runMigrationsUpTo(db, '020_deprecate_events_table.ts')
      await runMigrationsUpTo(db, '020_deprecate_events_table.ts')

      const exists = await tableExists(db, 'events')
      expect(exists).toBe(true)
    }, 30000)
  })
})


