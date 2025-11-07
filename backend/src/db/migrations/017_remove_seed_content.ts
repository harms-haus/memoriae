import type { Knex } from 'knex'

export async function up(knex: Knex): Promise<void> {
  // Delete all seeds that don't have a create_seed transaction
  // These seeds are incompatible with the transaction-based system
  const seedsToDelete = await knex.raw(`
    SELECT s.id
    FROM seeds s
    LEFT JOIN seed_transactions st ON s.id = st.seed_id AND st.transaction_type = 'create_seed'
    WHERE st.id IS NULL
  `)

  const seedIds = seedsToDelete.rows?.map((row: any) => row.id) || []
  
  if (seedIds.length > 0) {
    console.log(`Deleting ${seedIds.length} incompatible seeds (missing create_seed transactions)`)
    
    // Delete related data first (CASCADE should handle most, but be explicit)
    await knex('seed_transactions').whereIn('seed_id', seedIds).delete()
    await knex('events').whereIn('seed_id', seedIds).delete()
    
    // Delete from junction tables if they still exist
    const hasSeedTags = await knex.schema.hasTable('seed_tags')
    const hasSeedCategories = await knex.schema.hasTable('seed_categories')
    
    if (hasSeedTags) {
      await knex('seed_tags').whereIn('seed_id', seedIds).delete()
    }
    if (hasSeedCategories) {
      await knex('seed_categories').whereIn('seed_id', seedIds).delete()
    }
    
    // Finally delete the seeds
    await knex('seeds').whereIn('id', seedIds).delete()
    
    console.log(`Deleted ${seedIds.length} incompatible seeds`)
  }

  // Now remove the seed_content column
  await knex.schema.alterTable('seeds', (table) => {
    table.dropColumn('seed_content')
  })
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('seeds', (table) => {
    table.text('seed_content').notNullable()
  })
}

