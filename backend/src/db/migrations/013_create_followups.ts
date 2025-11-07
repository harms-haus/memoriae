import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('followups', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')

    // Indexes
    table.index('seed_id')
    
    // Note: created_at is derived from the creation transaction, not stored here
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('followups')
}

