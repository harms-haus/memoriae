import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('idea_musings', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()
    table.string('template_type').notNullable() // 'numbered_ideas', 'wikipedia_links', 'markdown'
    table.jsonb('content').notNullable() // Template-specific structured content
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()
    table.boolean('dismissed').defaultTo(false).notNullable()
    table.timestamp('dismissed_at').nullable()

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')

    // Indexes
    table.index('seed_id')
    table.index('created_at')
    table.index('dismissed')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('idea_musings')
}

