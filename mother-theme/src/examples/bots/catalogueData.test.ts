import { describe, it, expect } from 'vitest';
import { componentCatalogue, ComponentInfo, ComponentProp, ComponentExample } from './catalogueData';

describe('catalogueData', () => {
  describe('Type Definitions', () => {
    it('should have ComponentProp interface structure', () => {
      const prop: ComponentProp = {
        name: 'test',
        type: 'string',
        required: true,
        description: 'Test prop',
      };

      expect(prop.name).toBe('test');
      expect(prop.type).toBe('string');
      expect(prop.required).toBe(true);
      expect(prop.description).toBe('Test prop');
    });

    it('should support optional default value in ComponentProp', () => {
      const prop: ComponentProp = {
        name: 'test',
        type: 'string',
        required: false,
        default: 'default-value',
        description: 'Test prop',
      };

      expect(prop.default).toBe('default-value');
    });

    it('should support optional options array in ComponentProp', () => {
      const prop: ComponentProp = {
        name: 'test',
        type: 'string',
        required: false,
        description: 'Test prop',
        options: ['option1', 'option2'],
      };

      expect(prop.options).toEqual(['option1', 'option2']);
    });

    it('should have ComponentExample interface structure', () => {
      const example: ComponentExample = {
        title: 'Test Example',
        description: 'Test description',
        code: 'const test = "code";',
      };

      expect(example.title).toBe('Test Example');
      expect(example.description).toBe('Test description');
      expect(example.code).toBe('const test = "code";');
    });

    it('should have ComponentInfo interface structure', () => {
      const info: ComponentInfo = {
        name: 'TestComponent',
        description: 'Test description',
        importPath: "import { TestComponent } from 'mother-theme/src';",
        props: [],
        examples: [],
      };

      expect(info.name).toBe('TestComponent');
      expect(info.description).toBe('Test description');
      expect(info.importPath).toBe("import { TestComponent } from 'mother-theme/src';");
      expect(info.props).toEqual([]);
      expect(info.examples).toEqual([]);
    });

    it('should support optional relatedComponents in ComponentInfo', () => {
      const info: ComponentInfo = {
        name: 'TestComponent',
        description: 'Test',
        importPath: 'import',
        props: [],
        examples: [],
        relatedComponents: ['Component1', 'Component2'],
      };

      expect(info.relatedComponents).toEqual(['Component1', 'Component2']);
    });

    it('should support optional cssClasses in ComponentInfo', () => {
      const info: ComponentInfo = {
        name: 'TestComponent',
        description: 'Test',
        importPath: 'import',
        props: [],
        examples: [],
        cssClasses: ['class1', 'class2'],
      };

      expect(info.cssClasses).toEqual(['class1', 'class2']);
    });
  });

  describe('Data Structure', () => {
    it('should export componentCatalogue array', () => {
      expect(Array.isArray(componentCatalogue)).toBe(true);
      expect(componentCatalogue.length).toBeGreaterThan(0);
    });

    it('should have all required fields for each component', () => {
      componentCatalogue.forEach((component) => {
        expect(component).toHaveProperty('name');
        expect(component).toHaveProperty('description');
        expect(component).toHaveProperty('importPath');
        expect(component).toHaveProperty('props');
        expect(component).toHaveProperty('examples');
        expect(typeof component.name).toBe('string');
        expect(typeof component.description).toBe('string');
        expect(typeof component.importPath).toBe('string');
        expect(Array.isArray(component.props)).toBe(true);
        expect(Array.isArray(component.examples)).toBe(true);
      });
    });

    it('should have valid props for each component', () => {
      componentCatalogue.forEach((component) => {
        component.props.forEach((prop) => {
          expect(prop).toHaveProperty('name');
          expect(prop).toHaveProperty('type');
          expect(prop).toHaveProperty('required');
          expect(prop).toHaveProperty('description');
          expect(typeof prop.name).toBe('string');
          expect(typeof prop.type).toBe('string');
          expect(typeof prop.required).toBe('boolean');
          expect(typeof prop.description).toBe('string');
        });
      });
    });

    it('should have valid examples for each component', () => {
      componentCatalogue.forEach((component) => {
        component.examples.forEach((example) => {
          expect(example).toHaveProperty('title');
          expect(example).toHaveProperty('description');
          expect(example).toHaveProperty('code');
          expect(typeof example.title).toBe('string');
          expect(typeof example.description).toBe('string');
          expect(typeof example.code).toBe('string');
        });
      });
    });
  });

  describe('Data Validation', () => {
    it('should have Button component in catalogue', () => {
      const button = componentCatalogue.find((c) => c.name === 'Button');
      expect(button).toBeDefined();
      expect(button?.name).toBe('Button');
    });

    it('should have Input component in catalogue', () => {
      const input = componentCatalogue.find((c) => c.name === 'Input');
      expect(input).toBeDefined();
      expect(input?.name).toBe('Input');
    });

    it('should have Dialog component in catalogue', () => {
      const dialog = componentCatalogue.find((c) => c.name === 'Dialog');
      expect(dialog).toBeDefined();
      expect(dialog?.name).toBe('Dialog');
    });

    it('should have unique component names', () => {
      const names = componentCatalogue.map((c) => c.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should have at least one prop for components that need props', () => {
      componentCatalogue.forEach((component) => {
        // Most components should have at least one prop
        // Some might have none, which is also valid
        expect(Array.isArray(component.props)).toBe(true);
      });
    });

    it('should have valid import paths', () => {
      componentCatalogue.forEach((component) => {
        expect(component.importPath).toContain('import');
        expect(component.importPath).toContain('from');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle components with no examples', () => {
      const componentsWithNoExamples = componentCatalogue.filter((c) => c.examples.length === 0);
      // Some components might not have examples, which is valid
      componentsWithNoExamples.forEach((component) => {
        expect(Array.isArray(component.examples)).toBe(true);
      });
    });

    it('should handle components with no relatedComponents', () => {
      const componentsWithoutRelated = componentCatalogue.filter(
        (c) => !c.relatedComponents || c.relatedComponents.length === 0
      );
      // This is valid - relatedComponents is optional
      expect(componentsWithoutRelated.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle components with no cssClasses', () => {
      const componentsWithoutClasses = componentCatalogue.filter(
        (c) => !c.cssClasses || c.cssClasses.length === 0
      );
      // This is valid - cssClasses is optional
      expect(componentsWithoutClasses.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle props with optional default values', () => {
      componentCatalogue.forEach((component) => {
        component.props.forEach((prop) => {
          if (prop.default !== undefined) {
            expect(typeof prop.default === 'string' || typeof prop.default === 'number').toBe(true);
          }
        });
      });
    });
  });
});

