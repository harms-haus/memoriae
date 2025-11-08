import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('seeds', (table) => {
    table.string('slug', 200).nullable()
    // Unique index allows nulls (PostgreSQL behavior)
    table.unique('slug')
    // Regular index for lookup performance
    table.index('slug')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('seeds', (table) => {
    table.dropIndex('slug')
    table.dropUnique('slug')
    table.dropColumn('slug')
  })
}

