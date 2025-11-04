import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from './Progress';

describe('Progress', () => {
  describe('Rendering', () => {
    it('should render progress bar with correct value', () => {
      render(<Progress value={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });

    it('should render progress fill with correct width', () => {
      const { container } = render(<Progress value={75} />);
      
      const fill = container.querySelector('.progress-fill') as HTMLElement;
      expect(fill).toHaveStyle({ width: '75%' });
    });
  });

  describe('Value Clamping', () => {
    it('should clamp value to 0-100 range', () => {
      const { rerender } = render(<Progress value={-10} />);
      
      let progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      
      rerender(<Progress value={150} />);
      
      progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '100');
    });

    it('should handle decimal values correctly', () => {
      render(<Progress value={33.333} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '33.333');
    });
  });

  describe('Label Display', () => {
    it('should show percentage label when showLabel is true', () => {
      render(<Progress value={65} showLabel />);
      
      expect(screen.getByText('65%')).toBeInTheDocument();
    });

    it('should show custom label when provided', () => {
      render(<Progress value={50} label="Custom Label" />);
      
      expect(screen.getByText('Custom Label')).toBeInTheDocument();
    });

    it('should prioritize custom label over showLabel', () => {
      render(<Progress value={50} showLabel label="Custom" />);
      
      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should not show label when showLabel is false and no label provided', () => {
      const { container } = render(<Progress value={50} />);
      
      const label = container.querySelector('.progress-label');
      expect(label).not.toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should apply default variant', () => {
      const { container } = render(<Progress value={50} />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).not.toHaveClass('progress-success');
      expect(progressBar).not.toHaveClass('progress-warning');
      expect(progressBar).not.toHaveClass('progress-error');
    });

    it('should apply success variant', () => {
      const { container } = render(<Progress value={50} variant="success" />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).toHaveClass('progress-success');
    });

    it('should apply warning variant', () => {
      const { container } = render(<Progress value={50} variant="warning" />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).toHaveClass('progress-warning');
    });

    it('should apply error variant', () => {
      const { container } = render(<Progress value={50} variant="error" />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).toHaveClass('progress-error');
    });
  });

  describe('Striped and Animated Variants', () => {
    it('should apply striped variant', () => {
      const { container } = render(<Progress value={50} striped />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).toHaveClass('progress-striped');
    });

    it('should apply animated variant', () => {
      const { container } = render(<Progress value={50} animated />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).toHaveClass('progress-animated');
    });

    it('should apply both striped and animated', () => {
      const { container } = render(<Progress value={50} striped animated />);
      
      const progressBar = container.querySelector('.progress');
      expect(progressBar).toHaveClass('progress-striped');
      expect(progressBar).toHaveClass('progress-animated');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Progress value={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });

    it('should use custom aria-label when provided', () => {
      render(<Progress value={50} aria-label="Loading progress" />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Loading progress');
    });

    it('should generate aria-label from label text when no aria-label provided', () => {
      render(<Progress value={50} label="Custom Label" />);
      
      const progressBar = screen.getByRole('progressbar');
      // Should not have aria-label when label is visible
      expect(progressBar).not.toHaveAttribute('aria-label');
    });

    it('should generate aria-label from percentage when no label or aria-label provided', () => {
      render(<Progress value={50} />);
      
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-label', 'Progress: 50%');
    });
  });
});

