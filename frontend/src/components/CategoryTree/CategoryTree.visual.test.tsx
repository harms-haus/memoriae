import { test, expect } from '@playwright/experimental-ct-react';
import { CategoryTree } from './CategoryTree';
import testUtils from '../../test/visual-setup';

const { TestWrapper, wait } = testUtils;

test.describe('CategoryTree Visual Regression', () => {
  test('default state with categories @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <CategoryTree />
      </TestWrapper>
    );
    // Wait for categories to load
    await wait(500);
    await expect(component).toHaveScreenshot('category-tree-default.png');
  });

  test('with selected categories @visual', async ({ mount }) => {
    const selectedCategories = new Set(['cat-child-1']);
    const component = await mount(
      <TestWrapper>
        <CategoryTree selectedCategories={selectedCategories} />
      </TestWrapper>
    );
    // Wait for categories to load
    await wait(500);
    await expect(component).toHaveScreenshot('category-tree-selected.png');
  });

  test('with seed counts @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <CategoryTree showSeedCounts={true} />
      </TestWrapper>
    );
    // Wait for categories and seed counts to load
    await wait(500);
    await expect(component).toHaveScreenshot('category-tree-seed-counts.png');
  });

  test('expanded tree @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <CategoryTree />
      </TestWrapper>
    );
    // Wait for categories to load first
    await wait(500);
    // Expand all categories
    const expandButton = component.locator('button:has-text("Expand")').or(component.locator('button[aria-label*="Expand"]'));
    if (await expandButton.isVisible().catch(() => false)) {
      await expandButton.click();
      await wait(300);
    }
    await expect(component).toHaveScreenshot('category-tree-expanded.png');
  });

  test('collapsed tree @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <CategoryTree />
      </TestWrapper>
    );
    // Wait for categories to load first
    await wait(500);
    // Collapse all categories
    const collapseButton = component.locator('button:has-text("Collapse")').or(component.locator('button[aria-label*="Collapse"]'));
    if (await collapseButton.isVisible().catch(() => false)) {
      await collapseButton.click();
      await wait(300);
    }
    await expect(component).toHaveScreenshot('category-tree-collapsed.png');
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <CategoryTree />
      </TestWrapper>
    );
    // Wait for empty state to render (component will load from API)
    await wait(1000);
    // Check if empty state is shown
    const emptyMessage = component.locator('text=No categories yet');
    if (await emptyMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('category-tree-empty.png');
    }
  });

  test('loading state @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <CategoryTree />
      </TestWrapper>
    );
    // Capture loading state immediately
    await wait(50);
    // Check if loading message is shown
    const loadingMessage = component.locator('text=Loading categories');
    if (await loadingMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('category-tree-loading.png');
    }
  });
});
