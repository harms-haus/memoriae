// App component tests - routing, navigation, composer
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Use vi.hoisted to ensure routeStore is accessible to the mock
const routeStore = vi.hoisted(() => ({ current: '/' }))

// Mock BrowserRouter to use MemoryRouter with test route
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: any) => {
      // Read route from hoisted store at render time
      return <MemoryRouter initialEntries={[routeStore.current]}>{children}</MemoryRouter>
    },
  }
})

// Test helper to render App with a specific route
function renderAppWithRoute(route: string) {
  routeStore.current = route
  return render(<App />)
}

// Mock AuthContext
const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockCheckAuth = vi.fn()

const mockUseAuth = vi.fn(() => ({
  authenticated: true,
  loading: false,
  user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
  error: null,
  login: mockLogin,
  logout: mockLogout,
  checkAuth: mockCheckAuth,
}))

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => mockUseAuth(),
}))

// Mock lazy-loaded components
vi.mock('./components/views/SeedsView', () => ({
  SeedsView: ({ onSeedSelect, refreshRef }: any) => {
    if (refreshRef) refreshRef.current = vi.fn()
    return (
      <div data-testid="seeds-view">
        <button
          data-testid="seed-1"
          onClick={() => onSeedSelect?.('seed-1')}
        >
          Seed 1
        </button>
      </div>
    )
  },
}))

vi.mock('./components/views/CategoriesView', () => ({
  CategoriesView: ({ refreshRef }: any) => {
    if (refreshRef) refreshRef.current = vi.fn()
    return <div data-testid="categories-view">Categories</div>
  },
}))

vi.mock('./components/views/TagsView', () => ({
  TagsView: () => <div data-testid="tags-view">Tags</div>,
}))

vi.mock('./components/views/SettingsView', () => ({
  SettingsView: () => <div data-testid="settings-view">Settings</div>,
}))

vi.mock('./components/views/SeedDetailView', () => ({
  SeedDetailView: ({ seedId, onBack }: any) => (
    <div data-testid="seed-detail-view">
      <div>Seed Detail: {seedId}</div>
      <button data-testid="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}))

vi.mock('./components/views/TagDetailView', () => ({
  TagDetailView: ({ tagId, onBack }: any) => (
    <div data-testid="tag-detail-view">
      <div>Tag Detail: {tagId}</div>
      <button data-testid="back-button" onClick={onBack}>
        Back
      </button>
    </div>
  ),
}))

vi.mock('./components/views/MusingsView', () => ({
  MusingsView: () => <div data-testid="musings-view">Musings</div>,
}))

// Mock SeedComposer
vi.mock('./components/SeedComposer', () => ({
  SeedComposer: ({ onSeedCreated, onClose, isClosing }: any) => (
    <div data-testid="seed-composer" data-closing={isClosing}>
      <button data-testid="create-seed" onClick={() => onSeedCreated?.()}>
        Create
      </button>
      <button data-testid="close-composer" onClick={onClose}>
        Close
      </button>
    </div>
  ),
}))

// Mock mother-theme components
vi.mock('@mother/components/Tabs', () => ({
  Tabs: ({ children, value, onValueChange, className }: any) => (
    <div data-testid="tabs" data-value={value} className={className}>
      {children}
    </div>
  ),
  Tab: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabPanel: ({ children, value }: any) => (
    <div data-testid={`tab-panel-${value}`}>{children}</div>
  ),
}))

vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button data-testid="button" data-variant={variant} onClick={onClick}>
      {children}
    </button>
  ),
}))

vi.mock('@mother/components/Panel', () => ({
  Panel: ({ children, variant, className }: any) => (
    <div data-testid="panel" data-variant={variant} className={className}>
      {children}
    </div>
  ),
}))

// Mock hooks
vi.mock('./hooks/useFollowupNotifications', () => ({
  useFollowupNotifications: () => {},
}))

