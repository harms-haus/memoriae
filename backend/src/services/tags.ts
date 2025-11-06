// Tag service - handles tag operations
import db from '../db/connection'

/**
 * Tag record from database
 */
interface TagRow {
  id: string
  name: string
  color: string | null
  created_at: Date
}

/**
 * Tag interface matching frontend expectations
 */
export interface Tag {
  id: string
  name: string
  color: string
}

/**
 * Get all tags
 * Returns all tags in the database, ordered by name
 */
export async function getAllTags(): Promise<Tag[]> {
  const tags = await db<TagRow>('tags')
    .select('*')
    .orderBy('name', 'asc')

  // Convert to frontend format, providing empty string for null colors
  return tags.map(tag => ({
    id: tag.id,
    name: tag.name,
    color: tag.color || '',
  }))
}

