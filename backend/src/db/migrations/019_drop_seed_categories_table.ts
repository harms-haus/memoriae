import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seed_categories')
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.createTable('seed_categories', (table) => {
    table.uuid('seed_id').notNullable()
    table.uuid('category_id').notNullable()
    table.uuid('added_by_event_id').nullable()

    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
    table.foreign('category_id').references('id').inTable('categories').onDelete('CASCADE')
    table.foreign('added_by_event_id').references('id').inTable('events').onDelete('SET NULL')

    table.primary(['seed_id', 'category_id'])
    table.index('seed_id')
    table.index('category_id')
  })
}

