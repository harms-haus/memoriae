import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.string('timezone').nullable() // IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('user_settings', (table) => {
    table.dropColumn('timezone')
  })
}

