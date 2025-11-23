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
              <div className="landing-screenshot-image">
                <img 
                  src="/ss/ss_seeds.png" 
                  alt="Seeds view - main interface showing all seeds with search and filter"
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-content">
                <div className="landing-screenshot-label">Seeds View</div>
                <p className="landing-screenshot-description">
                  Main interface that lists all seeds with search and filter capabilities. 
                  Browse your memories with powerful filtering and search tools.
                </p>
              </div>
            </Panel>

            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-image">
                <img 
                  src="/ss/ss_seed.png" 
                  alt="Seed details - details for a single seed showing timeline of changes"
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-content">
                <div className="landing-screenshot-label">Seed Details</div>
                <p className="landing-screenshot-description">
                  Details for a single seed showing the timeline of changes. 
                  See how your memories evolve over time with immutable event tracking.
                </p>
              </div>
            </Panel>

            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-image">
                <img 
                  src="/ss/ss_categories.png" 
                  alt="Categories - seeds grouped according to shared category"
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-content">
                <div className="landing-screenshot-label">Categories</div>
                <p className="landing-screenshot-description">
                  Seeds are grouped here according to shared categories. 
                  Navigate your memories through hierarchical organization.
                </p>
              </div>
            </Panel>

            <Panel variant="elevated" className="landing-screenshot-card">
              <div className="landing-screenshot-image">
                <img 
                  src="/ss/ss_musings.png" 
                  alt="Daily musings - interface that finds older ideas and expands on them"
                  className="landing-screenshot-img"
                />
              </div>
              <div className="landing-screenshot-content">
                <div className="landing-screenshot-label">Daily Musings</div>
                <p className="landing-screenshot-description">
                  Interface that finds older ideas in seeds and tries to expand on them. 
                  Runs daily with a maximum of 3 ideas to help you rediscover and evolve your thoughts.
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

