import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('tags')
  if (!exists) {
    await knex.schema.createTable('tags', (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable().unique()
      table.string('color') // Color from style guide palette
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tags')
}

