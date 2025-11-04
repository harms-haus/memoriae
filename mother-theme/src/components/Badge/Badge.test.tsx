import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from './Badge';

describe('Badge', () => {
  describe('Rendering', () => {
    it('should render badge with children', () => {
      render(<Badge>Test Badge</Badge>);
      
      expect(screen.getByText('Test Badge')).toBeInTheDocument();
    });

    it('should apply badge base class', () => {
      const { container } = render(<Badge>Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toBeInTheDocument();
      expect(badge).toHaveClass('badge');
    });
  });

  describe('Variants', () => {
    it('should apply primary variant by default', () => {
      const { container } = render(<Badge>Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('badge-primary');
    });

    it('should apply primary variant class', () => {
      const { container } = render(<Badge variant="primary">Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('badge-primary');
    });

    it('should apply success variant class', () => {
      const { container } = render(<Badge variant="success">Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('badge-success');
    });

    it('should apply warning variant class', () => {
      const { container } = render(<Badge variant="warning">Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('badge-warning');
    });

    it('should apply error variant class', () => {
      const { container } = render(<Badge variant="error">Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('badge-error');
    });
  });

  describe('Custom Class', () => {
    it('should apply custom className', () => {
      const { container } = render(<Badge className="custom-class">Test</Badge>);
      
      const badge = container.querySelector('.badge');
      expect(badge).toHaveClass('custom-class');
    });
  });
});

