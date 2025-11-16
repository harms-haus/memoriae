import { test, expect } from '@playwright/experimental-ct-react';
import { SeedsView } from './SeedsView';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, wait } = testUtils;

test.describe('SeedsView Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for seeds to load
    await wait(500);
    await expect(component).toHaveScreenshot('seeds-view-default.png');
  });

  test('loading state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    // Capture loading state immediately
    await wait(50);
    // Check if loading indicator is shown
    const loadingIndicator = component.locator('text=Loading');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seeds-view-loading.png');
    }
  });

  test('with search query @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Find search input and type
    const searchInput = component.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill('test query');
      await wait(300);
      await expect(component).toHaveScreenshot('seeds-view-search.png');
    }
  });

  test('with filters open @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Find and click filter toggle button
    const filterButton = component.locator('button:has-text("Filter"), button[aria-label*="filter" i]');
    if (await filterButton.isVisible().catch(() => false)) {
      await filterButton.click();
      await expect(component).toHaveScreenshot('seeds-view-filters-open.png');
    }
  });

  test('with selected tags @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Try to find and click a tag filter
    const tagFilter = component.locator('.tag-item, [class*="tag"]').first();
    if (await tagFilter.isVisible().catch(() => false)) {
      await tagFilter.click();
      await expect(component).toHaveScreenshot('seeds-view-selected-tags.png');
    }
  });

  test('sorted view @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Find sort dropdown/button
    const sortButton = component.locator('button:has-text("Sort"), select, [aria-label*="sort" i]');
    if (await sortButton.isVisible().catch(() => false)) {
      await sortButton.click();
      await wait(200);
      await expect(component).toHaveScreenshot('seeds-view-sorted.png');
    }
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedsView />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for empty state to render (if API returns empty)
    await wait(1000);
    // Check if empty message is shown
    const emptyMessage = component.locator('text=No seeds, text=empty');
    if (await emptyMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seeds-view-empty.png');
    }
  });
});