// Mock icons
vi.mock('lucide-react', () => ({
  FileText: () => <div data-testid="icon-filetext" />,
  FolderTree: () => <div data-testid="icon-foldertree" />,
  Tags: () => <div data-testid="icon-tags" />,
  Settings: () => <div data-testid="icon-settings" />,
  Plus: () => <div data-testid="icon-plus" />,
  Lightbulb: () => <div data-testid="icon-lightbulb" />,
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset route to default
    routeStore.current = '/'
  })

  describe('Routing', () => {
    it('should render seeds view at /seeds', () => {
      renderAppWithRoute('/seeds')

      expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
    })

    it('should render categories view at /categories', () => {
      renderAppWithRoute('/categories')

      expect(screen.getByTestId('categories-view')).toBeInTheDocument()
    })

    it('should render tags view at /tags', () => {
      renderAppWithRoute('/tags')

      expect(screen.getByTestId('tags-view')).toBeInTheDocument()
    })

    it('should render settings view at /settings', () => {
      renderAppWithRoute('/settings')

      expect(screen.getByTestId('settings-view')).toBeInTheDocument()
    })

    it('should render musings view at /musings', () => {
      renderAppWithRoute('/musings')

      expect(screen.getByTestId('musings-view')).toBeInTheDocument()
    })

    it('should render seed detail view at /seeds/:id', () => {
      renderAppWithRoute('/seeds/seed-123')

      expect(screen.getByTestId('seed-detail-view')).toBeInTheDocument()
      expect(screen.getByText('Seed Detail: seed-123')).toBeInTheDocument()
    })

    it('should render tag detail view at /tags/:id', () => {
      renderAppWithRoute('/tags/tag-123')

      expect(screen.getByTestId('tag-detail-view')).toBeInTheDocument()
      expect(screen.getByText('Tag Detail: tag-123')).toBeInTheDocument()
    })

    it('should default to seeds view at /', () => {
      renderAppWithRoute('/')

      expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should show seeds tab as active on /seeds', () => {
      renderAppWithRoute('/seeds')

      const tabs = screen.getByTestId('tabs')
      expect(tabs).toHaveAttribute('data-value', 'seeds')
    })

    it('should show seeds tab as active on /seeds/:id', () => {
      renderAppWithRoute('/seeds/seed-123')

      const tabs = screen.getByTestId('tabs')
      expect(tabs).toHaveAttribute('data-value', 'seeds')
    })

    it('should show tags tab as active on /tags/:id', () => {
      renderAppWithRoute('/tags/tag-123')

      const tabs = screen.getByTestId('tabs')
      expect(tabs).toHaveAttribute('data-value', 'tags')
    })

    it('should handle tab change', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      const categoriesTab = screen.getByTestId('tab-categories')
      await user.click(categoriesTab)

      // Should navigate to categories
      await waitFor(() => {
        expect(screen.getByTestId('categories-view')).toBeInTheDocument()
      })
    })
  })

  describe('Seed Composer', () => {
    it('should show composer FAB on seeds view', () => {
      renderAppWithRoute('/seeds')

      const fab = screen.getByLabelText('Create new seed')
      expect(fab).toBeInTheDocument()
    })

    it('should show composer FAB on categories view', () => {
      renderAppWithRoute('/categories')

      const fab = screen.getByLabelText('Create new seed')
      expect(fab).toBeInTheDocument()
    })

    it('should show composer FAB on tags view', () => {
      renderAppWithRoute('/tags')

      const fab = screen.getByLabelText('Create new seed')
      expect(fab).toBeInTheDocument()
    })

    it('should not show composer FAB on settings view', () => {
      renderAppWithRoute('/settings')

      const fab = screen.queryByLabelText('Create new seed')
      expect(fab).not.toBeInTheDocument()
    })

    it('should not show composer FAB on seed detail view', () => {
      renderAppWithRoute('/seeds/seed-123')

      const fab = screen.queryByLabelText('Create new seed')
      expect(fab).not.toBeInTheDocument()
    })

    it('should open composer when FAB is clicked', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      const fab = screen.getByLabelText('Create new seed')
      await user.click(fab)

      expect(screen.getByTestId('seed-composer')).toBeInTheDocument()
    })

    it('should close composer when close button is clicked', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      // Open composer
      const fab = screen.getByLabelText('Create new seed')
      await user.click(fab)

      expect(screen.getByTestId('seed-composer')).toBeInTheDocument()

      // Close composer
      const closeButton = screen.getByTestId('close-composer')
      await user.click(closeButton)

      // Wait for animation
      await waitFor(() => {
        expect(screen.queryByTestId('seed-composer')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })

    it('should close composer when seed is created', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      // Open composer
      const fab = screen.getByLabelText('Create new seed')
      await user.click(fab)

      // Create seed
      const createButton = screen.getByTestId('create-seed')
      await user.click(createButton)

      // Wait for composer to close
      await waitFor(() => {
        expect(screen.queryByTestId('seed-composer')).not.toBeInTheDocument()
      }, { timeout: 500 })
    })
  })

  describe('Seed Selection', () => {
    it('should navigate to seed detail when seed is selected', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      const seedButton = screen.getByTestId('seed-1')
      await user.click(seedButton)

      await waitFor(() => {
        expect(screen.getByTestId('seed-detail-view')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading when auth is loading', () => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        loading: true,
        user: null as any,
        error: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(<App />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    it('should show login page when not authenticated', () => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        loading: false,
        user: null as any,
        error: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(<App />)

      expect(screen.getByText('Memoriae')).toBeInTheDocument()
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    })

    it('should handle Google login', async () => {
      const user = userEvent.setup()
      mockUseAuth.mockReturnValue({
        authenticated: false,
        loading: false,
        user: null as any,
        error: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(<App />)

      const googleButton = screen.getByText('Sign in with Google')
      await user.click(googleButton)

      // The login function passes window.location.pathname if not '/login'
      // Since we're at '/', it will pass '/'
      expect(mockLogin).toHaveBeenCalledWith('google', '/')
    })

    it('should handle GitHub login', async () => {
      const user = userEvent.setup()
      mockUseAuth.mockReturnValue({
        authenticated: false,
        loading: false,
        user: null as any,
        error: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(<App />)

      const githubButton = screen.getByText('Sign in with GitHub')
      await user.click(githubButton)

      // The login function passes window.location.pathname if not '/login'
      // Since we're at '/', it will pass '/'
      expect(mockLogin).toHaveBeenCalledWith('github', '/')
    })

    it('should handle OAuth errors in URL', () => {
      mockUseAuth.mockReturnValue({
        authenticated: false,
        loading: false,
        user: null as any,
        error: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      // Mock URL with error
      const originalSearch = window.location.search
      Object.defineProperty(window, 'location', {
        value: { search: '?error=oauth_failed', pathname: '/login' },
        writable: true,
      })

      renderAppWithRoute('/login?error=oauth_failed')

      expect(screen.getByText('Authentication failed. Please try again.')).toBeInTheDocument()

      // Restore
      Object.defineProperty(window, 'location', {
        value: { search: originalSearch },
        writable: true,
      })
    })
  })
})

