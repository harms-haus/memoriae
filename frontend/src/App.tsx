import React, { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Tabs, Tab, TabPanel } from '../../mother-theme/src/components/Tabs'
import { Button } from '../../mother-theme/src/components/Button'
import { Panel } from '../../mother-theme/src/components/Panel'
import { SeedEditor } from './components/SeedEditor'
import {
  SeedsView,
  TimelineView,
  CategoriesView,
  TagsView,
  SettingsView,
  SeedDetailView,
} from './components/views'
import { 
  FileText, 
  Clock, 
  FolderTree, 
  Tags, 
  Settings 
} from 'lucide-react'

export type ViewType = 'seeds' | 'timeline' | 'categories' | 'tags' | 'settings'

function LoginPage() {
  const { login } = useAuth()
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    // Check for OAuth errors in URL
    const params = new URLSearchParams(window.location.search)
    const errorParam = params.get('error')
    if (errorParam) {
      setError('Authentication failed. Please try again.')
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleLogin = (provider: 'google' | 'github') => {
    const redirect = window.location.pathname !== '/login' ? window.location.pathname : undefined
    login(provider, redirect)
  }

  return (
    <div className="flex flex-col items-center justify-center" style={{
      minHeight: '100vh',
      padding: 'var(--space-6)',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
    }}>
      <h1 style={{
        fontSize: 'var(--text-2xl)',
        fontWeight: 'var(--weight-bold)',
        marginBottom: 'var(--space-8)',
      }}>Memoriae</h1>
      
      <Panel className="max-w-[400px] w-full">
        <h2 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--weight-semibold)',
          marginBottom: 'var(--space-6)',
        }}>Sign in to continue</h2>
        
        {error && (
          <Panel variant="elevated" className="mb-6">
            {error}
          </Panel>
        )}

        <div className="flex flex-col gap-4">
          <Button variant="secondary" onClick={() => handleLogin('google')}>
            Sign in with Google
          </Button>
          
          <Button variant="secondary" onClick={() => handleLogin('github')}>
            Sign in with GitHub
          </Button>
        </div>
      </Panel>
    </div>
  )
}

function AppContent() {
  const { authenticated, loading } = useAuth()
  const [activeView, setActiveView] = useState<ViewType>('seeds')
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
      }}>
        Loading...
      </div>
    )
  }

  if (!authenticated) {
    return <LoginPage />
  }

  const showEditor = activeView !== 'settings'

  // If a seed is selected, show detail view (outside tabs)
  if (selectedSeedId) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        overflow: 'hidden',
      }}>
        <div style={{
          flex: '1 1 auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: showEditor ? '180px' : '72px',
        }}>
          <SeedDetailView
            seedId={selectedSeedId}
            onBack={() => setSelectedSeedId(null)}
          />
        </div>
        {showEditor && <SeedEditor />}
      </div>
    )
  }

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      overflow: 'hidden',
    }}>
      <div style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}>
        <div style={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          paddingBottom: showEditor ? '180px' : '72px',
        }}>
          <Tabs 
            orientation="top" 
            value={activeView} 
            onValueChange={(value) => setActiveView(value as ViewType)}
            className="flex-1 flex flex-col min-h-0"
          >
          <TabPanel value="seeds">
            <SeedsView onSeedSelect={setSelectedSeedId} />
          </TabPanel>
          <TabPanel value="timeline">
            <TimelineView onSeedSelect={setSelectedSeedId} />
          </TabPanel>
          <TabPanel value="categories">
            <CategoriesView />
          </TabPanel>
          <TabPanel value="tags">
            <TagsView />
          </TabPanel>
          <TabPanel value="settings">
            <SettingsView />
          </TabPanel>

          <Tab value="seeds">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
              <FileText size={24} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Seeds</span>
            </div>
          </Tab>
          <Tab value="timeline">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Clock size={24} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Timeline</span>
            </div>
          </Tab>
          <Tab value="categories">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
              <FolderTree size={24} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Categories</span>
            </div>
          </Tab>
          <Tab value="tags">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Tags size={24} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Tags</span>
            </div>
          </Tab>
          <Tab value="settings">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
              <Settings size={24} />
              <span style={{ fontSize: 'var(--text-xs)' }}>Settings</span>
            </div>
          </Tab>
        </Tabs>
        </div>
      </div>
      
      {showEditor && <SeedEditor />}
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
