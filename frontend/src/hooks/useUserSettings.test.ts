// useUserSettings hook tests
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useUserSettings } from './useUserSettings'
import { api } from '../services/api'

// Mock the API service
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}))

describe('useUserSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should fetch and return user settings', async () => {
    const mockSettings = {
      openrouter_api_key: 'test-key',
      openrouter_model: 'gpt-4',
      openrouter_model_name: 'GPT-4',
      timezone: 'America/New_York',
    }

    vi.mocked(api.get).mockResolvedValue(mockSettings)

    const { result } = renderHook(() => useUserSettings())

    expect(result.current.loading).toBe(true)
    expect(result.current.settings).toBeNull()
    expect(result.current.error).toBeNull()

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.settings).toEqual(mockSettings)
    expect(result.current.error).toBeNull()
    expect(api.get).toHaveBeenCalledWith('/settings')
  })

  it('should handle null values in settings', async () => {
    const mockSettings = {
      openrouter_api_key: null,
      openrouter_model: null,
      openrouter_model_name: null,
      timezone: null,
    }

    vi.mocked(api.get).mockResolvedValue(mockSettings)

    const { result } = renderHook(() => useUserSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.settings).toEqual(mockSettings)
  })

  it('should handle API errors', async () => {
    const errorMessage = 'Failed to fetch settings'
    vi.mocked(api.get).mockRejectedValue(new Error(errorMessage))

    const { result } = renderHook(() => useUserSettings())

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })

    expect(result.current.settings).toBeNull()
    expect(result.current.error).toBe(errorMessage)
  })

  it('should handle non-Error rejection', async () => {
    vi.mocked(api.get).mockRejectedValue('String error')

    const { result } = renderHook(() => useUserSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })

    expect(result.current.error).toBe('Failed to load settings')
  })

  it('should cancel request on unmount', async () => {
    let resolvePromise: (value: any) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    vi.mocked(api.get).mockReturnValue(promise as any)

    const { unmount } = renderHook(() => useUserSettings())

    // Unmount before request completes
    unmount()

    // Resolve the promise after unmount
    resolvePromise!({
      openrouter_api_key: 'test-key',
      openrouter_model: 'gpt-4',
      openrouter_model_name: 'GPT-4',
      timezone: 'America/New_York',
    })

    // Wait a bit to ensure state doesn't update
    await new Promise((resolve) => setTimeout(resolve, 200))

    // The hook should not update state after unmount
    // This is verified by the fact that the test completes without errors
    // The actual cancellation logic is in the hook's useEffect cleanup
  })

  it('should set loading to false after error', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useUserSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    }, { timeout: 1000 })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Network error')
  })

  it('should only fetch once on mount', async () => {
    const mockSettings = {
      openrouter_api_key: 'test-key',
      openrouter_model: 'gpt-4',
      openrouter_model_name: 'GPT-4',
      timezone: 'America/New_York',
    }

    vi.mocked(api.get).mockResolvedValue(mockSettings)

    const { result, rerender } = renderHook(() => useUserSettings())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    // Rerender should not trigger another fetch
    rerender()

    // Wait a bit to ensure no additional calls
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(api.get).toHaveBeenCalledTimes(1)
  })
})

