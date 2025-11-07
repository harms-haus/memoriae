import React from 'react'
import { TagList } from '../TagList'
import type { Seed } from '../../types'
import './SeedView.css'

export interface SeedViewProps {
  seed: Seed
  onTagClick?: (tagId: string, tagName: string) => void
  tagColors?: Map<string, string> // Optional map of tag names (lowercase) to colors
}

/**
 * Format seed time - relative if recent, otherwise absolute
 */
function formatSeedTime(seed: Seed): string {
  const date = new Date(seed.created_at)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

/**
 * SeedView - Compact seed display component
 * 
 * Features:
 * - Seed content
 * - Tags with truncation (TagList)
 * - Category in brackets, bottom-center, italicized
 * - Date/time (relative if close) in small font, top-right corner
 */
export function SeedView({ seed, onTagClick, tagColors }: SeedViewProps) {
  const content = seed.currentState?.seed || ''
  const seedTags = seed.currentState?.tags || []
  const seedCategories = seed.currentState?.categories || []
  
  // Get primary category (first one, or empty)
  const primaryCategory = seedCategories.length > 0 ? seedCategories[0] : null

  const handleTagClick = (tag: { id: string; name: string }, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onTagClick?.(tag.id, tag.name)
  }

  return (
    <div className="seed-view">
      {/* Date/time in top-right corner */}
      <div className="seed-view-time">
        {formatSeedTime(seed)}
      </div>

      {/* Seed content */}
      <div className="seed-view-content">
        {content}
      </div>

      {/* Tags with truncation */}
      {seedTags.length > 0 && (
        <div className="seed-view-tags">
          <TagList
            tags={seedTags.map(tag => ({
              id: tag.id,
              name: tag.name,
              color: tagColors?.get(tag.name.toLowerCase()) ?? null,
            }))}
            onTagClick={handleTagClick}
            suppressTruncate={true}
          />
        </div>
      )}

      {/* Category in brackets, bottom-center, italicized */}
      {primaryCategory && (
        <div className="seed-view-category">
          [{primaryCategory.path}]
        </div>
      )}
    </div>
  )
}

