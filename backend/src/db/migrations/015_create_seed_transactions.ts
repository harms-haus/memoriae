import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create enum type for transaction_type
  await knex.raw(`
    CREATE TYPE seed_transaction_type AS ENUM (
      'create_seed',
      'edit_content',
      'add_tag',
      'remove_tag',
      'add_category',
      'remove_category',
      'add_followup'
    )
  `)

  await knex.schema.createTable('seed_transactions', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()
    table.specificType('transaction_type', 'seed_transaction_type').notNullable()
    table.jsonb('transaction_data').notNullable() // Stores transaction-specific data
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.uuid('automation_id').nullable() // Null if created manually by user

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
    table.foreign('automation_id').references('id').inTable('automations').onDelete('SET NULL')

    // Indexes
    table.index('seed_id')
    table.index('created_at')
    table.index('transaction_type')
    table.index(['seed_id', 'created_at']) // Composite index for timeline queries
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('seed_transactions')
  await knex.raw('DROP TYPE IF EXISTS seed_transaction_type')
}

