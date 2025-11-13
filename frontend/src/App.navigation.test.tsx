// Tests for navigation logic in App.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import App from './App'
import { SeedContext } from './contexts/SeedContext'
import type { Seed } from './types'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

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
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: 'seed-1/test-seed' })}
      >
        Select seed (with slug)
      </button>
      <button
        data-testid="select-seed-multi-segment-slug"
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: 'seed-1/path/to/slug' })}
      >
        Select seed (multi-segment slug)
      </button>
      <button
        data-testid="select-seed-slug-only-prefix"
        onClick={() => onSeedSelect({ id: 'seed-123456789', slug: 'seed-1' })}
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
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-no-slug')
      await user.click(button)

      // hashId = first 7 chars of 'seed-123456789' = 'seed-1'
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-1')
    })

    it('should navigate with hashId and slug when seed has slug', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-with-slug')
      await user.click(button)

      // hashId = 'seed-1', slug part = 'test-seed'
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-1/test-seed')
    })

    it('should handle slug with multiple path segments', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-multi-segment-slug')
      await user.click(button)

      // hashId = 'seed-1', slug part = 'path/to/slug'
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-1/path/to/slug')
    })

    it('should navigate with hashId only when slug is just the prefix', async () => {
      const user = userEvent.setup()
      render(
        <MemoryRouter initialEntries={['/seeds']}>
          <App />
        </MemoryRouter>
      )

      await waitFor(() => {
        expect(screen.getByTestId('seeds-view')).toBeInTheDocument()
      })

      const button = screen.getByTestId('select-seed-slug-only-prefix')
      await user.click(button)

      // When slug is just 'seed-1' (no part after '/'), navigate with hashId only
      expect(mockNavigate).toHaveBeenCalledWith('/seeds/seed-1')
    })
  })
})

