import { useState } from 'react'
import { TagCloud } from '../TagCloud'
import { Panel } from '@mother/components/Panel'
import { Badge } from '@mother/components/Badge'
import { Button } from '@mother/components/Button'
import './Views.css'

export function TagsView() {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set())

  const handleTagSelect = (tagName: string) => {
    setSelectedTags(prev => {
      const newSet = new Set(prev)
      if (newSet.has(tagName)) {
        newSet.delete(tagName)
      } else {
        newSet.add(tagName)
      }
      return newSet
    })
  }

  const clearSelection = () => {
    setSelectedTags(new Set())
  }

  const selectedCount = selectedTags.size

  return (
    <div className="view-container">
      <div className="view-header">
        <h2>Tags</h2>
        <div className="view-actions">
          {selectedCount > 0 && (
            <>
              <Badge variant="primary">{selectedCount} selected</Badge>
              <Button variant="ghost" onClick={clearSelection}>
                Clear
              </Button>
            </>
          )}
        </div>
      </div>
      
      <TagCloud
        onTagSelect={handleTagSelect}
        selectedTags={selectedTags}
      />
      
      {selectedCount > 0 && (
        <Panel variant="elevated" className="tag-selection-info">
          <p className="lead">
            {selectedCount} tag{selectedCount !== 1 ? 's' : ''} selected
          </p>
          <p className="text-secondary">
            Click tags to filter seeds, or click again to deselect.
          </p>
        </Panel>
      )}
    </div>
  )
}

