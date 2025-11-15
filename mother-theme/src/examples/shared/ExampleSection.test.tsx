import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExampleSection } from './ExampleSection';

describe('ExampleSection', () => {
  describe('Rendering', () => {
    it('should render section with id and title', () => {
      const { container } = render(
        <ExampleSection id="test-section" title="Test Section">
          <p>Test content</p>
        </ExampleSection>
      );

      const section = container.querySelector('section#test-section');
      expect(section).toBeInTheDocument();
      expect(section).toHaveAttribute('id', 'test-section');
      expect(screen.getByText('Test Section')).toBeInTheDocument();
    });

    it('should render children content', () => {
      render(
        <ExampleSection id="test" title="Test">
          <div data-testid="child">Child content</div>
        </ExampleSection>
      );

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });

    it('should apply showcase-section class', () => {
      const { container } = render(
        <ExampleSection id="test" title="Test">
          Content
        </ExampleSection>
      );

      const section = container.querySelector('section.showcase-section');
      expect(section).toBeInTheDocument();
    });

    it('should render h2 with title', () => {
      render(
        <ExampleSection id="test" title="My Title">
          Content
        </ExampleSection>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('My Title');
    });
  });

  describe('Props', () => {
    it('should handle different id values', () => {
      const { container, rerender } = render(
        <ExampleSection id="section-1" title="Test">
          Content
        </ExampleSection>
      );

      let section = container.querySelector('#section-1');
      expect(section).toBeInTheDocument();

      rerender(
        <ExampleSection id="section-2" title="Test">
          Content
        </ExampleSection>
      );

      section = container.querySelector('#section-2');
      expect(section).toBeInTheDocument();
    });

    it('should handle different title values', () => {
      const { rerender } = render(
        <ExampleSection id="test" title="Title 1">
          Content
        </ExampleSection>
      );

      expect(screen.getByText('Title 1')).toBeInTheDocument();

      rerender(
        <ExampleSection id="test" title="Title 2">
          Content
        </ExampleSection>
      );

      expect(screen.getByText('Title 2')).toBeInTheDocument();
    });

    it('should render multiple children', () => {
      render(
        <ExampleSection id="test" title="Test">
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
          <div data-testid="child3">Child 3</div>
        </ExampleSection>
      );

      expect(screen.getByTestId('child1')).toBeInTheDocument();
      expect(screen.getByTestId('child2')).toBeInTheDocument();
      expect(screen.getByTestId('child3')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty children', () => {
      const { container } = render(
        <ExampleSection id="test" title="Test">
          {null}
        </ExampleSection>
      );

      const section = container.querySelector('section');
      expect(section).toBeInTheDocument();
    });

    it('should handle empty string title', () => {
      render(
        <ExampleSection id="test" title="">
          Content
        </ExampleSection>
      );

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('');
    });

    it('should handle special characters in id', () => {
      const { container } = render(
        <ExampleSection id="test-section_123" title="Test">
          Content
        </ExampleSection>
      );

      const section = container.querySelector('#test-section_123');
      expect(section).toBeInTheDocument();
    });
  });
});

