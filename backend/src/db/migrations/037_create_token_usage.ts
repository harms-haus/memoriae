import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('token_usage')
  if (!exists) {
    await knex.schema.createTable('token_usage', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    table.uuid('automation_id').nullable().references('id').inTable('automations').onDelete('SET NULL')
    table.string('automation_name').nullable()
    table.string('model').notNullable()
    table.integer('input_tokens').notNullable()
    table.integer('output_tokens').notNullable()
    table.integer('cached_input_tokens').notNullable().defaultTo(0)
    table.integer('cached_output_tokens').notNullable().defaultTo(0)
    table.integer('total_tokens').notNullable()
    table.jsonb('messages').nullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

    table.index(['user_id'])
    table.index(['automation_id'])
    table.index(['created_at'])
    table.index(['model'])
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('token_usage')
}

