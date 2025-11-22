import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('users')
  if (!exists) {
    await knex.schema.createTable('users', (table) => {
      table.uuid('id').primary()
      table.string('email').notNullable()
      table.string('name').notNullable()
      table.string('provider').notNullable() // 'google' or 'github'
      table.string('provider_id').notNullable() // OAuth provider's user ID
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

      // Composite unique constraint for email + provider (allows same email with different providers)
      table.unique(['email', 'provider'])
      // Composite unique constraint for provider + provider_id
      table.unique(['provider', 'provider_id'])
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users')
}

