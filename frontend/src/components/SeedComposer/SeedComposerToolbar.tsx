import { useState } from 'react'
import { Bold, Italic, Link, Heading, List, Code } from 'lucide-react'
import { Button } from '@mother/components/Button'
import './SeedComposer.css'

interface SeedComposerToolbarProps {
  position: { top: number; left: number }
  visible: boolean
  onBold: () => void
  onItalic: () => void
  onLink: () => void
  onHeader: (level: number) => void
  onList: (ordered: boolean) => void
  onCodeBlock: () => void
}

export function SeedComposerToolbar({
  position,
  visible,
  onBold,
  onItalic,
  onLink,
  onHeader,
  onList,
  onCodeBlock,
}: SeedComposerToolbarProps) {
  const [showHeaderMenu, setShowHeaderMenu] = useState(false)
  const [showListMenu, setShowListMenu] = useState(false)

  // Convert absolute position to relative positioning
  const style: React.CSSProperties = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: 'translateX(-50%)', // Center horizontally
    zIndex: 1000,
  }

  return (
    <div className={`seed-composer-toolbar ${visible ? 'visible' : ''}`} style={style}>
      <Button
        variant="ghost"
        onClick={onBold}
        className="seed-composer-toolbar-button"
        aria-label="Bold"
      >
        <Bold size={16} />
      </Button>
      
      <Button
        variant="ghost"
        onClick={onItalic}
        className="seed-composer-toolbar-button"
        aria-label="Italic"
      >
        <Italic size={16} />
      </Button>
      
      <Button
        variant="ghost"
        onClick={onLink}
        className="seed-composer-toolbar-button"
        aria-label="Link"
      >
        <Link size={16} />
      </Button>
      
      <div className="seed-composer-toolbar-divider" />
      
      <div className="seed-composer-toolbar-menu">
        <Button
          variant="ghost"
          onClick={() => setShowHeaderMenu(!showHeaderMenu)}
          className="seed-composer-toolbar-button"
          aria-label="Heading"
        >
          <Heading size={16} />
        </Button>
        {showHeaderMenu && (
          <div className="seed-composer-toolbar-menu-dropdown">
            {[1, 2, 3, 4, 5, 6].map((level) => (
              <button
                key={level}
                className="seed-composer-toolbar-menu-item"
                onClick={() => {
                  onHeader(level)
                  setShowHeaderMenu(false)
                }}
              >
                H{level}
              </button>
            ))}
          </div>
        )}
      </div>
      
      <div className="seed-composer-toolbar-menu">
        <Button
          variant="ghost"
          onClick={() => setShowListMenu(!showListMenu)}
          className="seed-composer-toolbar-button"
          aria-label="List"
        >
          <List size={16} />
        </Button>
        {showListMenu && (
          <div className="seed-composer-toolbar-menu-dropdown">
            <button
              className="seed-composer-toolbar-menu-item"
              onClick={() => {
                onList(false)
                setShowListMenu(false)
              }}
            >
              Unordered List
            </button>
            <button
              className="seed-composer-toolbar-menu-item"
              onClick={() => {
                onList(true)
                setShowListMenu(false)
              }}
            >
              Ordered List
            </button>
          </div>
        )}
      </div>
      
      <Button
        variant="ghost"
        onClick={onCodeBlock}
        className="seed-composer-toolbar-button"
        aria-label="Code Block"
      >
        <Code size={16} />
      </Button>
    </div>
  )
}

