import { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'
import { Button } from '@mother/components/Button'
import { Input } from '@mother/components/Input'
import { Loader2, Save, Check } from 'lucide-react'
import { ModelSelector } from '../ModelSelector'
import './Views.css'

interface UserSettings {
  openrouter_api_key: string | null
  openrouter_model: string | null
  openrouter_model_name: string | null
}

interface OpenRouterModel {
  id: string
  name: string
}

export function SettingsView() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState<UserSettings>({
    openrouter_api_key: null,
    openrouter_model: null,
    openrouter_model_name: null,
  })
  const [models, setModels] = useState<OpenRouterModel[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [modelsLoaded, setModelsLoaded] = useState(false)

  // Load settings on mount
  useEffect(() => {
    loadSettings()
  }, [])

  // Update local state when settings change
  useEffect(() => {
    setApiKey(settings.openrouter_api_key || '')
    setSelectedModel(settings.openrouter_model || '')
    
    // If there's a saved model, ensure it's in the models list
    if (settings.openrouter_model && settings.openrouter_model_name) {
      setModels(prev => {
        // Check if it's already in the list
        if (prev.find(m => m.id === settings.openrouter_model)) {
          return prev
        }
        // Add it to the beginning of the list
        return [{ id: settings.openrouter_model!, name: settings.openrouter_model_name! }, ...prev]
      })
    }
  }, [settings])

  // Reset models loaded state when API key changes
  useEffect(() => {
    setModelsLoaded(false)
    // Preserve saved model if it exists
    const currentSelectedModel = selectedModel
    setModels(prev => {
      if (currentSelectedModel && prev.find(m => m.id === currentSelectedModel)) {
        return prev.filter(m => m.id === currentSelectedModel)
      }
      return []
    })
  }, [apiKey]) // Only reset when API key changes

  // Ensure saved model is always visible in the list
  useEffect(() => {
    if (selectedModel && !models.find(m => m.id === selectedModel)) {
      // Add the saved model to the list if it's not already there
      setModels(prev => {
        // Check if it's already in the list
        if (prev.find(m => m.id === selectedModel)) {
          return prev
        }
        // Use saved model name if available, otherwise use the model ID
        const savedModelName = settings.openrouter_model_name || selectedModel
        // Add it to the beginning of the list
        return [{ id: selectedModel, name: savedModelName }, ...prev]
      })
    }
  }, [selectedModel, models, settings.openrouter_model_name])

  const loadSettings = async () => {
    try {
      setLoading(true)
      const data = await api.get<UserSettings>('/settings')
      setSettings(data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadModels = async () => {
    if (!apiKey.trim() || modelsLoaded) {
      return
    }

    try {
      setLoadingModels(true)
      // Call backend endpoint to fetch models
      const response = await fetch('/api/settings/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify({ api_key: apiKey }),
      })

      if (response.ok) {
        const data = await response.json()
        const loadedModels = data.models || []
        
        // Update saved model name if the model is found in the loaded list
        if (selectedModel) {
          const foundModel = loadedModels.find((m: OpenRouterModel) => m.id === selectedModel)
          if (foundModel && foundModel.name !== settings.openrouter_model_name) {
            // Update the saved model name to match the API response
            setSettings(prev => ({
              ...prev,
              openrouter_model_name: foundModel.name
            }))
          } else if (!foundModel) {
            // Model not found in API response, ensure it's in the list with saved name
            const savedModelName = settings.openrouter_model_name || selectedModel
            loadedModels.unshift({ id: selectedModel, name: savedModelName })
          }
        }
        
        setModels(loadedModels)
        setModelsLoaded(true)
      } else {
        console.error('Failed to load models')
        // Keep existing models if load fails
      }
    } catch (error) {
      console.error('Error loading models:', error)
      // Keep existing models if load fails
    } finally {
      setLoadingModels(false)
    }
  }

  const handleSelectFocus = () => {
    // Load models when select is focused (user is about to open dropdown)
    if (apiKey.trim() && !modelsLoaded && !loadingModels) {
      loadModels()
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setSaved(false)
      
      // Find the model name from the loaded models, or use the saved name
      const selectedModelObj = models.find(m => m.id === selectedModel)
      const modelName = selectedModelObj?.name || settings.openrouter_model_name || selectedModel || null
      
      const updates: UserSettings = {
        openrouter_api_key: apiKey.trim() || null,
        openrouter_model: selectedModel || null,
        openrouter_model_name: modelName,
      }

      const updated = await api.put<UserSettings>('/settings', updates)
      setSettings(updated)
      setSaved(true)
      
      // Clear saved message after 2 seconds
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = 
    apiKey !== (settings.openrouter_api_key || '') ||
    selectedModel !== (settings.openrouter_model || '')

  if (loading) {
    return (
      <div className="view-container settings-view">
        <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
          <Loader2 className="animate-spin" size={24} />
        </div>
      </div>
    )
  }

  return (
    <div className="view-container settings-view">
      <h2>Settings</h2>
      
      <div className="settings-section">
        <h3>Account</h3>
        <div className="settings-item">
          <span className="label">Name</span>
          <p>{user?.name || 'N/A'}</p>
        </div>
        <div className="settings-item">
          <span className="label">Email</span>
          <p>{user?.email || 'N/A'}</p>
        </div>
        <div className="settings-item">
          <span className="label">Provider</span>
          <p>{user?.provider || 'N/A'}</p>
        </div>
        <Button variant="secondary" onClick={logout} style={{ marginTop: 'var(--space-4)' }}>
          Logout
        </Button>
      </div>

      <div className="settings-section">
        <h3>OpenRouter Configuration</h3>
        <div className="flex flex-col gap-4">
          <Input
            label="OpenRouter API Key"
            type="password"
            value={apiKey}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
            placeholder="sk-or-v1-..."
            helperText="Your OpenRouter API key. Keep this secure and never share it."
          />
          
          <div>
            <label className="label">AI Model</label>
            <div style={{ marginTop: 'var(--space-2)' }}>
              <ModelSelector
                options={models}
                value={selectedModel}
                onChange={setSelectedModel}
                onFocus={handleSelectFocus}
                disabled={!apiKey.trim() || loadingModels}
                placeholder="Select a model..."
                loading={loadingModels}
              />
              {selectedModel && models.length === 0 && settings.openrouter_model_name && (
                <p className="text-sm" style={{ marginTop: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                  Selected: {settings.openrouter_model_name}
                </p>
              )}
            </div>
            {!apiKey.trim() && (
              <p className="text-sm" style={{ marginTop: 'var(--space-2)', color: 'var(--text-tertiary)' }}>
                Enter your API key to load available models
              </p>
            )}
          </div>

          <div className="flex items-center gap-2" style={{ marginTop: 'var(--space-2)' }}>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving || !hasChanges}
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin" size={16} style={{ marginRight: 'var(--space-2)' }} />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check size={16} style={{ marginRight: 'var(--space-2)' }} />
                  Saved
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginRight: 'var(--space-2)' }} />
                  Save Settings
                </>
              )}
            </Button>
            {saved && (
              <span className="text-sm" style={{ color: 'var(--success)' }}>
                Settings saved successfully
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
