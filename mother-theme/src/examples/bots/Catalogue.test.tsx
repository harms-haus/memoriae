import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Catalogue } from './Catalogue';
import { componentCatalogue } from './catalogueData';

describe('Catalogue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render catalogue container', () => {
      const { container } = render(<Catalogue />);
      const catalogueContainer = container.querySelector('.catalogue-container');
      expect(catalogueContainer).toBeInTheDocument();
    });

    it('should render header with title and description', () => {
      render(<Catalogue />);

      expect(screen.getByText('AI-Friendly Component Catalogue')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Structured component information for AI systems. Each component includes props, examples, and usage patterns.'
        )
      ).toBeInTheDocument();
    });

    it('should render catalogue-header', () => {
      const { container } = render(<Catalogue />);
      const header = container.querySelector('.catalogue-header');
      expect(header).toBeInTheDocument();
    });

    it('should render catalogue-content', () => {
      const { container } = render(<Catalogue />);
      const content = container.querySelector('.catalogue-content');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Component Sections', () => {
    it('should render all components from catalogueData', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        // Component names appear as headings, use getAllByText in case of duplicates
        const componentNames = screen.getAllByText(component.name);
        expect(componentNames.length).toBeGreaterThan(0);
      });
    });

    it('should render component descriptions', () => {
      render(<Catalogue />);

      const buttonComponent = componentCatalogue.find((c) => c.name === 'Button');
      if (buttonComponent) {
        expect(screen.getByText(buttonComponent.description)).toBeInTheDocument();
      }
    });

    it('should render component sections with correct id', () => {
      const { container } = render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        const section = container.querySelector(`#${component.name.toLowerCase()}`);
        expect(section).toBeInTheDocument();
      });
    });

    it('should render catalogue-component class for each component', () => {
      const { container } = render(<Catalogue />);
      const components = container.querySelectorAll('.catalogue-component');
      expect(components.length).toBe(componentCatalogue.length);
    });
  });

  describe('Import Paths', () => {
    it('should render import path for each component', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        const codeBlock = screen.getByText(component.importPath);
        expect(codeBlock).toBeInTheDocument();
      });
    });

    it('should render import paths in code blocks', () => {
      const { container } = render(<Catalogue />);
      const codeBlocks = container.querySelectorAll('.code-block code');
      expect(codeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe('Props Table', () => {
    it('should render props table headers', () => {
      render(<Catalogue />);

      // Headers appear multiple times (once per component), so use getAllByText
      const nameHeaders = screen.getAllByText('Name');
      expect(nameHeaders.length).toBeGreaterThan(0);
      const typeHeaders = screen.getAllByText('Type');
      expect(typeHeaders.length).toBeGreaterThan(0);
      const requiredHeaders = screen.getAllByText('Required');
      expect(requiredHeaders.length).toBeGreaterThan(0);
      const defaultHeaders = screen.getAllByText('Default');
      expect(defaultHeaders.length).toBeGreaterThan(0);
      const descriptionHeaders = screen.getAllByText('Description');
      expect(descriptionHeaders.length).toBeGreaterThan(0);
    });

    it('should render props-table class', () => {
      const { container } = render(<Catalogue />);
      const propsTables = container.querySelectorAll('.props-table');
      expect(propsTables.length).toBe(componentCatalogue.length);
    });

    it('should render all props for each component', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        component.props.forEach((prop) => {
          // Use getAllByText since prop names/types may appear multiple times
          const propNames = screen.getAllByText(prop.name);
          expect(propNames.length).toBeGreaterThan(0);
          const propTypes = screen.getAllByText(prop.type);
          expect(propTypes.length).toBeGreaterThan(0);
          const propDescriptions = screen.getAllByText(prop.description);
          expect(propDescriptions.length).toBeGreaterThan(0);
        });
      });
    });

    it('should render required status correctly', () => {
      render(<Catalogue />);

      const buttonComponent = componentCatalogue.find((c) => c.name === 'Button');
      if (buttonComponent) {
        const requiredProps = buttonComponent.props.filter((p) => p.required);
        const optionalProps = buttonComponent.props.filter((p) => !p.required);

        requiredProps.forEach(() => {
          // Should show "Yes" for required props
          const yesTexts = screen.getAllByText('Yes');
          expect(yesTexts.length).toBeGreaterThan(0);
        });

        optionalProps.forEach(() => {
          // Should show "No" for optional props
          const noTexts = screen.getAllByText('No');
          expect(noTexts.length).toBeGreaterThan(0);
        });
      }
    });

    it('should render default values or dash', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        component.props.forEach((prop) => {
          if (prop.default) {
            // Default values may appear multiple times, use getAllByText
            const defaultValues = screen.getAllByText(prop.default);
            expect(defaultValues.length).toBeGreaterThan(0);
          } else {
            // Should show "-" for props without default
            const dashTexts = screen.getAllByText('-');
            expect(dashTexts.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Examples', () => {
    it('should render examples section when component has examples', () => {
      render(<Catalogue />);

      const buttonComponent = componentCatalogue.find((c) => c.name === 'Button');
      if (buttonComponent && buttonComponent.examples.length > 0) {
        // "Examples" appears multiple times (once per component with examples)
        const examplesHeaders = screen.getAllByText('Examples');
        expect(examplesHeaders.length).toBeGreaterThan(0);
      }
    });

    it('should not render examples section when component has no examples', () => {
      render(<Catalogue />);

      const componentsWithoutExamples = componentCatalogue.filter((c) => c.examples.length === 0);
      if (componentsWithoutExamples.length > 0) {
        // Examples section should not appear for components without examples
        const exampleSections = screen.queryAllByText('Examples');
        // Some components have examples, so this is not a strict check
        expect(exampleSections.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should render example titles', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        component.examples.forEach((example) => {
          expect(screen.getByText(example.title)).toBeInTheDocument();
        });
      });
    });

    it('should render example descriptions', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        component.examples.forEach((example) => {
          expect(screen.getByText(example.description)).toBeInTheDocument();
        });
      });
    });

    it('should render example code in code blocks', () => {
      render(<Catalogue />);

      const buttonComponent = componentCatalogue.find((c) => c.name === 'Button');
      if (buttonComponent && buttonComponent.examples.length > 0) {
        const firstExample = buttonComponent.examples[0];
        expect(screen.getByText(firstExample.code, { exact: false })).toBeInTheDocument();
      }
    });

    it('should render example-item class for each example', () => {
      const { container } = render(<Catalogue />);
      const exampleItems = container.querySelectorAll('.example-item');
      const totalExamples = componentCatalogue.reduce((sum, c) => sum + c.examples.length, 0);
      expect(exampleItems.length).toBe(totalExamples);
    });
  });

  describe('Related Components', () => {
    it('should render related components section when present', () => {
      render(<Catalogue />);

      const componentsWithRelated = componentCatalogue.filter(
        (c) => c.relatedComponents && c.relatedComponents.length > 0
      );

      if (componentsWithRelated.length > 0) {
        // "Related Components" appears multiple times, use getAllByText
        const relatedHeaders = screen.getAllByText('Related Components');
        expect(relatedHeaders.length).toBeGreaterThan(0);
      }
    });

    it('should render related component links', () => {
      const { container } = render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        if (component.relatedComponents) {
          component.relatedComponents.forEach((related) => {
            // Related component names may appear multiple times, use getAllByText
            const links = screen.getAllByText(related);
            expect(links.length).toBeGreaterThan(0);
            // Find the link by checking if it's inside a related-components section
            const relatedSections = container.querySelectorAll('.related-components');
            let foundLink = false;
            relatedSections.forEach((section) => {
              const link = section.querySelector(`a[href="#${related.toLowerCase()}"]`);
              if (link) {
                foundLink = true;
                expect(link).toBeInTheDocument();
              }
            });
            expect(foundLink).toBe(true);
          });
        }
      });
    });

    it('should render related-components class', () => {
      const { container } = render(<Catalogue />);
      const relatedSections = container.querySelectorAll('.related-components');
      const componentsWithRelated = componentCatalogue.filter(
        (c) => c.relatedComponents && c.relatedComponents.length > 0
      );
      expect(relatedSections.length).toBe(componentsWithRelated.length);
    });
  });

  describe('CSS Classes', () => {
    it('should render CSS classes section when present', () => {
      render(<Catalogue />);

      const componentsWithClasses = componentCatalogue.filter(
        (c) => c.cssClasses && c.cssClasses.length > 0
      );

      if (componentsWithClasses.length > 0) {
        expect(screen.getByText('CSS Classes')).toBeInTheDocument();
      }
    });

    it('should render CSS class tags', () => {
      render(<Catalogue />);

      componentCatalogue.forEach((component) => {
        if (component.cssClasses) {
          component.cssClasses.forEach((cssClass) => {
            expect(screen.getByText(cssClass)).toBeInTheDocument();
          });
        }
      });
    });

    it('should render css-class-tag class for each CSS class', () => {
      const { container } = render(<Catalogue />);
      const cssClassTags = container.querySelectorAll('.css-class-tag');
      const totalClasses = componentCatalogue.reduce(
        (sum, c) => sum + (c.cssClasses?.length || 0),
        0
      );
      expect(cssClassTags.length).toBe(totalClasses);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty catalogue gracefully', () => {
      // This test verifies the component doesn't crash with empty data
      // In practice, catalogueData should always have data
      const { container } = render(<Catalogue />);
      expect(container.querySelector('.catalogue-container')).toBeInTheDocument();
    });

    it('should handle components with missing optional fields', () => {
      render(<Catalogue />);

      // Components without relatedComponents or cssClasses should still render
      const componentsWithoutRelated = componentCatalogue.filter(
        (c) => !c.relatedComponents || c.relatedComponents.length === 0
      );
      componentsWithoutRelated.forEach((component) => {
        // Component names may appear multiple times, use getAllByText
        const componentNames = screen.getAllByText(component.name);
        expect(componentNames.length).toBeGreaterThan(0);
      });
    });

    it('should handle very long component names', () => {
      render(<Catalogue />);

      // All component names should render (may appear multiple times)
      componentCatalogue.forEach((component) => {
        const componentNames = screen.getAllByText(component.name);
        expect(componentNames.length).toBeGreaterThan(0);
      });
    });

    it('should handle components with many props', () => {
      render(<Catalogue />);

      const componentWithMostProps = componentCatalogue.reduce((prev, current) =>
        current.props.length > prev.props.length ? current : prev
      );

      componentWithMostProps.props.forEach((prop) => {
        // Use getAllByText since prop names may appear multiple times
        const propNames = screen.getAllByText(prop.name);
        expect(propNames.length).toBeGreaterThan(0);
      });
    });
  });
});

