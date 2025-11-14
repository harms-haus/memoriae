import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_settings', (table) => {
    table.uuid('id').primary()
    table.uuid('user_id').notNullable().unique()
    table.string('openrouter_api_key').nullable() // Encrypted or plain text (user's choice)
    table.string('openrouter_model').nullable() // e.g., 'openai/gpt-4', 'anthropic/claude-3-opus'
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable()

    // Foreign key
    table.foreign('user_id').references('id').inTable('users').onDelete('CASCADE')

    // Index
    table.index('user_id')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('user_settings')
}







