import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('seed_categories', (table) => {
    table.uuid('seed_id').notNullable()
    table.uuid('category_id').notNullable()
    table.uuid('added_by_event_id').nullable() // Event that added this category

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
    table.foreign('category_id').references('id').inTable('categories').onDelete('CASCADE')
    table.foreign('added_by_event_id').references('id').inTable('events').onDelete('SET NULL')

    // Composite primary key
    table.primary(['seed_id', 'category_id'])

    // Indexes
    table.index('seed_id')
    table.index('category_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('seed_categories')
}

