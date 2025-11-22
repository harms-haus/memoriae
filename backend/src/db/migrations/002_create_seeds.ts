import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('seeds')
  if (!exists) {
    await knex.schema.createTable('seeds', (table) => {
      table.uuid('id').primary()
      table.uuid('user_id').notNullable()
      table.text('seed_content').notNullable()
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

      // Foreign key
      table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

      // Indexes
      table.index('user_id')
      table.index('created_at')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seeds')
}

