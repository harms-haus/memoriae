import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ExamplesHub } from './ExamplesHub';
import { Button } from '../components';

// Mock Button component
vi.mock('../components', async () => {
  const actual = await vi.importActual('../components');
  return {
    ...actual,
    Button: ({ children, variant, ...props }: any) => (
      <button className={`btn-${variant || 'primary'}`} {...props}>
        {children}
      </button>
    ),
  };
});

describe('ExamplesHub', () => {
  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Rendering', () => {
    it('should render header with title and description', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Mother Theme Examples')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Complete showcase of design system components, colors, typography, and interactive elements'
        )
      ).toBeInTheDocument();
    });

    it('should render examples-hub container', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const hub = container.querySelector('.examples-hub');
      expect(hub).toBeInTheDocument();
    });

    it('should render examples-hub-header', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const header = container.querySelector('.examples-hub-header');
      expect(header).toBeInTheDocument();
    });

    it('should render examples-hub-grid', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const grid = container.querySelector('.examples-hub-grid');
      expect(grid).toBeInTheDocument();
    });
  });

  describe('Navigation Cards', () => {
    it('should render all 6 navigation cards', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Foundation')).toBeInTheDocument();
      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(screen.getByText('Overlays')).toBeInTheDocument();
      expect(screen.getByText('Layout')).toBeInTheDocument();
      expect(screen.getByText('Effects')).toBeInTheDocument();
      expect(screen.getByText('AI Catalogue')).toBeInTheDocument();
    });

    it('should render card descriptions', () => {
      renderWithRouter(<ExamplesHub />);

      expect(
        screen.getByText('Design tokens: colors, typography, spacing, borders, shadows, and iconography')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Interactive UI components: buttons, forms, progress, tabs, tags, and badges')
      ).toBeInTheDocument();
      expect(screen.getByText('Modal dialogs, drawers, notifications, and toasts')).toBeInTheDocument();
      expect(
        screen.getByText('Layout components: layered panels, pointer panels, and timeline')
      ).toBeInTheDocument();
      expect(screen.getByText('Animations and visual effects')).toBeInTheDocument();
      expect(
        screen.getByText('AI-friendly component catalogue with usage examples and configurations')
      ).toBeInTheDocument();
    });

    it('should render View Examples buttons for each card', () => {
      renderWithRouter(<ExamplesHub />);

      const buttons = screen.getAllByText('View Examples');
      expect(buttons).toHaveLength(6);
    });

    it('should render cards with correct structure', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const cards = container.querySelectorAll('.examples-hub-card');
      expect(cards).toHaveLength(6);
    });

    it('should render card content sections', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const cardContents = container.querySelectorAll('.examples-hub-card-content');
      expect(cardContents).toHaveLength(6);
    });

    it('should render card action sections', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const cardActions = container.querySelectorAll('.examples-hub-card-actions');
      expect(cardActions).toHaveLength(6);
    });
  });

  describe('Links', () => {
    it('should render links with correct paths', () => {
      renderWithRouter(<ExamplesHub />);

      // Multiple "View Examples" links exist, get all and check first one
      const links = screen.getAllByRole('link', { name: /View Examples/i });
      expect(links.length).toBe(6);
      expect(links[0]?.closest('a')).toHaveAttribute('href', '/foundation');
    });

    it('should have correct paths for all cards', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      const links = container.querySelectorAll('a[href]');

      const paths = Array.from(links).map((link) => link.getAttribute('href'));
      expect(paths).toContain('/foundation');
      expect(paths).toContain('/components');
      expect(paths).toContain('/overlays');
      expect(paths).toContain('/layout');
      expect(paths).toContain('/effects');
      expect(paths).toContain('/bots');
    });
  });

  describe('Card Data', () => {
    it('should render Foundation card with correct data', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Foundation')).toBeInTheDocument();
      expect(
        screen.getByText('Design tokens: colors, typography, spacing, borders, shadows, and iconography')
      ).toBeInTheDocument();
    });

    it('should render Components card with correct data', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Components')).toBeInTheDocument();
      expect(
        screen.getByText('Interactive UI components: buttons, forms, progress, tabs, tags, and badges')
      ).toBeInTheDocument();
    });

    it('should render Overlays card with correct data', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Overlays')).toBeInTheDocument();
      expect(screen.getByText('Modal dialogs, drawers, notifications, and toasts')).toBeInTheDocument();
    });

    it('should render Layout card with correct data', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Layout')).toBeInTheDocument();
      expect(
        screen.getByText('Layout components: layered panels, pointer panels, and timeline')
      ).toBeInTheDocument();
    });

    it('should render Effects card with correct data', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('Effects')).toBeInTheDocument();
      expect(screen.getByText('Animations and visual effects')).toBeInTheDocument();
    });

    it('should render AI Catalogue card with correct data', () => {
      renderWithRouter(<ExamplesHub />);

      expect(screen.getByText('AI Catalogue')).toBeInTheDocument();
      expect(
        screen.getByText('AI-friendly component catalogue with usage examples and configurations')
      ).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering with minimal props', () => {
      const { container } = renderWithRouter(<ExamplesHub />);
      expect(container.querySelector('.examples-hub')).toBeInTheDocument();
    });
  });
});

