import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Add the column first
  await knex.schema.alterTable('seeds', (table) => {
    table.string('slug', 200).nullable()
  })
  
  // Create unique constraint with explicit name (shows up in information_schema.table_constraints)
  await knex.raw(`
    ALTER TABLE seeds 
    ADD CONSTRAINT seeds_slug_unique UNIQUE (slug)
  `)
  
  // Create regular index for lookup performance (separate from unique constraint)
  // Note: We don't specify a name so Knex will auto-generate one
  await knex.schema.alterTable('seeds', (table) => {
    table.index('slug')
  })
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('seeds', 'slug')
  if (hasColumn) {
    // Drop the unique constraint first (this also drops the unique index)
    await knex.raw(`
      ALTER TABLE seeds 
      DROP CONSTRAINT IF EXISTS seeds_slug_unique
    `)
    
    // Drop the regular index by column name (Knex will find the auto-generated index name)
    try {
      await knex.schema.alterTable('seeds', (table) => {
        table.dropIndex('slug')
      })
    } catch (error) {
      // Index might not exist, ignore
    }
    
    // Drop the column
    await knex.schema.alterTable('seeds', (table) => {
      table.dropColumn('slug')
    })
  }
}

