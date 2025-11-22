import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Create enum type for transaction_type (check if it exists first)
  const enumExists = await knex.raw(`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'tag_transaction_type'
    )
  `)
  if (!enumExists.rows[0]?.exists) {
    await knex.raw(`
      CREATE TYPE tag_transaction_type AS ENUM ('creation', 'edit', 'set_color')
    `)
  }

  const exists = await knex.schema.hasTable('tag_transactions')
  if (!exists) {
    await knex.schema.createTable('tag_transactions', (table) => {
    table.uuid('id').primary()
    table.uuid('tag_id').notNullable()
    table.specificType('transaction_type', 'tag_transaction_type').notNullable()
    table.jsonb('transaction_data').notNullable() // Stores transaction-specific data
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.uuid('automation_id').nullable() // Null if created manually by user

    // Foreign keys
    table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE')
    table.foreign('automation_id').references('id').inTable('automations').onDelete('SET NULL')

    // Indexes
    table.index('tag_id')
    table.index('created_at')
    table.index('transaction_type')
    table.index(['tag_id', 'created_at']) // Composite index for timeline queries
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tag_transactions')
  await knex.raw('DROP TYPE IF EXISTS tag_transaction_type')
}
