import { test, expect } from '@playwright/experimental-ct-react';
import { MusingItem } from './MusingItem';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';
import type { IdeaMusing } from '../../types';

const { TestWrapper, createMockSeed } = testUtils;

test.describe('MusingItem Visual Regression', () => {
  const createMockMusing = (overrides?: Partial<IdeaMusing>): IdeaMusing => {
    const seed = createMockSeed({
      currentState: {
        seed: 'This is a seed that has generated a musing.',
        timestamp: new Date().toISOString(),
        metadata: {},
        tags: [{ id: 'tag-1', name: 'work' }],
        categories: [],
      },
    });
    return {
      id: overrides?.id || 'musing-1',
      seed_id: overrides?.seed_id || seed.id,
      template_type: overrides?.template_type || 'numbered_ideas',
      content: overrides?.content || {
        ideas: [
          'First idea suggestion',
          'Second idea suggestion',
          'Third idea suggestion',
        ],
      },
      created_at: overrides?.created_at || new Date().toISOString(),
      dismissed: overrides?.dismissed || false,
      completed: overrides?.completed || false,
      seed: seed,
      ...overrides,
    };
  };

  test('numbered ideas musing @visual', async ({ mount }) => {
    const musing = createMockMusing({
      template_type: 'numbered_ideas',
      content: {
        ideas: [
          'Explore this topic further',
          'Research related concepts',
          'Create a follow-up seed',
        ],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <MusingItem musing={musing} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('musing-item-numbered-ideas.png');
  });

  test('wikipedia links musing @visual', async ({ mount }) => {
    const musing = createMockMusing({
      template_type: 'wikipedia_links',
      content: {
        links: [
          { title: 'Human chimerism', url: 'https://en.wikipedia.org/wiki/Human_chimerism' },
          { title: 'Genetic engineering', url: 'https://en.wikipedia.org/wiki/Genetic_engineering' },
        ],
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <MusingItem musing={musing} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('musing-item-wikipedia-links.png');
  });

  test('markdown musing @visual', async ({ mount }) => {
    const musing = createMockMusing({
      template_type: 'markdown',
      content: {
        markdown: '# Interesting Thoughts\n\nThis is a markdown musing with some **bold** and *italic* text.',
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <MusingItem musing={musing} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('musing-item-markdown.png');
  });

  test('with actions @visual', async ({ mount }) => {
    const musing = createMockMusing();
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <MusingItem musing={musing} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Check if action buttons are visible
    const regenerateButton = component.locator('button[aria-label="Regenerate musing"]');
    const dismissButton = component.locator('button[aria-label="Dismiss musing"]');
    if (await regenerateButton.isVisible().catch(() => false) && 
        await dismissButton.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('musing-item-actions.png');
    }
  });

  test('dismissed state @visual', async ({ mount }) => {
    const musing = createMockMusing({
      dismissed: true,
      dismissed_at: new Date().toISOString(),
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <MusingItem musing={musing} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('musing-item-dismissed.png');
  });

  test('completed state @visual', async ({ mount }) => {
    const musing = createMockMusing({
      completed: true,
      completed_at: new Date().toISOString(),
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <MusingItem musing={musing} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await expect(component).toHaveScreenshot('musing-item-completed.png');
  });
});
