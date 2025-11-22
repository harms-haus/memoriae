import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('automation_queue')
  if (!exists) {
    await knex.schema.createTable('automation_queue', (table) => {
      table.uuid('id').primary()
      table.uuid('seed_id').notNullable()
      table.uuid('automation_id').notNullable()
      table.integer('priority').defaultTo(0).notNullable() // Higher = more priority
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

      // Foreign keys
      table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
      table.foreign('automation_id').references('id').inTable('automations').onDelete('CASCADE')

      // Indexes
      table.index('seed_id')
      table.index('automation_id')
      table.index('priority')
      table.index('created_at')
      table.index(['priority', 'created_at']) // Composite for queue ordering
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('automation_queue')
}

