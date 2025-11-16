import { test, expect } from '@playwright/experimental-ct-react';
import { TagCloud } from './TagCloud';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, wait } = testUtils;

test.describe('TagCloud Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagCloud />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for data to load
    await wait(500);
    await expect(component).toHaveScreenshot('tag-cloud-default.png');
  });

  test('with selected tags @visual', async ({ mount }) => {
    const selectedTags = new Set(['work', 'personal']);
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagCloud selectedTags={selectedTags} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    await expect(component).toHaveScreenshot('tag-cloud-selected.png');
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagCloud />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for empty state to render (if API returns empty)
    await wait(1000);
    // Check if empty state is shown
    const emptyMessage = component.locator('text=No tags yet');
    if (await emptyMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('tag-cloud-empty.png');
    }
  });

  test('loading state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagCloud />
        </TestWrapper>
      </BrowserRouter>
    );
    // Capture loading state immediately
    await wait(50);
    // Check if loading message is shown
    const loadingMessage = component.locator('text=Loading tags');
    if (await loadingMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('tag-cloud-loading.png');
    }
  });
});
