import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  const exists = await knex.schema.hasTable('categories')
  if (!exists) {
    await knex.schema.createTable('categories', (table) => {
      table.uuid('id').primary()
      table.uuid('parent_id').nullable() // Self-referencing for hierarchy
      table.string('name').notNullable()
      table.string('path').notNullable() // e.g., "/work/projects/web"
      table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable()

      // Foreign key for parent relationship
      table.foreign('parent_id').references('id').inTable('categories').onDelete('CASCADE')

      // Index for hierarchical queries (path-based)
      table.index('path')
      table.index('parent_id')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('categories')
}

