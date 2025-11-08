import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { Input } from '@mother/components/Input'
import { SeedView } from '../SeedView'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { TransactionHistoryList, type TransactionHistoryMessage } from '../TransactionHistoryList'
import type { TagTransaction, Seed, Tag } from '../../types'
import './Views.css'
import './TagDetailView.css'

interface TagDetail {
  id: string
  name: string
  color: string
  currentState: {
    name: string
    color: string | null
    timestamp: Date
    metadata: Record<string, unknown>
  }
  transactions: TagTransaction[]
}

interface TagDetailViewProps {
  tagName: string
  onBack: () => void
}

/**
 * TagDetailView displays:
 * - Current tag state (computed from transactions)
 * - Transactions history (immutable)
 * - List of seeds using this tag
 */
export function TagDetailView({ tagName, onBack }: TagDetailViewProps) {
  const navigate = useNavigate()
  const [tag, setTag] = useState<TagDetail | null>(null)
  const [seeds, setSeeds] = useState<Seed[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [editingColor, setEditingColor] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [colorInput, setColorInput] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!tagName) {
      setError('Tag name is required')
      setLoading(false)
      return
    }

    loadTagData()
    loadSeeds()
    loadTags()
  }, [tagName])

  const loadTagData = async () => {
    try {
      setLoading(true)
      setError(null)
      // URL-encode the tag name
      const encodedName = encodeURIComponent(tagName)
      const tagData = await api.get<TagDetail>(`/tags/${encodedName}`)
      setTag(tagData)
      setNameInput(tagData.name)
      setColorInput(tagData.color || '')
    } catch (err) {
      console.error('Error loading tag:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tag')
    } finally {
      setLoading(false)
    }
  }

  const loadSeeds = async () => {
    try {
      // URL-encode the tag name
      const encodedName = encodeURIComponent(tagName)
      const seedsData = await api.get<Seed[]>(`/tags/${encodedName}/seeds`)
      setSeeds(seedsData)
    } catch (err) {
      console.error('Error loading seeds:', err)
    }
  }

  const loadTags = async () => {
    try {
      const tagsData = await api.get<Tag[]>('/tags').catch(() => [])
      setTags(tagsData)
    } catch (err) {
      console.error('Error loading tags:', err)
    }
  }

  const handleSaveName = async () => {
    if (!nameInput.trim() || !tag) return
    
    setSaving(true)
    try {
      // URL-encode the tag name
      const encodedName = encodeURIComponent(tag.name)
      const updatedTag = await api.put<TagDetail>(`/tags/${encodedName}`, { name: nameInput.trim() })
      setTag(updatedTag)
      setEditingName(false)
      // If name changed, navigate to new URL
      if (updatedTag.name !== tag.name) {
        navigate(`/tags/${encodeURIComponent(updatedTag.name)}`)
      }
    } catch (err) {
      console.error('Error updating tag name:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveColor = async () => {
    if (!tag) return
    
    setSaving(true)
    try {
      // Convert empty string to null for clearing color
      const colorValue = colorInput.trim() === '' ? null : colorInput.trim()
      // URL-encode the tag name
      const encodedName = encodeURIComponent(tag.name)
      const updatedTag = await api.put<TagDetail>(`/tags/${encodedName}`, { 
        color: colorValue
      })
      setTag(updatedTag)
      setEditingColor(false)
    } catch (err) {
      console.error('Error updating tag color:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleSeedClick = (seed: Seed) => {
    // Navigate using slug if available, otherwise fall back to ID
    const slug = seed.slug || seed.id
    navigate(`/seeds/${slug}`)
  }

  // Build tag color map for SeedView
  const tagColorMap = new Map<string, string>()
  tags.forEach(tag => {
    if (tag.color) {
      tagColorMap.set(tag.name.toLowerCase(), tag.color)
    }
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Helper functions for formatting transactions
  const formatTransactionTitle = (transaction: TagTransaction): string => {
    switch (transaction.transaction_type) {
      case 'creation':
        return 'Tag Created'
      case 'edit':
        return 'Name Changed'
      case 'set_color':
        return 'Color Changed'
      default:
        return transaction.transaction_type
    }
  }

  const formatTransactionContent = (transaction: TagTransaction): string => {
    const parts: string[] = []
    
    switch (transaction.transaction_type) {
      case 'creation': {
        const data = transaction.transaction_data as { name: string; color: string | null }
        parts.push(`Created with name "${data.name}"`)
        if (data.color) {
          parts.push(`Color: ${data.color}`)
        }
        break
      }
      case 'edit': {
        const data = transaction.transaction_data as { name: string }
        parts.push(`Name changed to "${data.name}"`)
        break
      }
      case 'set_color': {
        const data = transaction.transaction_data as { color: string | null }
        if (data.color) {
          parts.push(`Color changed to ${data.color}`)
        } else {
          parts.push('Color removed')
        }
        break
      }
    }

    if (transaction.automation_id) {
      parts.push('(Automated)')
    }

    return parts.join(' • ') || 'Transaction'
  }

  const getTransactionColor = (transaction: TagTransaction): string => {
    switch (transaction.transaction_type) {
      case 'creation':
        return 'var(--accent-green)'
      case 'edit':
        return 'var(--accent-blue)'
      case 'set_color':
        return 'var(--accent-purple)'
      default:
        return 'var(--text-secondary)'
    }
  }

  // Transform transactions into TransactionHistoryMessage format
  // Must be called before early returns to maintain hook order
  const transactionMessages: TransactionHistoryMessage[] = useMemo(() => {
    if (!tag) return []
    return tag.transactions
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .map((transaction) => ({
        id: transaction.id,
        title: formatTransactionTitle(transaction),
        content: formatTransactionContent(transaction),
        time: transaction.created_at,
        groupKey: transaction.transaction_type, // Use transaction type as group key
      }))
  }, [tag])

  const transactionTypeMap = useMemo(() => {
    if (!tag) return new Map<string, TagTransaction>()
    const map = new Map<string, TagTransaction>()
    tag.transactions.forEach(t => map.set(t.id, t))
    return map
  }, [tag])

  const getColor = (message: TransactionHistoryMessage): string => {
    const transaction = transactionTypeMap.get(message.id)
    if (!transaction) return 'var(--text-secondary)'
    return getTransactionColor(transaction)
  }

  if (loading) {
    return (
      <div className="view-container tag-detail-container">
        <div className="tag-detail-header">
          <Button variant="secondary" onClick={onBack}>
            ← Back
          </Button>
        </div>
        <p className="text-secondary">Loading tag...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="view-container tag-detail-container">
        <div className="tag-detail-header">
          <Button variant="secondary" onClick={onBack}>
            ← Back
          </Button>
        </div>
        <p className="text-error">{error}</p>
      </div>
    )
  }

  if (!tag) {
    return (
      <div className="view-container tag-detail-container">
        <div className="tag-detail-header">
          <Button variant="secondary" onClick={onBack}>
            ← Back
          </Button>
        </div>
        <p className="text-secondary">Tag not found.</p>
      </div>
    )
  }

  return (
    <div className="view-container tag-detail-container">
      {/* Header */}
      <div className="tag-detail-header">
        <Button variant="secondary" onClick={onBack}>
          ← Back
        </Button>
        <div className="tag-detail-title-section">
          <h1 className="tag-detail-title">Tag Details</h1>
        </div>
      </div>

      {/* Content */}
      <div className="tag-detail-content">
        {/* Left Column: Tag Info + Timeline */}
        <div className="tag-detail-left-column">
          {/* Tag Info Panel */}
          <Panel variant="elevated" className="tag-detail-info">
            <h3 className="panel-header">Tag Information</h3>
            
            <div className="tag-info-content">
              <div className="tag-name-section">
                <label className="label">Name</label>
                {editingName ? (
                  <div className="tag-name-edit">
                    <Input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      placeholder="Tag name"
                      disabled={saving}
                    />
                    <div className="tag-edit-actions">
                      <Button 
                        variant="primary" 
                        onClick={handleSaveName}
                        disabled={saving || !nameInput.trim()}
                      >
                        Save
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setEditingName(false)
                          setNameInput(tag.name)
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="tag-name-display">
                    <span className="tag-name-text">{tag.name}</span>
                    <Button 
                      variant="secondary" 
                      onClick={() => setEditingName(true)}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              <div className="tag-color-section">
                <label className="label">Color</label>
                {editingColor ? (
                  <div className="tag-color-edit">
                    <div className="tag-color-picker-wrapper">
                      <HexColorPicker
                        color={colorInput && colorInput.trim() !== '' ? colorInput : '#000000'}
                        onChange={setColorInput}
                      />
                      <div className="tag-color-input-wrapper">
                        <HexColorInput
                          color={colorInput && colorInput.trim() !== '' ? colorInput : '#000000'}
                          onChange={setColorInput}
                          prefixed
                          className="tag-color-hex-input"
                          placeholder="#000000"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => {
                            setColorInput('')
                          }}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                    <div className="tag-edit-actions">
                      <Button 
                        variant="primary" 
                        onClick={handleSaveColor}
                        disabled={saving}
                      >
                        Save
                      </Button>
                      <Button 
                        variant="secondary" 
                        onClick={() => {
                          setEditingColor(false)
                          setColorInput(tag.color || '')
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="tag-color-display">
                    <div className="tag-color-preview" style={{ backgroundColor: tag.color || 'transparent' }} />
                    <span className="tag-color-text">{tag.color || 'No color'}</span>
                    <Button 
                      variant="secondary" 
                      onClick={() => {
                        setEditingColor(true)
                        setColorInput(tag.color || '#000000')
                      }}
                    >
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              <div className="tag-usage-stats">
                <div className="usage-stat">
                  <span className="stat-label">Used by</span>
                  <span className="stat-value">{seeds.length} seeds</span>
                </div>
                <div className="usage-stat">
                  <span className="stat-label">Created</span>
                  <span className="stat-value">{formatDate(tag.currentState.timestamp.toString())}</span>
                </div>
              </div>
            </div>
          </Panel>

          {/* Transactions Panel */}
          <Panel variant="elevated" className="tag-detail-timeline">
            <h3 className="panel-header">Transactions</h3>
            <TransactionHistoryList messages={transactionMessages} getColor={getColor} />
          </Panel>
        </div>

        {/* Right Column: Seeds */}
        <div className="tag-detail-right-column">
          <Panel variant="elevated" className="tag-detail-seeds">
            <h3 className="panel-header">Seeds Using This Tag</h3>
            <div className="tag-detail-seeds-list">
              {seeds.length === 0 ? (
                <p className="text-secondary">No seeds are using this tag yet.</p>
              ) : (
                <div className="seeds-list">
                  {seeds.map((seed) => (
                    <div 
                      key={seed.id} 
                      className="seed-item"
                      onClick={() => handleSeedClick(seed)}
                    >
                      <SeedView
                        seed={seed}
                        tagColors={tagColorMap}
                        onTagClick={(clickedTagId, clickedTagName) => {
                          navigate(`/tags/${encodeURIComponent(clickedTagName)}`)
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
