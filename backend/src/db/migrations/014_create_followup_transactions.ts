import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create enum type for transaction_type
  await knex.raw(`
    CREATE TYPE followup_transaction_type AS ENUM ('creation', 'edit', 'dismissal', 'snooze')
  `)

  await knex.schema.createTable('followup_transactions', (table) => {
    table.uuid('id').primary()
    table.uuid('followup_id').notNullable()
    table.specificType('transaction_type', 'followup_transaction_type').notNullable()
    table.jsonb('transaction_data').notNullable() // Stores transaction-specific data
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Foreign keys
    table.foreign('followup_id').references('id').inTable('followups').onDelete('CASCADE')

    // Indexes
    table.index('followup_id')
    table.index('created_at')
    table.index('transaction_type')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('followup_transactions')
  await knex.raw('DROP TYPE IF EXISTS followup_transaction_type')
}

