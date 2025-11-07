import type { Knex } from 'knex'

/**
 * Migration to clean up seeds with invalid state
 * This migration identifies and deletes seeds that:
 * 1. Don't have a create_seed transaction
 * 2. Have create_seed transactions with invalid data structure
 * 3. Have create_seed transactions with empty content (from backfill migration)
 * 4. Have other transaction data issues
 */
export async function up(knex: Knex): Promise<void> {
  // Find seeds without create_seed transactions
  const seedsWithoutCreateSeed = await knex.raw(`
    SELECT s.id
    FROM seeds s
    LEFT JOIN seed_transactions st ON s.id = st.seed_id AND st.transaction_type = 'create_seed'
    WHERE st.id IS NULL
  `)

  // Find seeds with invalid create_seed transaction data
  // (missing content field, invalid JSON structure, or empty content)
  // Note: transaction_data->>'content' IS NULL catches both missing keys and null values
  const seedsWithInvalidCreateSeed = await knex.raw(`
    SELECT DISTINCT st.seed_id as id
    FROM seed_transactions st
    WHERE st.transaction_type = 'create_seed'
      AND (
        st.transaction_data IS NULL
        OR st.transaction_data::text = 'null'
        OR st.transaction_data->>'content' IS NULL
        OR (st.transaction_data->>'content')::text = ''
      )
  `)

  // Combine all problematic seed IDs
  const problematicSeedIds: string[] = []
  
  if (seedsWithoutCreateSeed.rows) {
    problematicSeedIds.push(...seedsWithoutCreateSeed.rows.map((row: any) => row.id))
  }
  
  if (seedsWithInvalidCreateSeed.rows) {
    problematicSeedIds.push(...seedsWithInvalidCreateSeed.rows.map((row: any) => row.id))
  }

  // Remove duplicates
  const uniqueProblematicIds = [...new Set(problematicSeedIds)]

  if (uniqueProblematicIds.length > 0) {
    console.log(`Found ${uniqueProblematicIds.length} seeds with invalid state`)
    console.log(`Seed IDs: ${uniqueProblematicIds.join(', ')}`)

    // Delete related data first
    console.log('Deleting related transactions...')
    await knex('seed_transactions').whereIn('seed_id', uniqueProblematicIds).delete()
    
    console.log('Deleting related events...')
    await knex('events').whereIn('seed_id', uniqueProblematicIds).delete()
    
    // Delete from junction tables if they still exist
    const hasSeedTags = await knex.schema.hasTable('seed_tags')
    const hasSeedCategories = await knex.schema.hasTable('seed_categories')
    
    if (hasSeedTags) {
      console.log('Deleting from seed_tags...')
      await knex('seed_tags').whereIn('seed_id', uniqueProblematicIds).delete()
    }
    if (hasSeedCategories) {
      console.log('Deleting from seed_categories...')
      await knex('seed_categories').whereIn('seed_id', uniqueProblematicIds).delete()
    }
    
    // Delete followups if they exist
    const hasFollowups = await knex.schema.hasTable('followups')
    if (hasFollowups) {
      console.log('Deleting related followups...')
      // Get followup IDs first
      const followupIds = await knex('followups')
        .whereIn('seed_id', uniqueProblematicIds)
        .select('id')
        .then(rows => rows.map(r => r.id))
      
      if (followupIds.length > 0) {
        // Delete followup transactions
        const hasFollowupTransactions = await knex.schema.hasTable('followup_transactions')
        if (hasFollowupTransactions) {
          await knex('followup_transactions').whereIn('followup_id', followupIds).delete()
        }
        // Delete followups
        await knex('followups').whereIn('id', followupIds).delete()
      }
    }
    
    // Finally delete the seeds
    console.log('Deleting seeds...')
    const deleted = await knex('seeds').whereIn('id', uniqueProblematicIds).delete()
    
    console.log(`Successfully deleted ${deleted} seeds with invalid state`)
  } else {
    console.log('No seeds with invalid state found')
  }
}

export async function down(knex: Knex): Promise<void> {
  // Cannot restore deleted seeds, so this is a no-op
  console.log('Cannot restore deleted seeds - migration is irreversible')
}

