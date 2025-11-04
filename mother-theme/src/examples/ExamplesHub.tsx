import '../styles/theme.css';
import { Button } from '../components';
import './ExamplesHub.css';

interface NavigationCard {
  id: string;
  title: string;
  description: string;
  path: string;
}

const navigationCards: NavigationCard[] = [
  {
    id: 'foundation',
    title: 'Foundation',
    description: 'Design tokens: colors, typography, spacing, borders, shadows, and iconography',
    path: '/foundation',
  },
  {
    id: 'components',
    title: 'Components',
    description: 'Interactive UI components: buttons, forms, progress, tabs, tags, and badges',
    path: '/components',
  },
  {
    id: 'overlays',
    title: 'Overlays',
    description: 'Modal dialogs, drawers, notifications, and toasts',
    path: '/overlays',
  },
  {
    id: 'layout',
    title: 'Layout',
    description: 'Layout components: layered panels, pointer panels, and timeline',
    path: '/layout',
  },
  {
    id: 'effects',
    title: 'Effects',
    description: 'Animations and visual effects',
    path: '/effects',
  },
  {
    id: 'bots',
    title: 'AI Catalogue',
    description: 'AI-friendly component catalogue with usage examples and configurations',
    path: '/bots',
  },
];

interface ExamplesHubProps {
  onNavigate: (path: string) => void;
}

export function ExamplesHub({ onNavigate }: ExamplesHubProps) {
  return (
    <div className="examples-hub">
      <header className="examples-hub-header">
        <h1>Mother Theme Examples</h1>
        <p className="lead">Complete showcase of design system components, colors, typography, and interactive elements</p>
      </header>

      <div className="examples-hub-grid">
        {navigationCards.map((card) => (
          <div key={card.id} className="examples-hub-card">
            <div className="examples-hub-card-content">
              <h2>{card.title}</h2>
              <p className="text-sm">{card.description}</p>
            </div>
            <div className="examples-hub-card-actions">
              <Button variant="primary" onClick={() => onNavigate(card.path)}>
                View Examples
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

