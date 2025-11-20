import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary()
    table.string('email').notNullable().unique()
    table.string('name').notNullable()
    table.string('provider').notNullable() // 'google' or 'github'
    table.string('provider_id').notNullable() // OAuth provider's user ID
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    // Composite unique constraint for provider + provider_id
    table.unique(['provider', 'provider_id'])
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users')
}

