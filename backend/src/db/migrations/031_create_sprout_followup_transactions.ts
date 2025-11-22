import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create enum type for transaction_type (check if it exists first)
  const enumExists = await knex.raw(`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'sprout_followup_transaction_type'
    )
  `)
  if (!enumExists.rows[0]?.exists) {
    await knex.raw(`
      CREATE TYPE sprout_followup_transaction_type AS ENUM ('creation', 'edit', 'dismissal', 'snooze')
    `)
  }

  const exists = await knex.schema.hasTable('sprout_followup_transactions')
  if (!exists) {
    await knex.schema.createTable('sprout_followup_transactions', (table) => {
    table.uuid('id').primary()
    table.uuid('sprout_id').notNullable()
    table.specificType('transaction_type', 'sprout_followup_transaction_type').notNullable()
    table.jsonb('transaction_data').notNullable() // Stores transaction-specific data
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Foreign keys
    table.foreign('sprout_id').references('id').inTable('sprouts').onDelete('CASCADE')

    // Indexes
    table.index('sprout_id')
    table.index('created_at')
    table.index('transaction_type')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('sprout_followup_transactions')
  await knex.raw('DROP TYPE IF EXISTS sprout_followup_transaction_type')
}

