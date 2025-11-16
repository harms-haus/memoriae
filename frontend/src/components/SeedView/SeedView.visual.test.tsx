import { test, expect } from '@playwright/experimental-ct-react';
import { SeedView } from './SeedView';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, createMockSeed, createMockTag } = testUtils;

test.describe('SeedView Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const seed = createMockSeed({
      currentState: {
        seed: 'This is a sample seed content for visual testing.',
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: [],
        categories: [],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedView seed={seed} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('seed-view-default.png');
  });

  test('with tags @visual', async ({ mount }) => {
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work', color: '#ffd43b' }),
      createMockTag({ id: 'tag-2', name: 'important', color: '#4fc3f7' }),
      createMockTag({ id: 'tag-3', name: 'project', color: '#66bb6a' }),
    ];
    const seed = createMockSeed({
      currentState: {
        seed: 'This seed has multiple tags for testing the tag display.',
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: tags.map(t => ({ id: t.id, name: t.name })),
        categories: [],
      },
    });
    const tagColorMap = new Map<string, string>();
    tags.forEach(tag => {
      tagColorMap.set(tag.name.toLowerCase(), tag.color);
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedView seed={seed} tagColors={tagColorMap} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('seed-view-with-tags.png');
  });

  test('with category @visual', async ({ mount }) => {
    const seed = createMockSeed({
      currentState: {
        seed: 'This seed belongs to a category.',
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: [],
        categories: [{ id: 'cat-1', name: 'Work', path: '/work' }],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedView seed={seed} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('seed-view-with-category.png');
  });

  test('edit mode @visual', async ({ mount }) => {
    const seed = createMockSeed({
      currentState: {
        seed: 'This seed is in edit mode.',
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: [
          { id: 'tag-1', name: 'work' },
          { id: 'tag-2', name: 'personal' },
        ],
        categories: [],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedView 
            seed={seed} 
            isEditing={true}
            onContentChange={() => {}}
            onTagRemove={() => {}}
          />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('seed-view-edit-mode.png');
  });

  test('with long content @visual', async ({ mount }) => {
    const longContent = 'This is a very long seed content that should test how the component handles longer text. '.repeat(10);
    const seed = createMockSeed({
      currentState: {
        seed: longContent,
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: [],
        categories: [],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedView seed={seed} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('seed-view-long-content.png');
  });

  test('with many tags @visual', async ({ mount }) => {
    const manyTags = Array.from({ length: 10 }, (_, i) => ({
      id: `tag-${i + 1}`,
      name: `tag${i + 1}`,
    }));
    const seed = createMockSeed({
      currentState: {
        seed: 'This seed has many tags to test truncation.',
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: manyTags,
        categories: [],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedView seed={seed} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('seed-view-many-tags.png');
  });
});
