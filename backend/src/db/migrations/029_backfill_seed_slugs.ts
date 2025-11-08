import type { Knex } from 'knex'
import { generateSeedSlug } from '../../utils/slug'

export async function up(knex: Knex): Promise<void> {
  // Get all seeds that don't have a slug yet
  const seeds = await knex('seeds')
    .select('id')
    .whereNull('slug')
  
  console.log(`Backfilling slugs for ${seeds.length} seeds...`)
  
  for (const seed of seeds) {
    try {
      // Get the create_seed transaction to extract content
      const createTransaction = await knex('seed_transactions')
        .where({ seed_id: seed.id, transaction_type: 'create_seed' })
        .first()
      
      if (!createTransaction) {
        console.warn(`Seed ${seed.id} has no create_seed transaction, skipping`)
        continue
      }
      
      // Extract content from transaction_data
      const transactionData = createTransaction.transaction_data
      const content = typeof transactionData === 'object' && transactionData !== null && 'content' in transactionData
        ? String(transactionData.content)
        : ''
      
      if (!content || content.trim().length === 0) {
        console.warn(`Seed ${seed.id} has empty content, skipping`)
        continue
      }
      
      // Get UUID prefix (first 7 characters)
      const uuidPrefix = seed.id.substring(0, 7)
      
      // Generate slug
      const slug = await generateSeedSlug(content, uuidPrefix)
      
      // Update seed with slug
      await knex('seeds')
        .where({ id: seed.id })
        .update({ slug })
      
    } catch (error) {
      console.error(`Error generating slug for seed ${seed.id}:`, error)
      // Continue with next seed
    }
  }
  
  console.log('Slug backfill completed')
}

export async function down(knex: Knex): Promise<void> {
  // Remove all slugs (set to null)
  await knex('seeds').update({ slug: null })
}

