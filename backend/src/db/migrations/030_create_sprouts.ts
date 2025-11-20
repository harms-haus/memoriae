import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create enum type for sprout_type
  await knex.raw(`
    CREATE TYPE sprout_type AS ENUM ('followup', 'musing', 'extra_context', 'fact_check')
  `)

  await knex.schema.createTable('sprouts', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()
    table.specificType('sprout_type', 'sprout_type').notNullable()
    table.jsonb('sprout_data').notNullable() // Type-specific data structure
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.uuid('automation_id').nullable()

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
    table.foreign('automation_id').references('id').inTable('automations').onDelete('SET NULL')

    // Indexes
    table.index('seed_id')
    table.index('created_at')
    table.index('sprout_type')
    table.index(['seed_id', 'created_at']) // Composite index for timeline queries
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sprouts')
  await knex.raw('DROP TYPE IF EXISTS sprout_type')
}

