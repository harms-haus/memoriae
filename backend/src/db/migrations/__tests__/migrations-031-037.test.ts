// Migration tests for migrations 031-037
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
  createTestUser,
  createTestSeed,
  createTestAutomation,
  createTestCategory,
  tableExists,
  getEnumValues,
  enumTypeExists,
} from './migration-test-helpers'

describe('Database Migrations 031-037', () => {
  let db: Knex

  beforeEach(async () => {
    db = setupTestDatabase()
    await rollbackAllMigrations(db)
  }, 30000)

  afterEach(async () => {
    await rollbackAllMigrations(db)
    await teardownTestDatabase(db)
  }, 30000)

  describe('Migration 031: create_sprout_followup_transactions', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
      await runMigrationsUpTo(db, '030_create_sprouts.ts')
    }, 30000)

    it('should create enum type sprout_followup_transaction_type', async () => {
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')

      const exists = await enumTypeExists(db, 'sprout_followup_transaction_type')
      expect(exists).toBe(true)

      const values = await getEnumValues(db, 'sprout_followup_transaction_type')
      expect(values).toContain('creation')
      expect(values).toContain('edit')
      expect(values).toContain('dismissal')
      expect(values).toContain('snooze')
      expect(values.length).toBe(4)
    }, 30000)

    it('should create sprout_followup_transactions table with correct schema', async () => {
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')

      const exists = await tableExists(db, 'sprout_followup_transactions')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'sprout_followup_transactions')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('sprout_id')
      expect(columns.sprout_id.type).toBe('uuid')
      expect(columns.sprout_id.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_type')
      expect(columns.transaction_type.type).toBe('USER-DEFINED')
      expect(columns.transaction_type.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_data')
      expect(columns.transaction_data.type).toBe('jsonb')
      expect(columns.transaction_data.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have foreign key to sprouts table', async () => {
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')

      const foreignKeys = await getForeignKeys(db, 'sprout_followup_transactions')
      const sproutFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'sprouts' && fk.column_name === 'sprout_id'
      )
      expect(sproutFk).toBeDefined()
      expect(sproutFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should accept valid enum values', async () => {
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const sproutId = uuidv4()
      await db('sprouts').insert({
        id: sproutId,
        seed_id: seedId,
        sprout_type: 'followup',
        sprout_data: {},
      })

      const validTypes = ['creation', 'edit', 'dismissal', 'snooze']
      for (const type of validTypes) {
        await expect(
          db('sprout_followup_transactions').insert({
            id: uuidv4(),
            sprout_id: sproutId,
            transaction_type: type,
            transaction_data: {},
          })
        ).resolves.not.toThrow()
      }
    }, 30000)

    it('should CASCADE delete when sprout is deleted', async () => {
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const sproutId = uuidv4()
      await db('sprouts').insert({
        id: sproutId,
        seed_id: seedId,
        sprout_type: 'followup',
        sprout_data: {},
      })

      const transactionId = uuidv4()
      await db('sprout_followup_transactions').insert({
        id: transactionId,
        sprout_id: sproutId,
        transaction_type: 'creation',
        transaction_data: {},
      })

      // Delete sprout
      await db('sprouts').where({ id: sproutId }).delete()

      // Verify transaction was deleted
      const deleted = await db('sprout_followup_transactions')
        .where({ id: transactionId })
        .first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'sprout_followup_transactions')
      expect(exists).toBe(false)

      const enumExists = await enumTypeExists(db, 'sprout_followup_transaction_type')
      expect(enumExists).toBe(false)
    }, 30000)
  })

  describe('Migration 032: migrate_followups_and_musings_to_sprouts', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '013_create_followups.ts')
      await runMigrationsUpTo(db, '014_create_followup_transactions.ts')
      await runMigrationsUpTo(db, '025_create_idea_musings.ts')
      await runMigrationsUpTo(db, '030_create_sprouts.ts')
      await runMigrationsUpTo(db, '031_create_sprout_followup_transactions.ts')
    }, 30000)

    it('should migrate followups to sprouts', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()

      // Create followup
      await db('followups').insert({
        id: followupId,
        seed_id: seedId,
      })

      // Create creation transaction
      const transactionId = uuidv4()
      await db('followup_transactions').insert({
        id: transactionId,
        followup_id: followupId,
        transaction_type: 'creation',
        transaction_data: {
          trigger: 'manual',
          initial_time: new Date().toISOString(),
          initial_message: 'Test followup message',
        },
        created_at: new Date(),
      })

      // Run migration
      await runMigrationsUpTo(db, '032_migrate_followups_and_musings_to_sprouts.ts')

      // Verify sprout was created
      const sprout = await db('sprouts').where({ id: followupId }).first()
      expect(sprout).toBeDefined()
      expect(sprout?.sprout_type).toBe('followup')
      expect(sprout?.seed_id).toBe(seedId)
      expect(sprout?.sprout_data).toBeDefined()

      const sproutData = sprout?.sprout_data as any
      expect(sproutData.trigger).toBe('manual')
      expect(sproutData.initial_message).toBe('Test followup message')

      // Verify transaction was migrated
      const migratedTransaction = await db('sprout_followup_transactions')
        .where({ id: transactionId })
        .first()
      expect(migratedTransaction).toBeDefined()
      expect(migratedTransaction?.sprout_id).toBe(followupId)
    }, 30000)

    it('should migrate idea musings to sprouts', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const musingId = uuidv4()

      // Create musing
      await db('idea_musings').insert({
        id: musingId,
        seed_id: seedId,
        template_type: 'numbered_ideas',
        content: { ideas: ['idea1', 'idea2'] },
        dismissed: false,
        completed: true,
        completed_at: new Date(),
      })

      // Run migration
      await runMigrationsUpTo(db, '032_migrate_followups_and_musings_to_sprouts.ts')

      // Verify sprout was created
      const sprout = await db('sprouts').where({ id: musingId }).first()
      expect(sprout).toBeDefined()
      expect(sprout?.sprout_type).toBe('musing')
      expect(sprout?.seed_id).toBe(seedId)

      const sproutData = sprout?.sprout_data as any
      expect(sproutData.template_type).toBe('numbered_ideas')
      expect(sproutData.content).toEqual({ ideas: ['idea1', 'idea2'] })
      expect(sproutData.dismissed).toBe(false)
      expect(sproutData.completed).toBe(true)
    }, 30000)

    it('should skip followups without creation transactions', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()

      // Create followup without creation transaction
      await db('followups').insert({
        id: followupId,
        seed_id: seedId,
      })

      // Run migration
      await runMigrationsUpTo(db, '032_migrate_followups_and_musings_to_sprouts.ts')

      // Verify sprout was NOT created
      const sprout = await db('sprouts').where({ id: followupId }).first()
      expect(sprout).toBeUndefined()
    }, 30000)

    it('should handle empty tables', async () => {
      // Don't create any followups or musings
      await expect(
        runMigrationsUpTo(db, '032_migrate_followups_and_musings_to_sprouts.ts')
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback without errors (no-op)', async () => {
      await runMigrationsUpTo(db, '032_migrate_followups_and_musings_to_sprouts.ts')
      await expect(db.migrate.down()).resolves.not.toThrow()
    }, 30000)
  })

  describe('Migration 033: update_seed_transactions_for_sprouts', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
    }, 30000)

    it('should update add_followup transactions to add_sprout', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()

      // Create add_followup transaction
      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: seedId,
        transaction_type: 'add_followup',
        transaction_data: { followup_id: followupId },
      })

      // Run migration
      await runMigrationsUpTo(db, '033_update_seed_transactions_for_sprouts.ts')

      // Verify transaction was updated
      const transaction = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(transaction?.transaction_type).toBe('add_sprout')
      expect((transaction?.transaction_data as any).sprout_id).toBe(followupId)
    }, 30000)

    it('should add add_sprout to enum', async () => {
      await runMigrationsUpTo(db, '033_update_seed_transactions_for_sprouts.ts')

      const values = await getEnumValues(db, 'seed_transaction_type')
      expect(values).toContain('add_sprout')
    }, 30000)

    it('should reject add_followup after migration', async () => {
      await runMigrationsUpTo(db, '033_update_seed_transactions_for_sprouts.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('seed_transactions').insert({
          id: uuidv4(),
          seed_id: seedId,
          transaction_type: 'add_followup' as any,
          transaction_data: {},
        })
      ).rejects.toThrow()
    }, 30000)

    it('should accept add_sprout after migration', async () => {
      await runMigrationsUpTo(db, '033_update_seed_transactions_for_sprouts.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('seed_transactions').insert({
          id: uuidv4(),
          seed_id: seedId,
          transaction_type: 'add_sprout',
          transaction_data: { sprout_id: uuidv4() },
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const followupId = uuidv4()

      // Create add_followup transaction before migration
      const transactionId = uuidv4()
      await db('seed_transactions').insert({
        id: transactionId,
        seed_id: seedId,
        transaction_type: 'add_followup',
        transaction_data: { followup_id: followupId },
      })

      // Run migration (converts add_followup to add_sprout)
      await runMigrationsUpTo(db, '033_update_seed_transactions_for_sprouts.ts')
      
      // Verify it was converted to add_sprout
      let transaction = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(transaction?.transaction_type).toBe('add_sprout')
      
      // Rollback (should convert add_sprout back to add_followup)
      await db.migrate.rollback()

      // Verify transaction was updated back
      transaction = await db('seed_transactions')
        .where({ id: transactionId })
        .first()
      expect(transaction?.transaction_type).toBe('add_followup')
      expect((transaction?.transaction_data as any).followup_id).toBe(followupId)

      // Note: 'add_sprout' remains in enum (PostgreSQL limitation)
      // So we can still insert it, but 'add_followup' also works
      const values = await getEnumValues(db, 'seed_transaction_type')
      expect(values).toContain('add_sprout')
      expect(values).toContain('add_followup')
    }, 30000)
  })

  describe('Migration 034: add_wikipedia_sprout_type', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '030_create_sprouts.ts')
    }, 30000)

    it('should add wikipedia_reference to sprout_type enum', async () => {
      await runMigrationsUpTo(db, '034_add_wikipedia_sprout_type.ts')

      const values = await getEnumValues(db, 'sprout_type')
      expect(values).toContain('wikipedia_reference')
      expect(values).toContain('followup')
      expect(values).toContain('musing')
    }, 30000)

    it('should accept wikipedia_reference after migration', async () => {
      await runMigrationsUpTo(db, '034_add_wikipedia_sprout_type.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)

      await expect(
        db('sprouts').insert({
          id: uuidv4(),
          seed_id: seedId,
          sprout_type: 'wikipedia_reference',
          sprout_data: {},
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should be idempotent', async () => {
      await runMigrationsUpTo(db, '034_add_wikipedia_sprout_type.ts')
      await runMigrationsUpTo(db, '034_add_wikipedia_sprout_type.ts')

      const values = await getEnumValues(db, 'sprout_type')
      expect(values).toContain('wikipedia_reference')
    }, 30000)

    it('should rollback without errors (no-op)', async () => {
      await runMigrationsUpTo(db, '034_add_wikipedia_sprout_type.ts')
      await expect(db.migrate.down()).resolves.not.toThrow()

      // Note: enum value remains (PostgreSQL limitation)
      const values = await getEnumValues(db, 'sprout_type')
      expect(values).toContain('wikipedia_reference')
    }, 30000)
  })

  describe('Migration 035: create_sprout_wikipedia_transactions', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '030_create_sprouts.ts')
    }, 30000)

    it('should create enum type sprout_wikipedia_transaction_type', async () => {
      await runMigrationsUpTo(db, '035_create_sprout_wikipedia_transactions.ts')

      const exists = await enumTypeExists(db, 'sprout_wikipedia_transaction_type')
      expect(exists).toBe(true)

      const values = await getEnumValues(db, 'sprout_wikipedia_transaction_type')
      expect(values).toContain('creation')
      expect(values).toContain('edit')
      expect(values.length).toBe(2)
    }, 30000)

    it('should create sprout_wikipedia_transactions table with correct schema', async () => {
      await runMigrationsUpTo(db, '035_create_sprout_wikipedia_transactions.ts')

      const exists = await tableExists(db, 'sprout_wikipedia_transactions')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'sprout_wikipedia_transactions')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('sprout_id')
      expect(columns.sprout_id.type).toBe('uuid')
      expect(columns.sprout_id.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_type')
      expect(columns.transaction_type.type).toBe('USER-DEFINED')
      expect(columns.transaction_type.nullable).toBe(false)
      expect(columns).toHaveProperty('transaction_data')
      expect(columns.transaction_data.type).toBe('jsonb')
      expect(columns.transaction_data.nullable).toBe(false)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have foreign key to sprouts table', async () => {
      await runMigrationsUpTo(db, '035_create_sprout_wikipedia_transactions.ts')

      const foreignKeys = await getForeignKeys(db, 'sprout_wikipedia_transactions')
      const sproutFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'sprouts' && fk.column_name === 'sprout_id'
      )
      expect(sproutFk).toBeDefined()
      expect(sproutFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should accept valid enum values', async () => {
      await runMigrationsUpTo(db, '035_create_sprout_wikipedia_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const sproutId = uuidv4()
      await db('sprouts').insert({
        id: sproutId,
        seed_id: seedId,
        sprout_type: 'wikipedia_reference',
        sprout_data: {},
      })

      const validTypes = ['creation', 'edit']
      for (const type of validTypes) {
        await expect(
          db('sprout_wikipedia_transactions').insert({
            id: uuidv4(),
            sprout_id: sproutId,
            transaction_type: type,
            transaction_data: {},
          })
        ).resolves.not.toThrow()
      }
    }, 30000)

    it('should CASCADE delete when sprout is deleted', async () => {
      await runMigrationsUpTo(db, '035_create_sprout_wikipedia_transactions.ts')

      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const sproutId = uuidv4()
      await db('sprouts').insert({
        id: sproutId,
        seed_id: seedId,
        sprout_type: 'wikipedia_reference',
        sprout_data: {},
      })

      const transactionId = uuidv4()
      await db('sprout_wikipedia_transactions').insert({
        id: transactionId,
        sprout_id: sproutId,
        transaction_type: 'creation',
        transaction_data: {},
      })

      // Delete sprout
      await db('sprouts').where({ id: sproutId }).delete()

      // Verify transaction was deleted
      const deleted = await db('sprout_wikipedia_transactions')
        .where({ id: transactionId })
        .first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '035_create_sprout_wikipedia_transactions.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'sprout_wikipedia_transactions')
      expect(exists).toBe(false)

      const enumExists = await enumTypeExists(db, 'sprout_wikipedia_transaction_type')
      expect(enumExists).toBe(false)
    }, 30000)
  })

  describe('Migration 036: add_user_id_to_categories', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '002_create_seeds.ts')
      await runMigrationsUpTo(db, '005_create_categories.ts')
      await runMigrationsUpTo(db, '015_create_seed_transactions.ts')
    }, 30000)

    it('should add user_id column and assign from seeds', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      // Create set_category transaction linking seed to category
      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: { category_id: categoryId },
      })

      // Run migration
      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')

      // Verify category has user_id
      const category = await db('categories').where({ id: categoryId }).first()
      expect(category?.user_id).toBe(userId)
    }, 30000)

    it('should delete orphaned categories', async () => {
      const orphanedCategoryId = await createTestCategory(db)

      // Don't link any seeds to this category

      // Run migration
      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')

      // Verify category was deleted
      const deleted = await db('categories').where({ id: orphanedCategoryId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should make user_id NOT NULL after data migration', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: { category_id: categoryId },
      })

      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')

      const columns = await getTableInfo(db, 'categories')
      expect(columns.user_id.nullable).toBe(false)
    }, 30000)

    it('should add foreign key to users', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: { category_id: categoryId },
      })

      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')

      const foreignKeys = await getForeignKeys(db, 'categories')
      const userFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'users' && fk.column_name === 'user_id'
      )
      expect(userFk).toBeDefined()
      expect(userFk?.on_delete).toBe('CASCADE')
    }, 30000)

    it('should add index on user_id', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: { category_id: categoryId },
      })

      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')

      const indexes = await getIndexes(db, 'categories')
      const userIdIndex = indexes.find((idx) =>
        idx.indexdef.toLowerCase().includes('user_id')
      )
      expect(userIdIndex).toBeDefined()
    }, 30000)

    it('should CASCADE delete when user is deleted', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: { category_id: categoryId },
      })

      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')

      // Delete user
      await db('users').where({ id: userId }).delete()

      // Verify category was deleted
      const deleted = await db('categories').where({ id: categoryId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should rollback correctly', async () => {
      const userId = await createTestUser(db)
      const seedId = await createTestSeed(db, userId)
      const categoryId = await createTestCategory(db)

      await db('seed_transactions').insert({
        id: uuidv4(),
        seed_id: seedId,
        transaction_type: 'set_category',
        transaction_data: { category_id: categoryId },
      })

      await runMigrationsUpTo(db, '036_add_user_id_to_categories.ts')
      await db.migrate.rollback()

      const columns = await getTableInfo(db, 'categories')
      expect(columns).not.toHaveProperty('user_id')
    }, 30000)
  })

  describe('Migration 037: create_token_usage', () => {
    beforeEach(async () => {
      await runMigrationsUpTo(db, '001_create_users.ts')
      await runMigrationsUpTo(db, '003_create_automations.ts')
    }, 30000)

    it('should create token_usage table with correct schema', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const exists = await tableExists(db, 'token_usage')
      expect(exists).toBe(true)

      const columns = await getTableInfo(db, 'token_usage')
      expect(columns).toHaveProperty('id')
      expect(columns.id.type).toBe('uuid')
      expect(columns.id.nullable).toBe(false)
      expect(columns).toHaveProperty('user_id')
      expect(columns.user_id.type).toBe('uuid')
      expect(columns.user_id.nullable).toBe(false)
      expect(columns).toHaveProperty('automation_id')
      expect(columns.automation_id.type).toBe('uuid')
      expect(columns.automation_id.nullable).toBe(true)
      expect(columns).toHaveProperty('automation_name')
      expect(columns.automation_name.type).toBe('character varying')
      expect(columns.automation_name.nullable).toBe(true)
      expect(columns).toHaveProperty('model')
      expect(columns.model.type).toBe('character varying')
      expect(columns.model.nullable).toBe(false)
      expect(columns).toHaveProperty('input_tokens')
      expect(columns.input_tokens.type).toBe('integer')
      expect(columns.input_tokens.nullable).toBe(false)
      expect(columns).toHaveProperty('output_tokens')
      expect(columns.output_tokens.type).toBe('integer')
      expect(columns.output_tokens.nullable).toBe(false)
      expect(columns).toHaveProperty('cached_input_tokens')
      expect(columns.cached_input_tokens.type).toBe('integer')
      expect(columns.cached_input_tokens.nullable).toBe(false)
      expect(columns).toHaveProperty('cached_output_tokens')
      expect(columns.cached_output_tokens.type).toBe('integer')
      expect(columns.cached_output_tokens.nullable).toBe(false)
      expect(columns).toHaveProperty('total_tokens')
      expect(columns.total_tokens.type).toBe('integer')
      expect(columns.total_tokens.nullable).toBe(false)
      expect(columns).toHaveProperty('messages')
      expect(columns.messages.type).toBe('jsonb')
      expect(columns.messages.nullable).toBe(true)
      expect(columns).toHaveProperty('created_at')
      expect(columns.created_at.nullable).toBe(false)
    }, 30000)

    it('should have primary key on id', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const primaryKey = await getPrimaryKey(db, 'token_usage')
      expect(primaryKey).not.toBeNull()
      expect(primaryKey?.length).toBe(1)
      expect(primaryKey?.[0]?.column_name).toBe('id')
    }, 30000)

    it('should have foreign keys to users and automations', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const foreignKeys = await getForeignKeys(db, 'token_usage')
      const userFk = foreignKeys.find(
        (fk) => fk.foreign_table_name === 'users' && fk.column_name === 'user_id'
      )
      const automationFk = foreignKeys.find(
        (fk) =>
          fk.foreign_table_name === 'automations' &&
          fk.column_name === 'automation_id'
      )

      expect(userFk).toBeDefined()
      expect(userFk?.on_delete).toBe('CASCADE')
      expect(automationFk).toBeDefined()
      expect(automationFk?.on_delete).toBe('SET NULL')
    }, 30000)

    it('should have required indexes', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const indexes = await getIndexes(db, 'token_usage')
      const indexNames = indexes.map((idx) => idx.indexname.toLowerCase())

      expect(
        indexNames.some((name) => name.includes('user_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('automation_id'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('created_at'))
      ).toBe(true)
      expect(
        indexNames.some((name) => name.includes('model'))
      ).toBe(true)
    }, 30000)

    it('should default cached tokens to 0', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const userId = await createTestUser(db)
      const recordId = uuidv4()
      await db('token_usage').insert({
        id: recordId,
        user_id: userId,
        model: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        // cached tokens not specified
      })

      const record = await db('token_usage').where({ id: recordId }).first()
      expect(record?.cached_input_tokens).toBe(0)
      expect(record?.cached_output_tokens).toBe(0)
    }, 30000)

    it('should allow NULL automation_id', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const userId = await createTestUser(db)
      await expect(
        db('token_usage').insert({
          id: uuidv4(),
          user_id: userId,
          model: 'gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          automation_id: null,
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should CASCADE delete when user is deleted', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const userId = await createTestUser(db)
      const recordId = uuidv4()
      await db('token_usage').insert({
        id: recordId,
        user_id: userId,
        model: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      })

      // Delete user
      await db('users').where({ id: userId }).delete()

      // Verify record was deleted
      const deleted = await db('token_usage').where({ id: recordId }).first()
      expect(deleted).toBeUndefined()
    }, 30000)

    it('should SET NULL automation_id when automation is deleted', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const userId = await createTestUser(db)
      const automationId = await createTestAutomation(db)
      const recordId = uuidv4()
      await db('token_usage').insert({
        id: recordId,
        user_id: userId,
        automation_id: automationId,
        model: 'gpt-4',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
      })

      // Delete automation
      await db('automations').where({ id: automationId }).delete()

      // Verify automation_id was set to NULL
      const record = await db('token_usage').where({ id: recordId }).first()
      expect(record?.automation_id).toBeNull()
    }, 30000)

    it('should allow JSONB messages', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')

      const userId = await createTestUser(db)
      const messages = [{ role: 'user', content: 'test' }]
      await expect(
        db('token_usage').insert({
          id: uuidv4(),
          user_id: userId,
          model: 'gpt-4',
          input_tokens: 100,
          output_tokens: 50,
          total_tokens: 150,
          messages: db.raw('?::jsonb', [JSON.stringify(messages)]),
        })
      ).resolves.not.toThrow()
    }, 30000)

    it('should rollback correctly', async () => {
      await runMigrationsUpTo(db, '037_create_token_usage.ts')
      await db.migrate.rollback()

      const exists = await tableExists(db, 'token_usage')
      expect(exists).toBe(false)
    }, 30000)
  })
})

