import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TagList } from '../TagList'
import { renderHashTags } from '../../utils/renderHashTags'
import type { Seed } from '../../types'
import './SeedView.css'

export interface SeedViewProps {
  seed: Seed
  onTagClick?: (tagId: string, tagName: string) => void
  tagColors?: Map<string, string> // Optional map of tag names (lowercase) to colors
  isEditing?: boolean
  onContentChange?: (content: string) => void
  onTagRemove?: (tagId: string) => void
  editedContent?: string
  editedTags?: Array<{ id: string; name: string }>
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
 * - Editing mode: editable content and removable tags
 */
export function SeedView({ 
  seed, 
  onTagClick, 
  tagColors,
  isEditing = false,
  onContentChange,
  onTagRemove,
  editedContent,
  editedTags,
}: SeedViewProps) {
  const navigate = useNavigate()
  const originalContent = seed.currentState?.seed || ''
  const originalTags = seed.currentState?.tags || []
  const seedCategories = seed.currentState?.categories || []
  
  // Use edited values if provided, otherwise use original
  const content = editedContent !== undefined ? editedContent : originalContent
  const seedTags = editedTags !== undefined ? editedTags : originalTags
  
  // Get primary category (first one, or empty)
  const primaryCategory = seedCategories.length > 0 ? seedCategories[0] : null

  const handleTagClick = (tag: { id: string; name: string }, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (!isEditing) {
      onTagClick?.(tag.id, tag.name)
    }
  }

  const handleHashTagClick = (tagName: string) => {
    if (!isEditing) {
      // Look up the tag ID from seedTags by matching the tag name (case-insensitive)
      const matchingTag = seedTags.find(
        tag => tag.name.toLowerCase() === tagName.toLowerCase()
      )
      
      if (matchingTag) {
        // Navigate to tag details view (browser history will handle back navigation)
        navigate(`/tags/${matchingTag.id}`)
      }
      // If no matching tag found, do nothing (hashtag doesn't correspond to an actual tag)
    }
  }

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onContentChange?.(e.target.value)
  }

  return (
    <div className="seed-view">
      <div className="seed-view-header">
        {/* Category */}
        {primaryCategory && (
          <div className="seed-view-category">
            {primaryCategory.path}
          </div>
        )}
        {/* Date/time in top-right corner */}
        <div className="seed-view-time">
          {formatSeedTime(seed)}
        </div>
      </div>

      <div className="seed-view-body">
        {/* Seed content - editable in edit mode */}
        {isEditing ? (
          <textarea
            className="seed-view-content seed-view-content-editable"
            value={content}
            onChange={handleContentChange}
            placeholder="Enter seed content..."
            rows={10}
          />
        ) : (
          <div className="seed-view-content">
            {renderHashTags(content, handleHashTagClick, tagColors)}
          </div>
        )}

        {/* Tags with truncation - show X buttons in edit mode */}
        {seedTags.length > 0 && (
          <div className="seed-view-tags">
            {isEditing ? (
              <div className="tag-list">
                {seedTags.map(tag => {
                  const tagColor = tagColors?.get(tag.name.toLowerCase()) ?? null
                  return (
                    <span key={tag.id} className="tag-item tag-item-editable">
                      <span style={tagColor ? { color: tagColor } : {}}>
                        #{tag.name}
                      </span>
                      <button
                        type="button"
                        className="tag-remove-button"
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          onTagRemove?.(tag.id)
                        }}
                        aria-label={`Remove tag ${tag.name}`}
                      >
                        ×
                      </button>
                    </span>
                  )
                })}
              </div>
            ) : (
              <TagList
                tags={seedTags.map(tag => ({
                  id: tag.id,
                  name: tag.name,
                  color: tagColors?.get(tag.name.toLowerCase()) ?? null,
                }))}
                onTagClick={handleTagClick}
                suppressTruncate={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

