import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const hasCompleted = await knex.schema.hasColumn('idea_musings', 'completed')
  if (!hasCompleted) {
    await knex.schema.alterTable('idea_musings', (table) => {
      table.boolean('completed').defaultTo(false).notNullable()
      table.specificType('completed_at', 'timestamp without time zone').nullable()
      table.index('completed')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasCompleted = await knex.schema.hasColumn('idea_musings', 'completed')
  if (hasCompleted) {
    await knex.schema.alterTable('idea_musings', (table) => {
      table.dropIndex('completed')
      table.dropColumn('completed_at')
      table.dropColumn('completed')
    })
  }
}

