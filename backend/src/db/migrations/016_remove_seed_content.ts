import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('seeds', (table) => {
    table.dropColumn('seed_content')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('seeds', (table) => {
    table.text('seed_content').notNullable()
  })
}

