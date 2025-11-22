import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('idea_musings')
  if (!exists) {
    await knex.schema.createTable('idea_musings', (table) => {
    table.uuid('id').primary()
    table.uuid('seed_id').notNullable()
    table.string('template_type').notNullable() // 'numbered_ideas', 'wikipedia_links', 'markdown'
    table.jsonb('content').notNullable() // Template-specific structured content
    table.specificType('created_at', 'timestamp without time zone').defaultTo(knex.fn.now()).notNullable()
    table.boolean('dismissed').defaultTo(false).notNullable()
    table.specificType('dismissed_at', 'timestamp without time zone').nullable()

    // Foreign keys
    table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')

    // Indexes
    table.index('seed_id')
    table.index('created_at')
    table.index('dismissed')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('idea_musings')
}

