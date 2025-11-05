import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../../../mother-theme/src/components/Button'
import './Views.css'

export function SettingsView() {
  const { user, logout } = useAuth()

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
        <Button variant="secondary" onClick={logout}>
          Logout
        </Button>
      </div>

      <div className="settings-section">
        <h3>Preferences</h3>
        <p className="lead">Settings options coming soon.</p>
      </div>
    </div>
  )
}

