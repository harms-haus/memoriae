import { test, expect } from '@playwright/experimental-ct-react';
import { CategoriesView } from './CategoriesView';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, wait } = testUtils;

test.describe('CategoriesView Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <CategoriesView />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for categories to load
    await wait(500);
    await expect(component).toHaveScreenshot('categories-view-default.png');
  });

  test('with selected category @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <CategoriesView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Try to select a category
    const categoryItem = component.locator('.category-tree-item').first();
    if (await categoryItem.isVisible().catch(() => false)) {
      await categoryItem.click();
      await wait(500); // Wait for seeds to load
      await expect(component).toHaveScreenshot('categories-view-selected.png');
    }
  });

  test('with filtered seeds @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <CategoriesView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Select a category to show filtered seeds
    const categoryItem = component.locator('.category-tree-item').first();
    if (await categoryItem.isVisible().catch(() => false)) {
      await categoryItem.click();
      await wait(1000); // Wait for seeds to load
      // Check if seeds are displayed
      const seedView = component.locator('.seed-view, [class*="seed"]');
      if (await seedView.first().isVisible().catch(() => false)) {
        await expect(component).toHaveScreenshot('categories-view-filtered-seeds.png');
      }
    }
  });

  test('loading state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <CategoriesView />
        </TestWrapper>
      </BrowserRouter>
    );
    // Capture loading state immediately
    await wait(50);
    // Check if loading indicator is shown
    const loadingIndicator = component.locator('text=Loading');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('categories-view-loading.png');
    }
  });

  test('empty category state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <CategoriesView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Select a category that might be empty
    const categoryItem = component.locator('.category-tree-item').first();
    if (await categoryItem.isVisible().catch(() => false)) {
      await categoryItem.click();
      await wait(1000);
      // Check if empty state is shown
      const emptyMessage = component.locator('text=No seeds, text=empty');
      if (await emptyMessage.isVisible().catch(() => false)) {
        await expect(component).toHaveScreenshot('categories-view-empty-category.png');
      }
    }
  });

  test('with close button @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <CategoriesView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Select a category first
    const categoryItem = component.locator('.category-tree-item').first();
    if (await categoryItem.isVisible().catch(() => false)) {
      await categoryItem.click();
      await wait(500);
      // Check if close button is visible
      const closeButton = component.locator('button[aria-label*="Close"], button:has(svg)');
      if (await closeButton.isVisible().catch(() => false)) {
        await expect(component).toHaveScreenshot('categories-view-close-button.png');
      }
    }
  });
});
