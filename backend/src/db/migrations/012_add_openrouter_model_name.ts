import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('user_settings', 'openrouter_model_name')
  if (!hasColumn) {
    await knex.schema.alterTable('user_settings', (table) => {
      table.string('openrouter_model_name').nullable() // Display name for the selected model
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('user_settings', 'openrouter_model_name')
  if (hasColumn) {
    await knex.schema.alterTable('user_settings', (table) => {
      table.dropColumn('openrouter_model_name')
    })
  }
}







