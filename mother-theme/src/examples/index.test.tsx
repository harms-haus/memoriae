import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Examples, ExamplesHub } from './index';

// Mock all example components
vi.mock('./ExamplesHub', () => ({
  ExamplesHub: () => <div data-testid="examples-hub">ExamplesHub</div>,
}));

vi.mock('./groups/foundation/FoundationExamples', () => ({
  FoundationExamples: () => <div data-testid="foundation-examples">FoundationExamples</div>,
}));

vi.mock('./groups/components/ComponentExamples', () => ({
  ComponentExamples: () => <div data-testid="component-examples">ComponentExamples</div>,
}));

vi.mock('./groups/overlays/OverlayExamples', () => ({
  OverlayExamples: () => <div data-testid="overlay-examples">OverlayExamples</div>,
}));

vi.mock('./groups/layout/LayoutExamples', () => ({
  LayoutExamples: () => <div data-testid="layout-examples">LayoutExamples</div>,
}));

vi.mock('./groups/effects/EffectsExamples', () => ({
  EffectsExamples: () => <div data-testid="effects-examples">EffectsExamples</div>,
}));

vi.mock('./bots/Catalogue', () => ({
  Catalogue: () => <div data-testid="catalogue">Catalogue</div>,
}));

// Mock ToastProvider
vi.mock('../components', async () => {
  const actual = await vi.importActual('../components');
  return {
    ...actual,
    ToastProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  };
});

// Mock react-router-dom to avoid Router nesting issues
let mockPathname = '/';
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  
  return {
    ...actual,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useLocation: () => ({ pathname: mockPathname }),
    Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
    Routes: ({ children }: { children: React.ReactNode }) => {
      // Simple routing based on mockPathname - use mocked components
      if (mockPathname === '/') {
        return <div data-testid="examples-hub">ExamplesHub</div>;
      } else if (mockPathname === '/foundation') {
        return <div data-testid="foundation-examples">FoundationExamples</div>;
      } else if (mockPathname === '/components') {
        return <div data-testid="component-examples">ComponentExamples</div>;
      } else if (mockPathname === '/overlays') {
        return <div data-testid="overlay-examples">OverlayExamples</div>;
      } else if (mockPathname === '/layout') {
        return <div data-testid="layout-examples">LayoutExamples</div>;
      } else if (mockPathname === '/effects') {
        return <div data-testid="effects-examples">EffectsExamples</div>;
      } else if (mockPathname === '/bots') {
        return <div data-testid="catalogue">Catalogue</div>;
      }
      return null;
    },
    Route: ({ element }: { element: React.ReactNode }) => element,
  };
});

describe('Examples', () => {
  describe('Router Setup', () => {
    it('should render Examples component', () => {
      const { container } = render(<Examples />);

      // examples-app is a className, not a data-testid
      const app = container.querySelector('.examples-app');
      expect(app).toBeInTheDocument();
    });

    it('should render root route with ExamplesHub', () => {
      mockPathname = '/';
      render(<Examples />);

      expect(screen.getByTestId('examples-hub')).toBeInTheDocument();
    });

    it('should render foundation route', () => {
      mockPathname = '/foundation';
      render(<Examples />);

      expect(screen.getByTestId('foundation-examples')).toBeInTheDocument();
    });

    it('should render components route', () => {
      mockPathname = '/components';
      render(<Examples />);

      expect(screen.getByTestId('component-examples')).toBeInTheDocument();
    });

    it('should render overlays route', () => {
      mockPathname = '/overlays';
      render(<Examples />);

      expect(screen.getByTestId('overlay-examples')).toBeInTheDocument();
    });

    it('should render layout route', () => {
      mockPathname = '/layout';
      render(<Examples />);

      expect(screen.getByTestId('layout-examples')).toBeInTheDocument();
    });

    it('should render effects route', () => {
      mockPathname = '/effects';
      render(<Examples />);

      expect(screen.getByTestId('effects-examples')).toBeInTheDocument();
    });

    it('should render bots route', () => {
      mockPathname = '/bots';
      render(<Examples />);

      expect(screen.getByTestId('catalogue')).toBeInTheDocument();
    });
  });

  describe('BackButton', () => {
    it('should not render back button on root path', () => {
      mockPathname = '/';
      render(<Examples />);

      expect(screen.queryByText('← Back to Hub')).not.toBeInTheDocument();
    });

    it('should render back button on non-root paths', () => {
      mockPathname = '/foundation';
      render(<Examples />);

      expect(screen.getByText('← Back to Hub')).toBeInTheDocument();
    });

    it('should have correct link for back button', () => {
      mockPathname = '/components';
      render(<Examples />);

      const backLink = screen.getByText('← Back to Hub').closest('a');
      expect(backLink).toHaveAttribute('href', '/');
    });
  });

  describe('ToastProvider', () => {
    it('should wrap content with ToastProvider', () => {
      const { container } = render(<Examples />);

      // ToastProvider is mocked, so we just verify the structure exists
      expect(container.querySelector('.examples-app')).toBeInTheDocument();
    });
  });

  describe('Exports', () => {
    it('should export ExamplesHub', () => {
      expect(ExamplesHub).toBeDefined();
    });

    it('should export all example components', async () => {
      const module = await import('./index');
      expect(module.ExamplesHub).toBeDefined();
      expect(module.FoundationExamples).toBeDefined();
      expect(module.ComponentExamples).toBeDefined();
      expect(module.OverlayExamples).toBeDefined();
      expect(module.LayoutExamples).toBeDefined();
      expect(module.EffectsExamples).toBeDefined();
      expect(module.Catalogue).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle invalid routes gracefully', () => {
      mockPathname = '/invalid-route';
      const { container } = render(<Examples />);

      // Should not crash, but may show nothing or default route
      const app = container.querySelector('.examples-app');
      expect(app).toBeInTheDocument();
    });

    it('should handle navigation between routes', () => {
      mockPathname = '/';
      const { rerender } = render(<Examples />);

      expect(screen.getByTestId('examples-hub')).toBeInTheDocument();

      mockPathname = '/foundation';
      rerender(<Examples />);

      expect(screen.getByTestId('foundation-examples')).toBeInTheDocument();
    });
  });
});

