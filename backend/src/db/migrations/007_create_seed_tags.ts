import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('seed_tags')
  if (!exists) {
    await knex.schema.createTable('seed_tags', (table) => {
      table.uuid('seed_id').notNullable()
      table.uuid('tag_id').notNullable()
      table.uuid('added_by_event_id').nullable() // Event that added this tag

      // Foreign keys
      table.foreign('seed_id').references('id').inTable('seeds').onDelete('CASCADE')
      table.foreign('tag_id').references('id').inTable('tags').onDelete('CASCADE')
      table.foreign('added_by_event_id').references('id').inTable('events').onDelete('SET NULL')

      // Composite primary key
      table.primary(['seed_id', 'tag_id'])

      // Indexes
      table.index('seed_id')
      table.index('tag_id')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('seed_tags')
}

