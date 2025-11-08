import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('idea_musings', (table) => {
    table.boolean('completed').defaultTo(false).notNullable()
    table.timestamp('completed_at').nullable()
    table.index('completed')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('idea_musings', (table) => {
    table.dropIndex('completed')
    table.dropColumn('completed_at')
    table.dropColumn('completed')
  })
}

