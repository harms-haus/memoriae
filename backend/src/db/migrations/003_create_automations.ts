import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('automations')
  if (!exists) {
    await knex.schema.createTable('automations', (table) => {
      table.uuid('id').primary()
      table.string('name').notNullable().unique()
      table.text('description')
      table.string('handler_fn_name').notNullable() // Function name to call
      table.boolean('enabled').defaultTo(true).notNullable()
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('automations')
}

