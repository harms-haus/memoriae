import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Panel } from './Panel';

describe('Panel', () => {
  describe('Rendering', () => {
    it('should render panel with children', () => {
      render(
        <Panel>
          <div>Panel content</div>
        </Panel>
      );

      expect(screen.getByText('Panel content')).toBeInTheDocument();
    });

    it('should render panel with default variant', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toBeInTheDocument();
      expect(panel).not.toHaveClass('panel-elevated');
      expect(panel).not.toHaveClass('panel-accent');
    });

    it('should render panel with elevated variant', () => {
      const { container } = render(
        <Panel variant="elevated">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toHaveClass('panel-elevated');
    });

    it('should render panel with accent variant', () => {
      const { container } = render(
        <Panel variant="accent">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toHaveClass('panel-accent');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <Panel className="custom-class">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toHaveClass('custom-class');
    });

    it('should combine variant and custom className', () => {
      const { container } = render(
        <Panel variant="elevated" className="custom-class">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toHaveClass('panel-elevated');
      expect(panel).toHaveClass('custom-class');
    });
  });

  describe('Header', () => {
    it('should render panel without header when header prop is not provided', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );

      const header = container.querySelector('.panel-header-light');
      expect(header).not.toBeInTheDocument();
    });

    it('should render panel with header when header prop is provided', () => {
      const { container } = render(
        <Panel header={<h2>Panel Title</h2>}>
          <div>Content</div>
        </Panel>
      );

      const header = container.querySelector('.panel-header-light');
      expect(header).toBeInTheDocument();
      expect(screen.getByText('Panel Title')).toBeInTheDocument();
    });

    it('should render header with React node content', () => {
      render(
        <Panel header={
          <div>
            <h2>Title</h2>
            <p>Subtitle</p>
          </div>
        }>
          <div>Content</div>
        </Panel>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });

    it('should render header with string content', () => {
      render(
        <Panel header="Simple Header">
          <div>Content</div>
        </Panel>
      );

      expect(screen.getByText('Simple Header')).toBeInTheDocument();
    });
  });

  describe('Children', () => {
    it('should render multiple children', () => {
      render(
        <Panel>
          <div>First child</div>
          <div>Second child</div>
          <div>Third child</div>
        </Panel>
      );

      expect(screen.getByText('First child')).toBeInTheDocument();
      expect(screen.getByText('Second child')).toBeInTheDocument();
      expect(screen.getByText('Third child')).toBeInTheDocument();
    });

    it('should render complex children structure', () => {
      render(
        <Panel>
          <div>
            <h3>Section Title</h3>
            <p>Section content</p>
            <ul>
              <li>Item 1</li>
              <li>Item 2</li>
            </ul>
          </div>
        </Panel>
      );

      expect(screen.getByText('Section Title')).toBeInTheDocument();
      expect(screen.getByText('Section content')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should not apply variant classes when variant is default', () => {
      const { container } = render(
        <Panel variant="default">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).not.toHaveClass('panel-elevated');
      expect(panel).not.toHaveClass('panel-accent');
    });

    it('should apply only elevated class when variant is elevated', () => {
      const { container } = render(
        <Panel variant="elevated">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toHaveClass('panel-elevated');
      expect(panel).not.toHaveClass('panel-accent');
    });

    it('should apply only accent class when variant is accent', () => {
      const { container } = render(
        <Panel variant="accent">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toHaveClass('panel-accent');
      expect(panel).not.toHaveClass('panel-elevated');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      const { container } = render(<Panel>{null}</Panel>);

      const panel = container.querySelector('.panel');
      expect(panel).toBeInTheDocument();
    });

    it('should handle null children', () => {
      const { container } = render(
        <Panel>
          {null}
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toBeInTheDocument();
    });

    it('should handle empty string className', () => {
      const { container } = render(
        <Panel className="">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toBeInTheDocument();
    });

    it('should filter out empty className values', () => {
      const { container } = render(
        <Panel className="   ">
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should render as a div element', () => {
      const { container } = render(
        <Panel>
          <div>Content</div>
        </Panel>
      );

      const panel = container.querySelector('.panel');
      expect(panel?.tagName).toBe('DIV');
    });

    it('should preserve semantic structure with header and content', () => {
      render(
        <Panel header={<header>Header</header>}>
          <main>Content</main>
        </Panel>
      );

      expect(screen.getByText('Header')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });
});

