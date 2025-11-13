// Tests for navigation logic in App.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

// Use vi.hoisted to ensure routeStore is accessible to the mock
const routeStore = vi.hoisted(() => ({ current: '/' }))

// Mock BrowserRouter to use MemoryRouter with test route
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    BrowserRouter: ({ children }: any) => {
      // Read route from hoisted store at render time
      return <MemoryRouter initialEntries={[routeStore.current]}>{children}</MemoryRouter>
    },
    useNavigate: () => mockNavigate,
  }
})

// Test helper to render App with a specific route
function renderAppWithRoute(route: string) {
  routeStore.current = route
  return render(<App />)
}

// Mock all the view components
vi.mock('./components/views/SeedsView', () => ({
  SeedsView: ({ onSeedSelect }: any) => (
    <div data-testid="seeds-view">
      <button
        data-testid="select-seed-no-slug"
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: null })}
      >
        Select seed (no slug)
      </button>
      <button
        data-testid="select-seed-with-slug"
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: 'seed-12/test-seed' })}
      >
        Select seed (with slug)
      </button>
      <button
        data-testid="select-seed-multi-segment-slug"
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: 'seed-12/path/to/slug' })}
      >
        Select seed (multi-segment slug)
      </button>
      <button
        data-testid="select-seed-slug-only-prefix"
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: 'seed-12' })}
      >
        Select seed (slug only prefix)
      </button>
    </div>
  ),
}))

vi.mock('./components/views/CategoriesView', () => ({
  CategoriesView: () => <div data-testid="categories-view">Categories</div>,
}))

vi.mock('./components/views/TagsView', () => ({
  TagsView: () => <div data-testid="tags-view">Tags</div>,
}))

vi.mock('./components/views/SettingsView', () => ({
  SettingsView: () => <div data-testid="settings-view">Settings</div>,
}))

vi.mock('./components/views/MusingsView', () => ({
  MusingsView: () => <div data-testid="musings-view">Musings</div>,
}))

vi.mock('./components/views/SeedDetailView', () => ({
  SeedDetailView: ({ seedId }: any) => (
    <div data-testid="seed-detail-view">Seed Detail: {seedId}</div>
  ),
}))

vi.mock('./components/views/TagDetailView', () => ({
  TagDetailView: () => <div data-testid="tag-detail-view">Tag Detail</div>,
}))

vi.mock('./components/SeedComposer', () => ({
  SeedComposer: () => <div data-testid="seed-composer">Composer</div>,
}))

vi.mock('./contexts/AuthContext', () => ({
  useAuth: () => ({ authenticated: true, loading: false }),
  AuthProvider: ({ children }: any) => children,
}))

vi.mock('./hooks/useFollowupNotifications', () => ({
  useFollowupNotifications: () => {},
}))

describe('App Navigation Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleSeedSelect navigation', () => {
    it('should navigate with hashId only when seed has no slug', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-no-slug')
      await user.click(button)

      // hashId = first 7 chars of 'seed-123456789' = 'seed-12'
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-12')
    })

    it('should navigate with hashId and slug when seed has slug', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-with-slug')
      await user.click(button)

      // hashId = 'seed-12', slug part = 'test-seed'
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-12/test-seed')
    })

    it('should handle slug with multiple path segments', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-multi-segment-slug')
      await user.click(button)

      // hashId = 'seed-12', slug part = 'path/to/slug'
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-12/path/to/slug')
    })

    it('should navigate with hashId only when slug is just the prefix', async () => {
      const user = userEvent.setup()
      renderAppWithRoute('/seeds')

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-slug-only-prefix')
      await user.click(button)

      // When slug is just 'seed-12' (same as hashId), navigate with hashId only
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-12')
    })
  })
})

