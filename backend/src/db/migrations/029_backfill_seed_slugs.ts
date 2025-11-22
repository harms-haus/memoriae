import type { Knex } from 'knex'

/**
 * Generate a URL-safe slug from text content
 */
function slugify(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength)
    .replace(/-+$/, '') // Remove trailing hyphens after truncation
}

/**
 * Generate a full slug for a seed: {uuidPrefix}/{slug}
 * Handles collisions by appending numbers (-2, -3, etc.)
 */
async function generateSeedSlug(
  content: string,
  uuidPrefix: string,
  knex: Knex
): Promise<string> {
  // Extract first ~50 characters of content for slug
  const textForSlug = content.trim().substring(0, 50)
  const baseSlug = slugify(textForSlug)
  
  // If slug is empty after processing, use a default
  const slugPart = baseSlug || 'seed'
  
  // Build full slug: {uuidPrefix}/{slug}
  const fullSlug = `${uuidPrefix}/${slugPart}`
  
  // Check for collisions and append number if needed
  let finalSlug = fullSlug
  let counter = 2
  
  while (true) {
    const existing = await knex('seeds')
      .where({ slug: finalSlug })
      .first()
    
    if (!existing) {
      break // No collision, use this slug
    }
    
    // Collision detected, append number
    finalSlug = `${uuidPrefix}/${slugPart}-${counter}`
    counter++
  }
  
  return finalSlug
}

export async function up(knex: Knex): Promise<void> {
  const originalConsole = (global as any).__originalConsoleError || console.error
  originalConsole('[MIGRATION 029] Starting backfill_seed_slugs migration')
  
  // Check all seeds first
  const allSeeds = await knex('seeds').select('id', 'slug')
  originalConsole(`[MIGRATION 029] Total seeds in database: ${allSeeds.length}`)
  allSeeds.forEach(s => {
    originalConsole(`[MIGRATION 029] Seed ${s.id} has slug: ${s.slug || 'NULL'}`)
  })
  
  // Get all seeds that don't have a slug yet
  const seeds = await knex('seeds')
    .select('id')
    .whereNull('slug')
  
  originalConsole(`[MIGRATION 029] Backfilling slugs for ${seeds.length} seeds...`)
  seeds.forEach(s => {
    originalConsole(`[MIGRATION 029] Seed to process: ${s.id}`)
  })
  
  for (const seed of seeds) {
    try {
      originalConsole(`[MIGRATION 029] Processing seed ${seed.id}`)
      // Get the create_seed transaction to extract content
      const createTransaction = await knex('seed_transactions')
        .where({ seed_id: seed.id, transaction_type: 'create_seed' })
        .first()
      
      if (!createTransaction) {
        originalConsole(`[MIGRATION 029] Seed ${seed.id} has no create_seed transaction, skipping`)
        // Verify seed still exists after skipping
        const seedStillExists = await knex('seeds').where({ id: seed.id }).first()
        originalConsole(`[MIGRATION 029] Seed ${seed.id} still exists after skip:`, seedStillExists ? 'YES' : 'NO')
        continue
      }
      
      // Extract content from transaction_data using raw SQL for reliable JSONB extraction
      const result = await knex.raw(`
        SELECT transaction_data->>'content' as content
        FROM seed_transactions
        WHERE id = ?
      `, [createTransaction.id])
      
      const content = result.rows?.[0]?.content || ''
      
      if (!content || content.trim().length === 0) {
        originalConsole(`[MIGRATION 029] Seed ${seed.id} has empty content, skipping`)
        // Verify seed still exists after skipping
        const seedStillExists = await knex('seeds').where({ id: seed.id }).first()
        originalConsole(`[MIGRATION 029] Seed ${seed.id} still exists after skip:`, seedStillExists ? 'YES' : 'NO')
        continue
      }
      
      // Get UUID prefix (first 7 characters)
      const uuidPrefix = seed.id.substring(0, 7)
      
      // Generate slug
      const slug = await generateSeedSlug(content, uuidPrefix, knex)
      
      // Update seed with slug
      originalConsole(`[MIGRATION 029] Updating seed ${seed.id} with slug ${slug}`)
      await knex('seeds')
        .where({ id: seed.id })
        .update({ slug })
      originalConsole(`[MIGRATION 029] Updated seed ${seed.id}`)
      
    } catch (error) {
      originalConsole(`[MIGRATION 029] Error generating slug for seed ${seed.id}:`, error)
      // Continue with next seed
    }
  }
  
  originalConsole('[MIGRATION 029] Slug backfill completed')
}

export async function down(knex: Knex): Promise<void> {
  // Remove all slugs (set to null)
  await knex('seeds').update({ slug: null })
}

