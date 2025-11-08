// SettingsView component tests
import React from 'react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { SettingsView } from './SettingsView'
import { useAuth } from '../../contexts/AuthContext'
import { api } from '../../services/api'

// Mock dependencies
vi.mock('../../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../../services/api', () => ({
  api: {
    get: vi.fn(),
    put: vi.fn(),
    getToken: vi.fn().mockReturnValue('test-token'),
  },
}))

vi.mock('../../utils/timezone', () => ({
  getTimezones: vi.fn(() => [
    { value: 'UTC', label: 'UTC' },
    { value: 'America/New_York', label: 'America/New_York' },
    { value: 'Europe/London', label: 'Europe/London' },
  ]),
}))

// Mock mother-theme components
vi.mock('@mother/components/Button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button
      data-testid="button"
      data-variant={variant}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  ),
}))

vi.mock('@mother/components/Input', () => ({
  Input: ({ label, value, onChange, type, placeholder, helperText }: any) => {
    const [inputValue, setInputValue] = React.useState(value || '')
    
    React.useEffect(() => {
      setInputValue(value || '')
    }, [value])
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setInputValue(newValue)
      // Create a new event with the updated value
      const syntheticEvent = {
        ...e,
        target: { ...e.target, value: newValue },
        currentTarget: { ...e.currentTarget, value: newValue },
      }
      onChange?.(syntheticEvent)
    }
    
    return (
      <div>
        <label>{label}</label>
        <input
          data-testid="input"
          data-label={label}
          type={type}
          value={inputValue}
          onChange={handleChange}
          placeholder={placeholder}
        />
        {helperText && <p className="helper-text">{helperText}</p>}
      </div>
    )
  },
}))

vi.mock('../ModelSelector', () => ({
  ModelSelector: ({ options, value, onChange, onFocus, disabled, placeholder, loading }: any) => (
    <select
      data-testid="model-selector"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      onFocus={onFocus}
      disabled={disabled}
    >
      <option value="">{placeholder}</option>
      {options.map((opt: any) => (
        <option key={opt.id} value={opt.id}>
          {opt.name}
        </option>
      ))}
      {loading && <option disabled>Loading models...</option>}
    </select>
  ),
}))

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Loader2: ({ className, size, style }: any) => (
    <div data-testid="loader" className={className} style={style}>Loading</div>
  ),
  Save: ({ size, style }: any) => <div data-testid="save-icon" style={style}>Save</div>,
  Check: ({ size, style }: any) => <div data-testid="check-icon" style={style}>Check</div>,
}))

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  name: 'Test User',
  provider: 'google',
}

const mockSettings = {
  openrouter_api_key: 'test-key',
  openrouter_model: 'model-1',
  openrouter_model_name: 'Test Model',
  timezone: 'America/New_York',
}

