import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('events', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()
    table.string('event_type').notNullable() // e.g., 'ADD_TAG', 'REMOVE_TAG', 'SET_CATEGORY', 'UPDATE_CONTENT'
    table.jsonb('patch_json').notNullable() // JSON Patch (RFC 6902) operations
    table.boolean('enabled').defaultTo(true).notNullable()
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.uuid('automation_id').nullable() // Null if created manually by user

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
    table.foreign('automation_id').references('id').inTable('automations').onDelete('SET NULL')

    // Indexes
    table.index('seed_id')
    table.index('enabled')
    table.index('created_at')
    table.index(['seed_id', 'enabled', 'created_at']) // Composite index for timeline queries
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('events')
}

