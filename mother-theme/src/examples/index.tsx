import '../styles/theme.css';
import { ToastProvider } from '../components';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ExamplesHub } from './ExamplesHub';
import './index.css';
import { FoundationExamples } from './groups/foundation/FoundationExamples';
import { ComponentExamples } from './groups/components/ComponentExamples';
import { OverlayExamples } from './groups/overlays/OverlayExamples';
import { LayoutExamples } from './groups/layout/LayoutExamples';
import { EffectsExamples } from './groups/effects/EffectsExamples';
import { Catalogue } from './bots/Catalogue';

function BackButton() {
  const location = useLocation();
  
  if (location.pathname === '/') {
    return null;
  }
  
  return (
    <Link to="/" className="back-button" style={{ marginBottom: 'var(--space-4)', display: 'inline-block' }}>
      ← Back to Hub
    </Link>
  );
}

function ExamplesRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ExamplesHub />} />
      <Route path="/foundation" element={<FoundationExamples />} />
      <Route path="/components" element={<ComponentExamples />} />
      <Route path="/overlays" element={<OverlayExamples />} />
      <Route path="/layout" element={<LayoutExamples />} />
      <Route path="/effects" element={<EffectsExamples />} />
      <Route path="/bots" element={<Catalogue />} />
    </Routes>
  );
}

export function Examples() {
  return (
    <ToastProvider>
      <BrowserRouter>
        <div className="examples-app">
          <BackButton />
          <ExamplesRoutes />
        </div>
      </BrowserRouter>
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
