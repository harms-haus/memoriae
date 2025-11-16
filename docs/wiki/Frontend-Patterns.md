# Frontend Patterns

This page documents React patterns, component architecture, and frontend implementation details used in Memoriae.

## Component Structure

### Standard Component Pattern

**Location**: `frontend/src/components/`

Components follow a consistent structure:

```typescript
import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import './ComponentName.css'

interface ComponentNameProps {
  seedId: string
  onUpdate?: (data: Seed) => void
}

export function ComponentName({ seedId, onUpdate }: ComponentNameProps) {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Seed | null>(null)

  useEffect(() => {
    loadData()
  }, [seedId])

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await api.get<Seed>(`/seeds/${seedId}`)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [seedId])

  const handleAction = async () => {
    // Action implementation
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error}</div>
  if (!data) return null

  return (
    <div className="panel">
      {/* Component JSX */}
    </div>
  )
}
```

### Key Patterns

1. **Props Interface**: TypeScript interface for all props
2. **State Management**: `useState` for local state
3. **Effects**: `useEffect` for side effects
4. **Callbacks**: `useCallback` for memoized functions
5. **Error Handling**: Try/catch with error state
6. **Loading States**: Loading indicator during async operations

## Context Usage

### AuthContext

**Location**: `frontend/src/contexts/AuthContext.tsx`

Provides authentication state and methods:

```typescript
interface AuthContextValue {
  user: User | null
  loading: boolean
  authenticated: boolean
  login: (provider: 'google' | 'github', redirect?: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Implementation...
  
  return (
    <AuthContext.Provider value={{ user, loading, authenticated: !!user, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
```

### Usage Pattern

```typescript
function MyComponent() {
  const { user, authenticated, login } = useAuth()
  
  if (!authenticated) {
    return <LoginPage />
  }
  
  return <div>Hello, {user?.name}</div>
}
```

## Custom Hooks

### useUserSettings

**Location**: `frontend/src/hooks/useUserSettings.ts`

Example custom hook pattern:

```typescript
export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.get<UserSettings>('/settings')
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }

  const updateSettings = async (updates: Partial<UserSettings>) => {
    try {
      const updated = await api.put<UserSettings>('/settings', updates)
      setSettings(updated)
    } catch (err) {
      throw err
    }
  }

  return { settings, loading, error, updateSettings, reload: loadSettings }
}
```

### Hook Benefits

1. **Reusability**: Use same hook in multiple components
2. **Encapsulation**: Logic separated from UI
3. **State Management**: Centralized state handling
4. **Error Handling**: Consistent error handling

## API Client Pattern

### ApiClient Class

**Location**: `frontend/src/services/api.ts`

Centralized API client with interceptors:

```typescript
class ApiClient {
  private baseURL: string
  private axiosInstance: AxiosInstance

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3123/api'
    
    this.axiosInstance = axios.create({
      baseURL: this.baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    // Request interceptor: Add auth token
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Response interceptor: Handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response.data,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized
          window.location.href = '/login'
        }
        throw error
      }
    )
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.get(url, config)
  }

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    return this.axiosInstance.post(url, data, config)
  }

  // ... other methods
}

export const api = new ApiClient()
```

### Usage

```typescript
// In components
const seed = await api.get<Seed>(`/seeds/${seedId}`)
const updated = await api.put<Seed>(`/seeds/${seedId}`, { content: "..." })
```

## Dynamic Editor (3-Stage)

### Stage Detection

**Location**: `frontend/src/components/SeedEditor/SeedEditor.tsx`

The editor automatically transitions between stages based on content:

```typescript
function getEditorStage(
  content: string,
  scrollTop: number,
  isFocused: boolean
): 'small' | 'medium' | 'large' {
  // Small: Short content, not scrolled, not focused
  if (content.length < 100 && scrollTop < 500 && !isFocused) {
    return 'small'
  }
  
  // Medium: Medium content, moderate scroll
  if (content.length < 1000 && scrollTop < 2000) {
    return 'medium'
  }
  
  // Large: Long content or heavily scrolled
  return 'large'
}
```

### Stage Implementations

**Small Stage**:
- Simple `<textarea>` with autosize
- Max height: ~250 characters visible
- No markdown UI
- Plain text editing

**Medium Stage**:
- Markdown toolbar (bold, italic, link)
- Max height: ~1000 characters visible
- Basic formatting support
- Still inline editing

**Large Stage**:
- Full-screen modal/overlay
- Complete markdown toolbar
- Full markdown support
- Zen mode focus

### Stage Transitions

Transitions are smooth and automatic:
- **Content-based**: Length triggers stage changes
- **Scroll-based**: Scrolling triggers stage changes
- **Focus-based**: Focus can trigger large stage
- **No manual switching**: User doesn't choose stage

## State Management Approach

### No Global State Library

Memoriae uses **React Context + Hooks** instead of Redux/Zustand:

**Rationale**:
- Simpler mental model
- Less boilerplate
- Sufficient for application needs
- Better TypeScript integration

### Context Usage

**When to use Context**:
- Global state (auth, theme)
- Shared state across many components
- State that changes infrequently

**When NOT to use Context**:
- Local component state
- Derived state (use `useMemo`)
- Temporary UI state

### Component-Level State

Most state is component-local:

```typescript
function MyComponent() {
  const [localState, setLocalState] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)
  
  // Local state for UI only
  // No need to lift to context
}
```

## Code Splitting

### Lazy Loading

**Location**: `frontend/src/App.tsx`

