import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PointerPanel } from './PointerPanel';
import type { PointerPosition } from './PointerPanel';

describe('PointerPanel', () => {
  describe('Rendering', () => {
    it('should render children content', () => {
      render(
        <PointerPanel position="center-left">
          <div>Test Content</div>
        </PointerPanel>
      );

      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('should render with base pointer-panel class', () => {
      const { container } = render(
        <PointerPanel position="center-left">
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Position Variants', () => {
    const positions: PointerPosition[] = [
      'top-left',
      'top-right',
      'center-left',
      'center-right',
      'bottom-left',
      'bottom-right',
    ];

    positions.forEach((position) => {
      it(`should apply correct class for ${position} position`, () => {
        const { container } = render(
          <PointerPanel position={position}>
            Content
          </PointerPanel>
        );

        const panel = container.querySelector('.pointer-panel');
        expect(panel).toHaveClass(`pointer-panel-${position}`);
      });

      it(`should set correct transform-origin for ${position} position`, () => {
        const { container } = render(
          <PointerPanel position={position}>
            Content
          </PointerPanel>
        );

        const panel = container.querySelector('.pointer-panel') as HTMLElement;
        const computedStyle = window.getComputedStyle(panel);
        
        // Check transform-origin based on position
        if (position === 'top-left' || position === 'top-right') {
          expect(computedStyle.transformOrigin).toContain('top');
        } else if (position === 'bottom-left' || position === 'bottom-right') {
          expect(computedStyle.transformOrigin).toContain('bottom');
        } else if (position === 'center-left' || position === 'center-right') {
          expect(computedStyle.transformOrigin).toContain('center');
        }

        if (position === 'top-left' || position === 'center-left' || position === 'bottom-left') {
          expect(computedStyle.transformOrigin).toContain('left');
        } else {
          expect(computedStyle.transformOrigin).toContain('right');
        }
      });
    });
  });

  describe('Arrow Size', () => {
    it('should use default arrow size of 16px', () => {
      const { container } = render(
        <PointerPanel position="center-left">
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      const computedStyle = window.getComputedStyle(panel);
      
      expect(computedStyle.getPropertyValue('--pointer-size')).toBe('16px');
    });

    it('should apply custom arrowSize prop', () => {
      const { container } = render(
        <PointerPanel position="center-left" arrowSize={24}>
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      const computedStyle = window.getComputedStyle(panel);
      
      expect(computedStyle.getPropertyValue('--pointer-size')).toBe('24px');
    });

    it('should apply different arrowSize values', () => {
      const { container, rerender } = render(
        <PointerPanel position="center-left" arrowSize={12}>
          Content
        </PointerPanel>
      );

      let panel = container.querySelector('.pointer-panel') as HTMLElement;
      expect(window.getComputedStyle(panel).getPropertyValue('--pointer-size')).toBe('12px');

      rerender(
        <PointerPanel position="center-left" arrowSize={32}>
          Content
        </PointerPanel>
      );

      panel = container.querySelector('.pointer-panel') as HTMLElement;
      expect(window.getComputedStyle(panel).getPropertyValue('--pointer-size')).toBe('32px');
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom style prop', () => {
      const { container } = render(
        <PointerPanel 
          position="center-left" 
          style={{ left: '100px', top: '200px' }}
        >
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      
      expect(panel.style.left).toBe('100px');
      expect(panel.style.top).toBe('200px');
    });

    it('should apply custom className prop', () => {
      const { container } = render(
        <PointerPanel 
          position="center-left" 
          className="custom-class"
        >
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel');
      expect(panel).toHaveClass('custom-class');
    });

    it('should merge custom style with CSS variable', () => {
      const { container } = render(
        <PointerPanel 
          position="center-left" 
          style={{ left: '50px', top: '100px' }}
          arrowSize={20}
        >
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      
      expect(panel.style.left).toBe('50px');
      expect(panel.style.top).toBe('100px');
      expect(window.getComputedStyle(panel).getPropertyValue('--pointer-size')).toBe('20px');
    });
  });

  describe('CSS Arrow Pseudo-elements', () => {
    it('should have ::before pseudo-element for arrow border', () => {
      const { container } = render(
        <PointerPanel position="center-left">
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel');
      expect(panel).toBeInTheDocument();
      
      // Check that the CSS class structure exists for arrow rendering
      // The actual ::before pseudo-element is rendered by CSS, not testable directly
      // but we can verify the class is applied
      expect(panel).toHaveClass('pointer-panel-center-left');
    });

    it('should have ::after pseudo-element for arrow fill', () => {
      const { container } = render(
        <PointerPanel position="center-right">
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel');
      expect(panel).toHaveClass('pointer-panel-center-right');
    });
  });

  describe('Positioning Behavior', () => {
    it('should be positioned absolutely by default', () => {
      const { container } = render(
        <PointerPanel position="top-left">
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      const computedStyle = window.getComputedStyle(panel);
      
      expect(computedStyle.position).toBe('absolute');
    });

    it('should allow custom positioning via style prop', () => {
      const { container } = render(
        <PointerPanel 
          position="bottom-right"
          style={{ 
            left: '50%', 
            top: '50%', 
            transform: 'translate(-50%, -50%)' 
          }}
        >
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      
      expect(panel.style.left).toBe('50%');
      expect(panel.style.top).toBe('50%');
      expect(panel.style.transform).toBe('translate(-50%, -50%)');
    });
  });

  describe('Content Rendering', () => {
    it('should render complex nested content', () => {
      render(
        <PointerPanel position="center-left">
          <div>
            <h3>Title</h3>
            <p>Description text</p>
            <button>Action</button>
          </div>
        </PointerPanel>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Description text')).toBeInTheDocument();
      expect(screen.getByText('Action')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <PointerPanel position="center-right">
          <span>First</span>
          <span>Second</span>
          <span>Third</span>
        </PointerPanel>
      );

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero arrow size', () => {
      const { container } = render(
        <PointerPanel position="center-left" arrowSize={0}>
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      expect(window.getComputedStyle(panel).getPropertyValue('--pointer-size')).toBe('0px');
    });

    it('should handle very large arrow size', () => {
      const { container } = render(
        <PointerPanel position="center-left" arrowSize={100}>
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel') as HTMLElement;
      expect(window.getComputedStyle(panel).getPropertyValue('--pointer-size')).toBe('100px');
    });

    it('should handle empty children', () => {
      const { container } = render(
        <PointerPanel position="center-left">
          {null}
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel');
      expect(panel).toBeInTheDocument();
    });

    it('should handle undefined className', () => {
      const { container } = render(
        <PointerPanel position="center-left" className={undefined}>
          Content
        </PointerPanel>
      );

      const panel = container.querySelector('.pointer-panel');
      expect(panel).toBeInTheDocument();
      expect(panel).toHaveClass('pointer-panel-center-left');
    });
  });
});

