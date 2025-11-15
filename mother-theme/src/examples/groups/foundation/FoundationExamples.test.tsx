import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FoundationExamples } from './FoundationExamples';
import {
  Clock,
  FileText,
  Tags as TagsIcon,
  Settings,
  Plus,
  Search,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Clock: ({ size }: any) => <svg data-testid="clock-icon" data-size={size} />,
  FileText: () => <svg data-testid="filetext-icon" />,
  Tags: () => <svg data-testid="tags-icon" />,
  Settings: () => <svg data-testid="settings-icon" />,
  Plus: () => <svg data-testid="plus-icon" />,
  Search: () => <svg data-testid="search-icon" />,
  Info: () => <svg data-testid="info-icon" />,
  CheckCircle: () => <svg data-testid="checkcircle-icon" />,
  AlertTriangle: () => <svg data-testid="alerttriangle-icon" />,
  XCircle: () => <svg data-testid="xcircle-icon" />,
  X: () => <svg data-testid="x-icon" />,
}));

describe('FoundationExamples', () => {
  describe('Rendering', () => {
    it('should render header with title and description', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Foundation')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Design tokens: colors, typography, spacing, borders, shadows, and iconography'
        )
      ).toBeInTheDocument();
    });

    it('should render examples-container', () => {
      const { container } = render(<FoundationExamples />);
      const containerEl = container.querySelector('.examples-container');
      expect(containerEl).toBeInTheDocument();
    });

    it('should render examples-header', () => {
      const { container } = render(<FoundationExamples />);
      const header = container.querySelector('.examples-header');
      expect(header).toBeInTheDocument();
    });
  });

  describe('Colors Section', () => {
    it('should render colors section', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Colors')).toBeInTheDocument();
    });

    it('should render background colors', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Background Colors')).toBeInTheDocument();
      expect(screen.getByText('bg-primary')).toBeInTheDocument();
      expect(screen.getByText('bg-secondary')).toBeInTheDocument();
      expect(screen.getByText('bg-tertiary')).toBeInTheDocument();
      expect(screen.getByText('bg-elevated')).toBeInTheDocument();
      expect(screen.getByText('bg-accent-light')).toBeInTheDocument();
    });

    it('should render text colors', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Text Colors')).toBeInTheDocument();
      expect(screen.getByText('text-primary')).toBeInTheDocument();
      expect(screen.getByText('text-secondary')).toBeInTheDocument();
      expect(screen.getByText('text-tertiary')).toBeInTheDocument();
      expect(screen.getByText('text-inverse')).toBeInTheDocument();
    });

    it('should render accent colors', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Accent Colors')).toBeInTheDocument();
      expect(screen.getByText('accent-yellow')).toBeInTheDocument();
      expect(screen.getByText('accent-blue')).toBeInTheDocument();
      expect(screen.getByText('accent-green')).toBeInTheDocument();
      expect(screen.getByText('accent-purple')).toBeInTheDocument();
      expect(screen.getByText('accent-pink')).toBeInTheDocument();
      expect(screen.getByText('accent-orange')).toBeInTheDocument();
      expect(screen.getByText('accent-red')).toBeInTheDocument();
    });

    it('should render status colors', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Status Colors')).toBeInTheDocument();
      expect(screen.getByText('success')).toBeInTheDocument();
      expect(screen.getByText('warning')).toBeInTheDocument();
      expect(screen.getByText('error')).toBeInTheDocument();
      expect(screen.getByText('info')).toBeInTheDocument();
    });

    it('should render color swatches', () => {
      const { container } = render(<FoundationExamples />);
      const swatches = container.querySelectorAll('.color-swatch');
      expect(swatches.length).toBeGreaterThan(0);
    });

    it('should render color values', () => {
      render(<FoundationExamples />);

      // Color values may appear multiple times, so use getAllByText
      const bgPrimary = screen.getAllByText('#0a0a0a');
      expect(bgPrimary.length).toBeGreaterThan(0);
      const bgSecondary = screen.getAllByText('#141414');
      expect(bgSecondary.length).toBeGreaterThan(0);
      const textPrimary = screen.getAllByText('#f0f0f0');
      expect(textPrimary.length).toBeGreaterThan(0);
    });
  });

  describe('Typography Section', () => {
    it('should render typography section', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Typography')).toBeInTheDocument();
    });

    it('should render headings', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Headings')).toBeInTheDocument();
      expect(screen.getByText('Heading 1 - Extra Large')).toBeInTheDocument();
      expect(screen.getByText('Heading 2 - Large')).toBeInTheDocument();
      expect(screen.getByText('Heading 3 - Medium')).toBeInTheDocument();
      expect(screen.getByText('Heading 4 - Small with Light Background')).toBeInTheDocument();
      expect(screen.getByText('Heading 5 - Extra Small Uppercase')).toBeInTheDocument();
    });

    it('should render body text', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Body Text')).toBeInTheDocument();
      expect(
        screen.getByText(/This is regular paragraph text/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/This is lead text/i)).toBeInTheDocument();
      expect(screen.getByText(/This is small text/i)).toBeInTheDocument();
    });

    it('should render labels and tags', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Labels & Tags')).toBeInTheDocument();
      expect(screen.getByText('Label Text')).toBeInTheDocument();
      expect(screen.getByText('Tag Text')).toBeInTheDocument();
    });

    it('should render font weights', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Font Weights')).toBeInTheDocument();
      expect(screen.getByText('Light (300)')).toBeInTheDocument();
      expect(screen.getByText('Regular (400)')).toBeInTheDocument();
      expect(screen.getByText('Medium (500)')).toBeInTheDocument();
      expect(screen.getByText('Semibold (600)')).toBeInTheDocument();
      expect(screen.getByText('Bold (700)')).toBeInTheDocument();
      expect(screen.getByText('Extrabold (800)')).toBeInTheDocument();
    });

    it('should render font sizes', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Font Sizes')).toBeInTheDocument();
      expect(screen.getByText('Extra Small (12px)')).toBeInTheDocument();
      expect(screen.getByText('Small (14px)')).toBeInTheDocument();
      expect(screen.getByText('Base (16px)')).toBeInTheDocument();
      expect(screen.getByText('Large (18px)')).toBeInTheDocument();
      expect(screen.getByText('Extra Large (20px)')).toBeInTheDocument();
      expect(screen.getByText('2XL (24px)')).toBeInTheDocument();
      expect(screen.getByText('3XL (30px)')).toBeInTheDocument();
      expect(screen.getByText('4XL (36px)')).toBeInTheDocument();
    });

    it('should render monospace font', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Monospace Font')).toBeInTheDocument();
      expect(screen.getByText(/Code: const example/i)).toBeInTheDocument();
    });
  });

  describe('Spacing Section', () => {
    it('should render spacing section', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Spacing System')).toBeInTheDocument();
    });

    it('should render spacing scale', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Spacing Scale')).toBeInTheDocument();
      expect(screen.getByText('space-1 (4px)')).toBeInTheDocument();
      expect(screen.getByText('space-2 (8px)')).toBeInTheDocument();
      expect(screen.getByText('space-4 (16px)')).toBeInTheDocument();
      expect(screen.getByText('space-6 (24px)')).toBeInTheDocument();
      expect(screen.getByText('space-8 (32px)')).toBeInTheDocument();
      expect(screen.getByText('space-12 (48px)')).toBeInTheDocument();
    });

    it('should render spacing demo bars', () => {
      const { container } = render(<FoundationExamples />);
      const bars = container.querySelectorAll('.spacing-demo-bar');
      expect(bars.length).toBeGreaterThan(0);
    });
  });

  describe('Borders Section', () => {
    it('should render borders section', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Borders')).toBeInTheDocument();
    });

    it('should render border widths', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Border Widths')).toBeInTheDocument();
      expect(screen.getByText('Thin Border (1px)')).toBeInTheDocument();
      expect(screen.getByText('Medium Border (2px)')).toBeInTheDocument();
      expect(screen.getByText('Thick Border (3px)')).toBeInTheDocument();
      expect(screen.getByText('Extra Thick Border (4px)')).toBeInTheDocument();
    });

    it('should render border demos', () => {
      const { container } = render(<FoundationExamples />);
      const borderDemos = container.querySelectorAll('.border-demo');
      expect(borderDemos.length).toBeGreaterThan(0);
    });
  });

  describe('Shadows and Glows Section', () => {
    it('should render shadows section', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Shadows and Glows')).toBeInTheDocument();
    });

    it('should render sharp shadows', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Sharp Shadows & Elevation')).toBeInTheDocument();
      expect(screen.getByText('Small Shadow')).toBeInTheDocument();
      expect(screen.getByText('Medium Shadow')).toBeInTheDocument();
      expect(screen.getByText('Large Shadow')).toBeInTheDocument();
      expect(screen.getByText('Extra Large Shadow')).toBeInTheDocument();
    });

    it('should render soft shadows', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Soft Shadows')).toBeInTheDocument();
      expect(screen.getByText('Soft Small')).toBeInTheDocument();
      expect(screen.getByText('Soft Medium')).toBeInTheDocument();
      expect(screen.getByText('Soft Large')).toBeInTheDocument();
    });

    it('should render glows', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Glows')).toBeInTheDocument();
      expect(screen.getByText('White Glow')).toBeInTheDocument();
      expect(screen.getByText('Yellow Glow')).toBeInTheDocument();
      expect(screen.getByText('Blue Glow')).toBeInTheDocument();
      expect(screen.getByText('Green Glow')).toBeInTheDocument();
      expect(screen.getByText('Purple Glow')).toBeInTheDocument();
      expect(screen.getByText('Pink Glow')).toBeInTheDocument();
      expect(screen.getByText('Orange Glow')).toBeInTheDocument();
      expect(screen.getByText('Red Glow')).toBeInTheDocument();
    });

    it('should render shadow demos', () => {
      const { container } = render(<FoundationExamples />);
      const shadowDemos = container.querySelectorAll('.shadow-demo');
      expect(shadowDemos.length).toBeGreaterThan(0);
    });
  });

  describe('Iconography Section', () => {
    it('should render iconography section', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Iconography')).toBeInTheDocument();
    });

    it('should render icon sizes', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Icon Sizes')).toBeInTheDocument();
      expect(screen.getByText('XS (12px)')).toBeInTheDocument();
      expect(screen.getByText('SM (16px)')).toBeInTheDocument();
      expect(screen.getByText('MD (24px)')).toBeInTheDocument();
      expect(screen.getByText('LG (32px)')).toBeInTheDocument();
      expect(screen.getByText('XL (40px)')).toBeInTheDocument();
      expect(screen.getByText('2XL (48px)')).toBeInTheDocument();
    });

    it('should render common icons', () => {
      render(<FoundationExamples />);

      expect(screen.getByText('Common Icons')).toBeInTheDocument();
      expect(screen.getByText('FileText')).toBeInTheDocument();
      expect(screen.getByText('Clock')).toBeInTheDocument();
      expect(screen.getByText('Tags')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Search')).toBeInTheDocument();
      expect(screen.getByText('Plus')).toBeInTheDocument();
      expect(screen.getByText('X')).toBeInTheDocument();
      expect(screen.getByText('CheckCircle')).toBeInTheDocument();
      expect(screen.getByText('AlertTriangle')).toBeInTheDocument();
      expect(screen.getByText('XCircle')).toBeInTheDocument();
      expect(screen.getByText('Info')).toBeInTheDocument();
    });

    it('should render icon showcases', () => {
      const { container } = render(<FoundationExamples />);
      const showcases = container.querySelectorAll('.icon-showcase');
      expect(showcases.length).toBeGreaterThan(0);
    });

    it('should render icon grid', () => {
      const { container } = render(<FoundationExamples />);
      const iconGrid = container.querySelector('.icon-grid');
      expect(iconGrid).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle rendering with all sections', () => {
      const { container } = render(<FoundationExamples />);
      expect(container.querySelector('.examples-container')).toBeInTheDocument();
    });

    it('should render all color grids', () => {
      const { container } = render(<FoundationExamples />);
      const colorGrids = container.querySelectorAll('.color-grid');
      expect(colorGrids.length).toBeGreaterThan(0);
    });

    it('should render all typography examples', () => {
      const { container } = render(<FoundationExamples />);
      const typographyExamples = container.querySelectorAll('.typography-examples');
      expect(typographyExamples.length).toBeGreaterThan(0);
    });
  });
});

