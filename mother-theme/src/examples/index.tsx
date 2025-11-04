import { useState } from 'react';
import '../styles/theme.css';
import { ToastProvider } from '../components';
import { ExamplesHub } from './ExamplesHub';
import './index.css';
import { FoundationExamples } from './groups/foundation/FoundationExamples';
import { ComponentExamples } from './groups/components/ComponentExamples';
import { OverlayExamples } from './groups/overlays/OverlayExamples';
import { LayoutExamples } from './groups/layout/LayoutExamples';
import { EffectsExamples } from './groups/effects/EffectsExamples';
import { Catalogue } from './bots/Catalogue';

export type ExamplesRoute = 
  | '/'
  | '/foundation'
  | '/components'
  | '/overlays'
  | '/layout'
  | '/effects'
  | '/bots';

export function Examples() {
  const [route, setRoute] = useState<ExamplesRoute>('/');

  const navigate = (path: string) => {
    setRoute(path as ExamplesRoute);
  };

  const goBack = () => {
    setRoute('/');
  };

  const renderContent = () => {
    switch (route) {
      case '/foundation':
        return (
          <>
            <button className="back-button" onClick={goBack} style={{ marginBottom: 'var(--space-4)' }}>
              ← Back to Hub
            </button>
            <FoundationExamples />
          </>
        );
      case '/components':
        return (
          <>
            <button className="back-button" onClick={goBack} style={{ marginBottom: 'var(--space-4)' }}>
              ← Back to Hub
            </button>
            <ComponentExamples />
          </>
        );
      case '/overlays':
        return (
          <>
            <button className="back-button" onClick={goBack} style={{ marginBottom: 'var(--space-4)' }}>
              ← Back to Hub
            </button>
            <OverlayExamples />
          </>
        );
      case '/layout':
        return (
          <>
            <button className="back-button" onClick={goBack} style={{ marginBottom: 'var(--space-4)' }}>
              ← Back to Hub
            </button>
            <LayoutExamples />
          </>
        );
      case '/effects':
        return (
          <>
            <button className="back-button" onClick={goBack} style={{ marginBottom: 'var(--space-4)' }}>
              ← Back to Hub
            </button>
            <EffectsExamples />
          </>
        );
      case '/bots':
        return (
          <>
            <button className="back-button" onClick={goBack} style={{ marginBottom: 'var(--space-4)' }}>
              ← Back to Hub
            </button>
            <Catalogue />
          </>
        );
      default:
        return <ExamplesHub onNavigate={navigate} />;
    }
  };

  return (
    <ToastProvider>
      <div className="examples-app">
        {renderContent()}
      </div>
    </ToastProvider>
  );
}

// Export individual components for direct use
export { ExamplesHub } from './ExamplesHub';
export { FoundationExamples } from './groups/foundation/FoundationExamples';
export { ComponentExamples } from './groups/components/ComponentExamples';
export { OverlayExamples } from './groups/overlays/OverlayExamples';
export { LayoutExamples } from './groups/layout/LayoutExamples';
export { EffectsExamples } from './groups/effects/EffectsExamples';
export { Catalogue } from './bots/Catalogue';

