import React from 'react'
import { getTagColor } from '../../utils/getTagColor'

interface TagLinkProps {
  tagId: string
  tagName: string
  tagColor?: string | null
  href: string
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  className?: string
}

export function TagLink({ tagId, tagName, tagColor, href, onClick, className = '' }: TagLinkProps) {
  const linkRef = React.useRef<HTMLAnchorElement>(null)
  const finalColor = getTagColor(tagName, tagColor)

  React.useLayoutEffect(() => {
    if (linkRef.current) {
      linkRef.current.style.setProperty('color', finalColor, 'important')
    }
  }, [finalColor])

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.textDecoration = 'underline'
    e.currentTarget.style.setProperty('color', finalColor, 'important')
  }

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.currentTarget.style.textDecoration = 'none'
    e.currentTarget.style.setProperty('color', finalColor, 'important')
  }

  const classes = ['tag-item', className].filter(Boolean).join(' ')

  return (
    <a
      ref={linkRef}
      href={href}
      onClick={onClick}
      className={classes}
      style={{
        textDecoration: 'none',
        color: finalColor,
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      #{tagName}
    </a>
  )
}

