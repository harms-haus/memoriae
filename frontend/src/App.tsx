import React from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import './styles/theme.css'

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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
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
      
      <div style={{
        background: 'var(--bg-secondary)',
        border: '3px solid var(--border-primary)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-8)',
        maxWidth: '400px',
        width: '100%',
      }}>
        <h2 style={{
          fontSize: 'var(--text-lg)',
          fontWeight: 'var(--weight-semibold)',
          marginBottom: 'var(--space-6)',
        }}>Sign in to continue</h2>
        
        {error && (
          <div style={{
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            background: 'var(--bg-tertiary)',
            border: '3px solid var(--border-primary)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--text-primary)',
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}>
          <button
            onClick={() => handleLogin('google')}
            style={{
              padding: 'var(--space-4) var(--space-6)',
              background: 'var(--bg-tertiary)',
              border: '3px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-vibrant)'
              e.currentTarget.style.background = 'var(--bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)'
              e.currentTarget.style.background = 'var(--bg-tertiary)'
            }}
          >
            Sign in with Google
          </button>
          
          <button
            onClick={() => handleLogin('github')}
            style={{
              padding: 'var(--space-4) var(--space-6)',
              background: 'var(--bg-tertiary)',
              border: '3px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-base)',
              fontWeight: 'var(--weight-medium)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-vibrant)'
              e.currentTarget.style.background = 'var(--bg-secondary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)'
              e.currentTarget.style.background = 'var(--bg-tertiary)'
            }}
          >
            Sign in with GitHub
          </button>
        </div>
      </div>
    </div>
  )
}

function AppContent() {
  const { authenticated, loading, user, logout } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
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
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      padding: 'var(--space-6)',
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 'var(--space-8)',
        paddingBottom: 'var(--space-4)',
        borderBottom: '3px solid var(--border-primary)',
      }}>
        <h1 style={{
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--weight-bold)',
        }}>Memoriae</h1>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
        }}>
          <span style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)',
          }}>
            {user?.name} ({user?.email})
          </span>
          <button
            onClick={logout}
            style={{
              padding: 'var(--space-2) var(--space-4)',
              background: 'var(--bg-secondary)',
              border: '3px solid var(--border-primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <main>
        <p>Welcome to Memoriae! Your authenticated app is ready.</p>
      </main>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
