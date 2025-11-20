import type { Knex } from 'knex'
import db from '../db/connection'

/**
 * Generate a URL-safe slug from text content
 * - Converts to lowercase
 * - Removes special characters (keeps alphanumeric and spaces)
 * - Replaces spaces with hyphens
 * - Truncates to max length
 * - Removes leading/trailing hyphens
 */
function slugify(text: string, maxLength: number = 50): string {
  return text
    .toLowerCase()
    .trim()
    // Replace multiple spaces/hyphens with single hyphen
    .replace(/[^\w\s-]/g, '') // Remove special chars
    .replace(/[\s_-]+/g, '-') // Replace spaces/underscores with hyphens
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, maxLength)
    .replace(/-+$/, '') // Remove trailing hyphens after truncation
}

/**
 * Generate a full slug for a seed: {uuidPrefix}/{slug}
 * Handles collisions by appending numbers (-2, -3, etc.)
 * 
 * @param content - Seed content to extract memorable text from
 * @param uuidPrefix - First 7 characters of the seed UUID
 * @param knexInstance - Optional Knex instance to use (defaults to global db)
 * @returns Full slug in format: {uuidPrefix}/{slug}
 */
export async function generateSeedSlug(
  content: string,
  uuidPrefix: string,
  knexInstance?: Knex
): Promise<string> {
  // Use provided knex instance or fall back to global db
  const dbInstance = knexInstance || db

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
    const existing = await dbInstance('seeds')
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