View components are lazy-loaded:

```typescript
const SeedsView = lazy(() => 
  import('./components/views/SeedsView').then(m => ({ default: m.SeedsView }))
)
const CategoriesView = lazy(() => 
  import('./components/views/CategoriesView').then(m => ({ default: m.CategoriesView }))
)
```

### Benefits

1. **Reduced initial bundle**: Only load what's needed
2. **Faster time to interactive**: Smaller initial JavaScript
3. **Better performance**: Load views on demand

### Usage

```typescript
<Suspense fallback={<div>Loading...</div>}>
  <Routes>
    <Route path="/seeds" element={<SeedsView />} />
    <Route path="/categories" element={<CategoriesView />} />
  </Routes>
</Suspense>
```

## CSS Custom Properties

### Theme System

**Location**: `frontend/src/styles/theme.css`

All styling uses CSS custom properties:

```css
:root {
  --bg-primary: #0a0a0a;
  --text-primary: #f0f0f0;
  --accent-yellow: #ffd43b;
  /* ... many more variables */
}
```

### Usage in Components

```typescript
<div style={{
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  border: 'var(--border-thick) solid var(--border-primary)',
}}>
  Content
</div>
```

### Component Classes

Pre-defined component classes from `theme.css`:

```typescript
<div className="panel panel-elevated">
  <button className="btn-primary">Action</button>
  <input className="input" />
</div>
```

## Responsive Design Patterns

### Mobile-First

**Breakpoints** (from `theme.css`):
- **Base (Mobile)**: 320px+ - Default styles
- **Tablet**: `@media (min-width: 768px)`
- **Desktop**: `@media (min-width: 1024px)`

### Container Pattern

```css
.container {
  padding: var(--space-4);
}

@media (min-width: 768px) {
  .container {
    padding: var(--space-6);
  }
}

@media (min-width: 1024px) {
  .container {
    padding: var(--space-8);
  }
}
```

### Grid Layout

```typescript
<div className="grid grid-3">
  <div className="panel">Item 1</div>
  <div className="panel">Item 2</div>
  <div className="panel">Item 3</div>
</div>
```

## Routing Patterns

### React Router Setup

**Location**: `frontend/src/App.tsx`

```typescript
<BrowserRouter>
  <Routes>
    <Route path="/seeds" element={<SeedsView />} />
    <Route path="/seed/:seedId" element={<SeedDetailView />} />
    <Route path="/seed/:seedId/:slug" element={<SeedDetailView />} />
    <Route path="/categories" element={<CategoriesView />} />
    <Route path="/category/*" element={<CategoriesView />} />
  </Routes>
</BrowserRouter>
```

### Navigation

```typescript
const navigate = useNavigate()

// Navigate programmatically
navigate(`/seed/${seedId}`)

// Navigate with slug
navigate(`/seed/${seedId}/${slug}`)
```

### URL Parameters

```typescript
const { seedId, slug } = useParams<{ seedId: string; slug?: string }>()
```

## Error Handling Patterns

### API Error Handling

```typescript
try {
  const result = await api.get<Seed>(`/seeds/${seedId}`)
  setData(result)
} catch (error) {
  if (error instanceof AxiosError) {
    if (error.response?.status === 404) {
      setError('Seed not found')
    } else if (error.response?.status === 401) {
      // Redirect to login (handled by interceptor)
    } else {
      setError(error.response?.data?.error || 'Failed to load')
    }
  } else {
    setError('An unexpected error occurred')
  }
}
```

### User-Friendly Errors

- **Network errors**: "Failed to connect. Please check your internet."
- **404 errors**: "Seed not found"
- **500 errors**: "Server error. Please try again later."
- **Validation errors**: Show specific field errors

## Performance Optimization

### useMemo for Expensive Computations

```typescript
const filteredSeeds = useMemo(() => {
  return seeds.filter(seed => {
    // Expensive filtering logic
  })
}, [seeds, searchQuery, selectedTags])
```

### useCallback for Stable References

```typescript
const handleClick = useCallback((id: string) => {
  // Handler logic
}, [dependencies])
```

### React.memo for Component Memoization

```typescript
export const ExpensiveComponent = React.memo(({ data }: Props) => {
  // Component implementation
})
```

## Component Composition

### Compound Components

Example: Tabs component

```typescript
<Tabs>
  <Tab label="Seeds" />
  <Tab label="Categories" />
  <TabPanel>
    <SeedsView />
  </TabPanel>
  <TabPanel>
    <CategoriesView />
  </TabPanel>
</Tabs>
```

### Render Props Pattern

```typescript
<DataLoader
  url={`/seeds/${seedId}`}
  render={(data, loading, error) => {
    if (loading) return <Loading />
    if (error) return <Error message={error} />
    return <SeedDisplay seed={data} />
  }}
/>
```

## Testing Patterns

### Component Testing

**Location**: `frontend/src/components/**/*.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import { SeedEditor } from './SeedEditor'

describe('SeedEditor', () => {
  it('should render small stage for short content', () => {
    render(<SeedEditor content="short" />)
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})
```

### Mocking

```typescript
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn().mockResolvedValue({ id: '1', content: 'test' }),
    post: vi.fn().mockResolvedValue({}),
  },
}))
```

## Related Documentation

- [Tech Stack Deep Dive](Tech-Stack-Deep-Dive) - React and frontend technologies
- [Architecture Overview](Architecture-Overview) - System architecture
- [Backend Patterns](Backend-Patterns) - API integration patterns

