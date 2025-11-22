import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('idea_musing_shown_history')
  if (!exists) {
    await knex.schema.createTable('idea_musing_shown_history', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()
    table.date('shown_date').notNullable() // Date when musing was shown (for 2-day exclusion)
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')

    // Indexes
    table.index('seed_id')
    table.index('shown_date')
    table.index(['seed_id', 'shown_date']) // Composite index for filtering queries
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('idea_musing_shown_history')
}

