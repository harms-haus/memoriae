// App component tests - routing, navigation, composer
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Mock AuthContext
const mockLogin = vi.fn()
const mockLogout = vi.fn()
const mockCheckAuth = vi.fn()

vi.mock('./contexts/AuthContext', () => ({
  AuthProvider: ({ children }: any) => children,
  useAuth: () => ({
    authenticated: true,
    loading: false,
    user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    login: mockLogin,
    logout: mockLogout,
    checkAuth: mockCheckAuth,
  }),
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
  })

  describe('Routing', () => {
    it('should render seeds view at /seeds', () => {
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
    })

    it('should render categories view at /categories', () => {
      render(
        <MemoryRouter initialEntries={['/categories']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('categories-view')).toBeInTheDocument()
    })

    it('should render tags view at /tags', () => {
      render(
        <MemoryRouter initialEntries={['/tags']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('tags-view')).toBeInTheDocument()
    })

    it('should render settings view at /settings', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('settings-view')).toBeInTheDocument()
    })

    it('should render musings view at /musings', () => {
      render(
        <MemoryRouter initialEntries={['/musings']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('musings-view')).toBeInTheDocument()
    })

    it('should render seed detail view at /seeds/:id', () => {
      render(
        <MemoryRouter initialEntries={['/seeds/seed-123']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('seed-detail-view')).toBeInTheDocument()
      expect(screen.getByText('Seed Detail: seed-123')).toBeInTheDocument()
    })

    it('should render tag detail view at /tags/:id', () => {
      render(
        <MemoryRouter initialEntries={['/tags/tag-123']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('tag-detail-view')).toBeInTheDocument()
      expect(screen.getByText('Tag Detail: tag-123')).toBeInTheDocument()
    })

    it('should default to seeds view at /', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
    })
  })

  describe('Tab Navigation', () => {
    it('should show seeds tab as active on /seeds', () => {
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      const tabs = screen.getByTestId('tabs')
      expect(tabs).toHaveAttribute('data-value', 'seeds')
    })

    it('should show seeds tab as active on /seeds/:id', () => {
      render(
        <MemoryRouter initialEntries={['/seeds/seed-123']}>
          <App />
        </MemoryRouter>
      )

      const tabs = screen.getByTestId('tabs')
      expect(tabs).toHaveAttribute('data-value', 'seeds')
    })

    it('should show tags tab as active on /tags/:id', () => {
      render(
        <MemoryRouter initialEntries={['/tags/tag-123']}>
          <App />
        </MemoryRouter>
      )

      const tabs = screen.getByTestId('tabs')
      expect(tabs).toHaveAttribute('data-value', 'tags')
    })

    it('should handle tab change', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

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
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      const fab = screen.getByLabelText('Create new seed')
      expect(fab).toBeInTheDocument()
    })

    it('should show composer FAB on categories view', () => {
      render(
        <MemoryRouter initialEntries={['/categories']}>
          <App />
        </MemoryRouter>
      )

      const fab = screen.getByLabelText('Create new seed')
      expect(fab).toBeInTheDocument()
    })

    it('should show composer FAB on tags view', () => {
      render(
        <MemoryRouter initialEntries={['/tags']}>
          <App />
        </MemoryRouter>
      )

      const fab = screen.getByLabelText('Create new seed')
      expect(fab).toBeInTheDocument()
    })

    it('should not show composer FAB on settings view', () => {
      render(
        <MemoryRouter initialEntries={['/settings']}>
          <App />
        </MemoryRouter>
      )

      const fab = screen.queryByLabelText('Create new seed')
      expect(fab).not.toBeInTheDocument()
    })

    it('should not show composer FAB on seed detail view', () => {
      render(
        <MemoryRouter initialEntries={['/seeds/seed-123']}>
          <App />
        </MemoryRouter>
      )

      const fab = screen.queryByLabelText('Create new seed')
      expect(fab).not.toBeInTheDocument()
    })

    it('should open composer when FAB is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      const fab = screen.getByLabelText('Create new seed')
      await user.click(fab)

      expect(screen.getByTestId('seed-composer')).toBeInTheDocument()
    })

    it('should close composer when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

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
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

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
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      const seedButton = screen.getByTestId('seed-1')
      await user.click(seedButton)

      await waitFor(() => {
        expect(screen.getByTestId('seed-detail-view')).toBeInTheDocument()
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading when auth is loading', () => {
      vi.mocked(require('./contexts/AuthContext').useAuth).mockReturnValue({
        authenticated: false,
        loading: true,
        user: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText('Loading...')).toBeInTheDocument()
    })
  })

  describe('Authentication', () => {
    it('should show login page when not authenticated', () => {
      vi.mocked(require('./contexts/AuthContext').useAuth).mockReturnValue({
        authenticated: false,
        loading: false,
        user: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText('Memoriae')).toBeInTheDocument()
      expect(screen.getByText('Sign in to continue')).toBeInTheDocument()
    })

    it('should handle Google login', async () => {
      const user = userEvent.setup()
      vi.mocked(require('./contexts/AuthContext').useAuth).mockReturnValue({
        authenticated: false,
        loading: false,
        user: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      const googleButton = screen.getByText('Sign in with Google')
      await user.click(googleButton)

      expect(mockLogin).toHaveBeenCalledWith('google', undefined)
    })

    it('should handle GitHub login', async () => {
      const user = userEvent.setup()
      vi.mocked(require('./contexts/AuthContext').useAuth).mockReturnValue({
        authenticated: false,
        loading: false,
        user: null,
        login: mockLogin,
        logout: mockLogout,
        checkAuth: mockCheckAuth,
      })

      render(
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )

      const githubButton = screen.getByText('Sign in with GitHub')
      await user.click(githubButton)

      expect(mockLogin).toHaveBeenCalledWith('github', undefined)
    })

    it('should handle OAuth errors in URL', () => {
      vi.mocked(require('./contexts/AuthContext').useAuth).mockReturnValue({
        authenticated: false,
        loading: false,
        user: null,
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

      render(
        <MemoryRouter initialEntries={['/login?error=oauth_failed']}>
          <App />
        </MemoryRouter>
      )

      expect(screen.getByText('Authentication failed. Please try again.')).toBeInTheDocument()

      // Restore
      Object.defineProperty(window, 'location', {
        value: { search: originalSearch },
        writable: true,
      })
    })
  })
})

