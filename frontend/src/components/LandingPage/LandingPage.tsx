import { useNavigate } from 'react-router-dom'
import { Button } from '@mother/components/Button'
import { Panel } from '@mother/components/Panel'
import { 
  History, 
  Edit3, 
  Sparkles, 
  Layers
} from 'lucide-react'
import './LandingPage.css'

export function LandingPage() {
  const navigate = useNavigate()

  const handleLoginClick = () => {
    navigate('/login')
  }

  return (
    <div className="landing-page">
      {/* Header */}
      <header className="landing-header">
        <div className="landing-header-content">
          <h1 className="landing-logo">Memoriae</h1>
          <Button variant="primary" onClick={handleLoginClick}>
            Sign In
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <h2 className="landing-hero-title">
            Remember, evolve, discover.
          </h2>
          <p className="landing-hero-subtitle">
            A powerful, AI-enhanced memory and note-taking application that helps you capture, 
            organize, and evolve your thoughts over time.
          </p>
          <div className="landing-hero-cta">
            <Button variant="primary" onClick={handleLoginClick}>
              Get Started
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="landing-features">
        <div className="landing-container">
          <h2 className="landing-section-title">Powerful Features</h2>
          <div className="landing-features-grid">
            <Panel variant="elevated" className="landing-feature-card">
              <div className="landing-feature-icon" style={{ color: 'var(--accent-yellow)' }}>
                <History size={32} />
              </div>
              <h3 className="landing-feature-title">Immutable Timeline</h3>
              <p className="landing-feature-description">
                Every change to your memories is recorded as an immutable event. 
                Toggle events on and off to see how your memories evolved over time.
              </p>
            </Panel>

            <Panel variant="elevated" className="landing-feature-card">
              <div className="landing-feature-icon" style={{ color: 'var(--accent-blue)' }}>
                <Edit3 size={32} />
              </div>
              <h3 className="landing-feature-title">Dynamic 3-Stage Editor</h3>
              <p className="landing-feature-description">
                The editor automatically adapts to your content: simple textarea for quick notes, 
                markdown toolbar for formatting, and full-screen zen mode for deep writing.
              </p>
            </Panel>

            <Panel variant="elevated" className="landing-feature-card">
              <div className="landing-feature-icon" style={{ color: 'var(--accent-green)' }}>
                <Sparkles size={32} />
              </div>
              <h3 className="landing-feature-title">AI-Powered Automation</h3>
              <p className="landing-feature-description">
                Automatically suggests tags and categories based on your content. 
                Re-evaluates and updates as your memories evolve.
              </p>
            </Panel>

            <Panel variant="elevated" className="landing-feature-card">
              <div className="landing-feature-icon" style={{ color: 'var(--accent-purple)' }}>
                <Layers size={32} />
              </div>
              <h3 className="landing-feature-title">Rich Visualizations</h3>
              <p className="landing-feature-description">
                Navigate hierarchical categories, explore tag clouds, view timelines, 
                and search across all your memories with powerful visual tools.
              </p>
            </Panel>
          </div>
        </div>
      </section>

      {/* Screenshots Section */}
      <section className="landing-screenshots">
        <div className="landing-container">
          <h2 className="landing-section-title">See It In Action</h2>
          <div className="landing-screenshots-grid">
            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-placeholder">
                <div className="landing-screenshot-label">Main Interface</div>
                <p className="landing-screenshot-description">
                  Screenshot of the main seeds list view showing memory cards with tags, 
                  categories, and timestamps. Should show the clean dark theme with vibrant accent colors.
                </p>
              </div>
            </Panel>

            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-placeholder">
                <div className="landing-screenshot-label">Timeline View</div>
                <p className="landing-screenshot-description">
                  Screenshot of a seed detail view with the timeline showing immutable events. 
                  Should demonstrate how changes are tracked over time with toggleable events.
                </p>
              </div>
            </Panel>

            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-placeholder">
                <div className="landing-screenshot-label">Category Tree</div>
                <p className="landing-screenshot-description">
                  Screenshot of the hierarchical category tree visualization showing nested 
                  categories with expand/collapse functionality.
                </p>
              </div>
            </Panel>

            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-placeholder">
                <div className="landing-screenshot-label">Tag Cloud</div>
                <p className="landing-screenshot-description">
                  Screenshot of the tag cloud visualization showing color-coded tags 
                  of varying sizes based on frequency.
                </p>
              </div>
            </Panel>
          </div>
        </div>
      </section>

      {/* Call-to-Action Section */}
      <section className="landing-cta">
        <div className="landing-container">
          <Panel variant="elevated" className="landing-cta-panel">
            <h2 className="landing-cta-title">Ready to start remembering?</h2>
            <p className="landing-cta-description">
              Join Memoriae and start capturing, organizing, and evolving your thoughts today.
            </p>
            <Button variant="primary" onClick={handleLoginClick}>
              Sign In to Get Started
            </Button>
          </Panel>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-container">
          <p className="landing-footer-text">
            Memoriae - Remember, evolve, discover.
          </p>
        </div>
      </footer>
    </div>
  )
}

