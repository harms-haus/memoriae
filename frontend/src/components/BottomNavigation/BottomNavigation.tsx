import React from 'react'
import { 
  FileText, 
  Clock, 
  FolderTree, 
  Tags, 
  Settings 
} from 'lucide-react'
import './BottomNavigation.css'

export type ViewType = 'seeds' | 'timeline' | 'categories' | 'tags' | 'settings'

interface BottomNavigationProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export function BottomNavigation({ activeView, onViewChange }: BottomNavigationProps) {
  const tabs: Array<{ id: ViewType; icon: React.ReactNode; label: string }> = [
    { id: 'seeds', icon: <FileText size={24} />, label: 'Seeds' },
    { id: 'timeline', icon: <Clock size={24} />, label: 'Timeline' },
    { id: 'categories', icon: <FolderTree size={24} />, label: 'Categories' },
    { id: 'tags', icon: <Tags size={24} />, label: 'Tags' },
    { id: 'settings', icon: <Settings size={24} />, label: 'Settings' },
  ]

  return (
    <nav className="bottom-navigation">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav-item ${activeView === tab.id ? 'active' : ''}`}
          onClick={() => onViewChange(tab.id)}
          aria-label={tab.label}
        >
          {tab.icon}
          <span className="bottom-nav-label">{tab.label}</span>
        </button>
      ))}
    </nav>
  )
}

