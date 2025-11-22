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

  // Now remove the seed_content column (check if it exists first)
  const hasColumn = await knex.schema.hasColumn('seeds', 'seed_content')
  if (hasColumn) {
    await knex.schema.alterTable('seeds', (table) => {
      table.dropColumn('seed_content')
    })
  }
}

export async function down(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('seeds', 'seed_content')
  if (!hasColumn) {
    // First add the column as nullable with a default
    await knex.schema.alterTable('seeds', (table) => {
      table.text('seed_content').nullable().defaultTo('')
    })

    // For each seed, try to extract content from create_seed transaction
    // If no transaction exists, use empty string
    const seeds = await knex('seeds').select('id')
    
    for (const seed of seeds) {
      const createTransaction = await knex('seed_transactions')
        .where({ seed_id: seed.id, transaction_type: 'create_seed' })
        .first()
      
      let content = ''
      if (createTransaction) {
        const transactionData = createTransaction.transaction_data
        if (typeof transactionData === 'object' && transactionData !== null && 'content' in transactionData) {
          content = String(transactionData.content)
        }
      }
      
      await knex('seeds')
        .where({ id: seed.id })
        .update({ seed_content: content })
    }

    // Remove the default before making it NOT NULL
    await knex.raw('ALTER TABLE seeds ALTER COLUMN seed_content DROP DEFAULT')
    
    // Now make the column NOT NULL using raw SQL
    // (Knex doesn't support altering nullability directly)
    await knex.raw('ALTER TABLE seeds ALTER COLUMN seed_content SET NOT NULL')
  }
}

