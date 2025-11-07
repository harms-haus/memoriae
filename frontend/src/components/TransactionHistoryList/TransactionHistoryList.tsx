import { useMemo } from 'react'
import './TransactionHistoryList.css'

export interface TransactionHistoryMessage {
  id: string
  title: string
  content: string
  time: string | Date
  groupKey?: string // Optional key for grouping consecutive messages of the same type
}

interface GroupedMessage {
  messages: TransactionHistoryMessage[]
  isGrouped: boolean
}

interface TransactionHistoryListProps {
  messages: TransactionHistoryMessage[]
  getColor: (message: TransactionHistoryMessage) => string
  groupThresholdMs?: number // Maximum time difference in ms for grouping (default: 60000 = 1 minute)
}

export function TransactionHistoryList({ 
  messages, 
  getColor,
  groupThresholdMs = 60000 // Default: 1 minute
}: TransactionHistoryListProps) {
  const formatRelativeTime = (date: string | Date): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = now.getTime() - dateObj.getTime()
    
    // Check if it's today
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const messageDate = new Date(dateObj)
    messageDate.setHours(0, 0, 0, 0)
    const isToday = messageDate.getTime() === today.getTime()
    
    if (!isToday) {
      // Not today - show date
      return dateObj.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: dateObj.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
    
    // Today - show relative time
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`
    }
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`
    }
    return `${diffHours}hr ago`
  }

  if (messages.length === 0) {
    return <p className="text-secondary">No transactions yet.</p>
  }

  // Sort messages descending (newest first)
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = typeof a.time === 'string' ? new Date(a.time).getTime() : a.time.getTime()
    const timeB = typeof b.time === 'string' ? new Date(b.time).getTime() : b.time.getTime()
    return timeB - timeA
  })

  // Group consecutive messages of the same type
  const groupedMessages: GroupedMessage[] = useMemo(() => {
    if (sortedMessages.length === 0) return []

    const groups: GroupedMessage[] = []
    let currentGroup: TransactionHistoryMessage[] = []
    let currentGroupKey: string | undefined = undefined
    let groupNewestTime: number | null = null // Time of the newest message in the current group

    for (const message of sortedMessages) {
      const messageTime = typeof message.time === 'string' ? new Date(message.time).getTime() : message.time.getTime()
      const messageGroupKey = message.groupKey || message.title

      // Check if we should start a new group
      const shouldStartNewGroup = 
        currentGroup.length === 0 || // First message
        currentGroupKey !== messageGroupKey || // Different type
        (groupNewestTime !== null && (groupNewestTime - messageTime) > groupThresholdMs) // Too much time difference

      if (shouldStartNewGroup) {
        // Save current group if it exists
        if (currentGroup.length > 0) {
          groups.push({
            messages: currentGroup,
            isGrouped: currentGroup.length > 1,
          })
        }
        // Start new group
        currentGroup = [message]
        currentGroupKey = messageGroupKey
        groupNewestTime = messageTime // This is the newest message in the new group
      } else {
        // Add to current group (message is older than groupNewestTime)
        currentGroup.push(message)
        // groupNewestTime stays the same (it's the newest time in the group)
      }
    }

    // Don't forget the last group
    if (currentGroup.length > 0) {
      groups.push({
        messages: currentGroup,
        isGrouped: currentGroup.length > 1,
      })
    }

    return groups
  }, [sortedMessages, groupThresholdMs])

  const renderGroupedContent = (group: GroupedMessage): string => {
    if (!group.isGrouped || group.messages.length === 0) {
      return group.messages[0]?.content || ''
    }

    const firstMessage = group.messages[0]
    if (!firstMessage) return ''

    // Check if this is a group of tag additions
    const isTagGroup = firstMessage.title === 'Tag Added' || firstMessage.title.includes('Tag')
    
    if (isTagGroup) {
      // Extract tag names from content (format: "Tag: tag_name" or "Tag: tag_name • (Automated)")
      const tagNames: string[] = []
      let hasAutomated = false
      
      group.messages.forEach(msg => {
        if (msg.content) {
          // Extract tag name from "Tag: tag_name" format
          const tagMatch = msg.content.match(/Tag:\s*([^•]+)/)
          if (tagMatch && tagMatch[1]) {
            const tagName = tagMatch[1].trim()
            if (tagName && !tagNames.includes(tagName)) {
              tagNames.push(tagName)
            }
          }
          // Check if automated
          if (msg.content.includes('(Automated)') || msg.content.includes('Automated')) {
            hasAutomated = true
          }
        }
      })

      if (tagNames.length > 0) {
        const tagsList = tagNames.join(', ')
        return hasAutomated ? `Tags: ${tagsList} (automated)` : `Tags: ${tagsList}`
      }
    }

    // For other grouped messages, show unique content items
    const uniqueContents = new Set<string>()
    group.messages.forEach(msg => {
      if (msg.content) {
        uniqueContents.add(msg.content)
      }
    })

    if (uniqueContents.size === 1) {
      // All same content - show count
      return `${group.messages.length}x ${Array.from(uniqueContents)[0]}`
    }

    // Different contents - show first few
    const contents = Array.from(uniqueContents).slice(0, 3)
    if (uniqueContents.size > 3) {
      contents.push(`+${uniqueContents.size - 3} more`)
    }
    return contents.join(', ')
  }

  return (
    <div className="transaction-history-list">
      {groupedMessages.map((group, groupIndex) => {
        const firstMessage = group.messages[0]
        if (!firstMessage) return null
        
        const color = getColor(firstMessage)
        const isGrouped = group.isGrouped && group.messages.length > 1

        return (
          <div
            key={`group-${groupIndex}-${firstMessage.id}`}
            className="transaction-history-item"
            style={{
              borderLeftColor: color,
            }}
          >
            <div className="transaction-history-header">
              <span
                className="transaction-history-title"
                style={{
                  color: color,
                }}
              >
                {isGrouped 
                  ? (firstMessage.title === 'Tag Added' 
                      ? 'Tags Added'
                      : `${group.messages.length}x ${firstMessage.title}`)
                  : firstMessage.title}
              </span>
              <span className="transaction-history-time">
                {formatRelativeTime(firstMessage.time)}
              </span>
            </div>
            <div className="transaction-history-content">
              {renderGroupedContent(group)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

