import React, { useRef, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Tabs, Tab, TabPanel } from '@mother/components/Tabs'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { SeedComposer } from './components/SeedComposer'
import './components/SeedComposer/SeedComposer.css'
import { useFollowupNotifications } from './hooks/useFollowupNotifications'
import { 
  FileText, 
  FolderTree, 
  Tags, 
  Settings,
  Plus,
  Lightbulb
} from 'lucide-react'

// Lazy load view components for code splitting (import from individual files for better chunking)
const SeedsView = lazy(() => import('./components/views/SeedsView').then(m => ({ default: m.SeedsView })))
const CategoriesView = lazy(() => import('./components/views/CategoriesView').then(m => ({ default: m.CategoriesView })))
const TagsView = lazy(() => import('./components/views/TagsView').then(m => ({ default: m.TagsView })))
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })))
const SeedDetailView = lazy(() => import('./components/views/SeedDetailView').then(m => ({ default: m.SeedDetailView })))
const TagDetailView = lazy(() => import('./components/views/TagDetailView').then(m => ({ default: m.TagDetailView })))
const MusingsView = lazy(() => import('./components/views/MusingsView').then(m => ({ default: m.MusingsView })))

export type ViewType = 'seeds' | 'categories' | 'tags' | 'settings' | 'musings'

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

function TabNavigation({ children }: { children?: React.ReactNode }) {
  const location = useLocation()
  const navigate = useNavigate()
  const seedsViewRefreshRef = useRef<(() => void) | null>(null)
  const categoriesViewRefreshRef = useRef<(() => void) | null>(null)
  const [isComposerOpen, setIsComposerOpen] = React.useState(false)
  const [isComposerClosing, setIsComposerClosing] = React.useState(false)
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  // Determine active view from current route
  const getActiveView = (): ViewType => {
    const path = location.pathname
    if (path.startsWith('/seeds/') && path !== '/seeds') {
      // Check if it's a tag filter route
      if (path.startsWith('/seeds/tag/')) {
        return 'seeds'
      }
      // Seed detail view - show seeds tab as active
      return 'seeds'
    }
    if (path.startsWith('/tags/') && path !== '/tags') {
      // Tag detail view - show tags tab as active
      return 'tags'
    }
    if (path === '/categories' || path.startsWith('/category/')) return 'categories'
    if (path === '/tags') return 'tags'
    if (path === '/settings') return 'settings'
    if (path === '/musings') return 'musings'
    return 'seeds' // default
  }

  const activeView = getActiveView()
  const showComposerButton = activeView === 'seeds' || 
                             activeView === 'categories' || 
                             activeView === 'tags' ||
                             activeView === 'musings'
  const isSeedDetail = location.pathname.startsWith('/seeds/') && 
                       location.pathname !== '/seeds' &&
                       !location.pathname.startsWith('/seeds/tag/')

  const handleTabChange = (value: string) => {
    const routeMap: Record<string, string> = {
      'seeds': '/seeds',
      'categories': '/categories',
      'tags': '/tags',
      'settings': '/settings',
      'musings': '/musings',
    }
    navigate(routeMap[value] || '/seeds')
  }

  const handleSeedSelect = (seedId: string) => {
    navigate(`/seeds/${seedId}`)
  }

  const handleSeedCreated = () => {
    // Trigger refresh in all views that have refresh functions
    seedsViewRefreshRef.current?.()
    categoriesViewRefreshRef.current?.()
    // Close composer after seed is created
    handleCloseComposer()
  }

  const handleCloseComposer = () => {
    setIsComposerClosing(true)
    // Clear any existing timeout
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current)
    }
    // Wait for animation to complete before removing component
    closeTimeoutRef.current = setTimeout(() => {
      setIsComposerOpen(false)
      setIsComposerClosing(false)
    }, 300) // Match CSS transition duration
  }

  // Cleanup timeout on unmount
  React.useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current)
      }
    }
  }, [])

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
        <div 
          className="tab-content-wrapper"
          style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
          }}>
          <Tabs 
            orientation="top" 
            value={activeView} 
            onValueChange={handleTabChange}
            className="flex-1 flex flex-col min-h-0"
            expand={true}
          >
            <TabPanel value="seeds">
              <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
                <SeedsView 
                  onSeedSelect={handleSeedSelect}
                  refreshRef={seedsViewRefreshRef}
                />
              </Suspense>
            </TabPanel>
            <TabPanel value="musings">
              <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
                <MusingsView />
              </Suspense>
            </TabPanel>
            <TabPanel value="categories">
              <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
                <CategoriesView refreshRef={categoriesViewRefreshRef} />
              </Suspense>
            </TabPanel>
            <TabPanel value="tags">
              <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
                <TagsView />
              </Suspense>
            </TabPanel>
            <TabPanel value="settings">
              <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
                <SettingsView />
              </Suspense>
            </TabPanel>

            <Tab value="seeds">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <FileText size={24} />
                <span style={{ fontSize: 'var(--text-xs)' }}>Seeds</span>
              </div>
            </Tab>
            <Tab value="musings">
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-1)' }}>
                <Lightbulb size={24} />
                <span style={{ fontSize: 'var(--text-xs)' }}>Musings</span>
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
      
      {/* Floating + button to open composer */}
      {showComposerButton && !isSeedDetail && !isComposerOpen && (
        <button
          className="seed-composer-fab"
          onClick={() => {
            setIsComposerClosing(false)
            setIsComposerOpen(true)
          }}
          aria-label="Create new seed"
        >
          <Plus size={24} />
        </button>
      )}
      
      {/* Seed composer - only shown when opened */}
      {isComposerOpen && !isSeedDetail && (
        <div 
          className={`seed-composer-wrapper ${isComposerClosing ? 'seed-composer-wrapper-closing' : ''}`}
          style={{
            position: 'fixed',
            bottom: '72px', // Default: above tabs (72px tall)
            left: 0,
            right: 0,
            zIndex: 999,
          }}>
          <SeedComposer 
            onSeedCreated={handleSeedCreated}
            onClose={handleCloseComposer}
            isClosing={isComposerClosing}
          />
        </div>
      )}
      {children}
    </div>
  )
}

function SeedDetailWrapper() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    navigate('/seeds')
    return null
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
      <div className="tab-content-wrapper" style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
          <SeedDetailView
            seedId={id}
            onBack={() => navigate('/seeds')}
          />
        </Suspense>
      </div>
    </div>
  )
}

function TagDetailWrapper() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  if (!id) {
    navigate('/tags')
    return null
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
      <div className="tab-content-wrapper" style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
      }}>
        <Suspense fallback={<div className="flex items-center justify-center" style={{ height: '100%' }}>Loading...</div>}>
          <TagDetailView
            tagId={id}
            onBack={() => navigate('/tags')}
          />
        </Suspense>
      </div>
    </div>
  )
}

function AppContent() {
  const { authenticated, loading } = useAuth()
  
  // Set up follow-up notifications when authenticated
  useFollowupNotifications()

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

  return (
    <Routes>
      <Route path="/" element={<TabNavigation />} />
      <Route path="/seeds" element={<TabNavigation />} />
      <Route path="/seeds/tag/:tagName" element={<TabNavigation />} />
      <Route path="/seeds/:id" element={<SeedDetailWrapper />} />
      <Route path="/categories" element={<TabNavigation />} />
      <Route path="/category/*" element={<TabNavigation />} />
      <Route path="/tags" element={<TabNavigation />} />
      <Route path="/tags/:id" element={<TagDetailWrapper />} />
      <Route path="/settings" element={<TabNavigation />} />
      <Route path="/musings" element={<TabNavigation />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
