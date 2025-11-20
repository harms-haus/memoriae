import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('pressure_points', (table) => {
    table.uuid('seed_id').notNullable()
    table.uuid('automation_id').notNullable()
    table.decimal('pressure_amount', 10, 2).notNullable().defaultTo(0) // 0-100 scale
    table.timestamp('last_updated').defaultTo(knex.fn.now()).notNullable()

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
    table.foreign('automation_id').references('id').inTable('automations').onDelete('CASCADE')

    // Composite primary key
    table.primary(['seed_id', 'automation_id'])

    // Indexes for pressure evaluation queries
    table.index('automation_id')
    table.index('pressure_amount')
    table.index(['automation_id', 'pressure_amount']) // Composite for threshold queries
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('pressure_points')
}

