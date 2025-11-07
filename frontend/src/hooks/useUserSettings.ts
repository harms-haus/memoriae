import { useState, useEffect } from 'react'
import { api } from '../services/api'

interface UserSettings {
  openrouter_api_key: string | null
  openrouter_model: string | null
  openrouter_model_name: string | null
  timezone: string | null
}

/**
 * Hook to fetch and access user settings
 */
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function loadSettings() {
      try {
        setLoading(true)
        setError(null)
        const data = await api.get<UserSettings>('/settings')
        if (!cancelled) {
          setSettings(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load settings')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadSettings()

    return () => {
      cancelled = true
    }
  }, [])

  return { settings, loading, error }
}