describe('SettingsView', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      authenticated: true,
      loading: false,
      login: vi.fn(),
      logout: vi.fn(),
    } as any)
  })

  it('should render loading state initially', async () => {
    vi.mocked(api.get).mockImplementation(() => new Promise(() => {})) // Never resolves

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    expect(screen.getByTestId('loader')).toBeInTheDocument()
  })

  it('should render settings form when loaded', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    // Wait for the input to be rendered with the value
    await waitFor(() => {
      const apiKeyInput = screen.getByTestId('input')
      expect(apiKeyInput).toHaveValue('test-key')
    })
  })

  it('should display user account information', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Account')).toBeInTheDocument()
      expect(screen.getByText('Test User')).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByText('google')).toBeInTheDocument()
    })
  })

  it('should handle logout', async () => {
    const mockLogout = vi.fn()
    vi.mocked(useAuth).mockReturnValue({
      user: mockUser,
      authenticated: true,
      loading: false,
      login: vi.fn(),
      logout: mockLogout,
    } as any)

    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Logout')).toBeInTheDocument()
    })

    const logoutButton = screen.getByText('Logout')
    await userEvent.click(logoutButton)

    expect(mockLogout).toHaveBeenCalled()
  })

  it('should update API key input', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('test-key')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByTestId('input')
    await userEvent.clear(apiKeyInput)
    await userEvent.type(apiKeyInput, 'new-key')

    expect(apiKeyInput).toHaveValue('new-key')
  })

  it('should save settings when save button is clicked', async () => {
    const updatedSettings = {
      ...mockSettings,
      openrouter_api_key: 'new-key',
    }

    vi.mocked(api.get).mockResolvedValue(mockSettings)
    vi.mocked(api.put).mockResolvedValue(updatedSettings)

    // Mock fetch for models endpoint
    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    })

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByTestId('input') as HTMLInputElement
    // Select all text and replace it
    await userEvent.click(apiKeyInput)
    await userEvent.keyboard('{Control>}a{/Control}{Delete}')
    await userEvent.type(apiKeyInput, 'new-key')

    const saveButton = screen.getByText('Save Settings')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/settings', expect.objectContaining({
        openrouter_api_key: 'new-key',
      }))
    })
  })

  it('should disable save button when no changes', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      const saveButton = screen.getByText('Save Settings')
      expect(saveButton).toBeDisabled()
    })
  })

  it('should show saved state after successful save', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)
    vi.mocked(api.put).mockResolvedValue(mockSettings)

    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    })

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByTestId('input')
    await userEvent.clear(apiKeyInput)
    await userEvent.type(apiKeyInput, 'new-key')

    const saveButton = screen.getByText('Save Settings')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(screen.getByText('Saved')).toBeInTheDocument()
      expect(screen.getByText(/Settings saved successfully/)).toBeInTheDocument()
    })
  })

  it('should handle timezone selection', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    // Find the timezone select element directly - wait for it to appear
    const timezoneSelect = await screen.findByDisplayValue('America/New_York') as HTMLSelectElement
    expect(timezoneSelect).toBeInTheDocument()
    
    await userEvent.selectOptions(timezoneSelect, 'Europe/London')

    await waitFor(() => {
      expect(timezoneSelect.value).toBe('Europe/London')
    })
  })

  it('should load models when model selector is focused', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        models: [
          { id: 'model-1', name: 'Model One' },
          { id: 'model-2', name: 'Model Two' },
        ],
      }),
    })

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).toBeInTheDocument()
    })

    const modelSelector = screen.getByTestId('model-selector')
    await userEvent.click(modelSelector)

    await waitFor(() => {
      expect((globalThis as any).fetch).toHaveBeenCalledWith(
        '/api/settings/models',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
          body: JSON.stringify({ api_key: 'test-key' }),
        })
      )
    })
  })

  it('should handle empty settings', async () => {
    const emptySettings = {
      openrouter_api_key: null,
      openrouter_model: null,
      openrouter_model_name: null,
      timezone: null,
    }

    vi.mocked(api.get).mockResolvedValue(emptySettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByTestId('input')
    expect(apiKeyInput).toHaveValue('')
  })

  it('should handle save error gracefully', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)
    vi.mocked(api.put).mockRejectedValue(new Error('Save failed'))

    ;(globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ models: [] }),
    })

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Save Settings')).toBeInTheDocument()
    })

    const apiKeyInput = screen.getByTestId('input')
    await userEvent.clear(apiKeyInput)
    await userEvent.type(apiKeyInput, 'new-key')

    const saveButton = screen.getByText('Save Settings')
    await userEvent.click(saveButton)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Error saving settings:', expect.any(Error))
    })

    consoleErrorSpy.mockRestore()
  })

  it('should display timezone helper text', async () => {
    vi.mocked(api.get).mockResolvedValue(mockSettings)

    render(
      <MemoryRouter>
        <SettingsView />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Your time zone is used for follow-up reminders/)).toBeInTheDocument()
    })
  })
})

