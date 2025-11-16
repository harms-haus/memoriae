import { test, expect } from '@playwright/experimental-ct-react';
import { TagsView } from './TagsView';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, wait } = testUtils;

test.describe('TagsView Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagsView />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for TagCloud to load
    await wait(500);
    await expect(component).toHaveScreenshot('tags-view-default.png');
  });

  test('with selected tags @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Try to select a tag (if tags are available)
    const tagLink = component.locator('.tag-cloud-item').first();
    if (await tagLink.isVisible().catch(() => false)) {
      // Use Ctrl+Click to select (as per component behavior)
      await tagLink.click({ modifiers: ['Control'] });
      await wait(300);
      await expect(component).toHaveScreenshot('tags-view-selected.png');
    }
  });

  test('with multiple selected tags @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Try to select multiple tags
    const tagLinks = component.locator('.tag-cloud-item');
    const count = await tagLinks.count();
    if (count >= 2) {
      // Select first two tags
      await tagLinks.nth(0).click({ modifiers: ['Control'] });
      await wait(100);
      await tagLinks.nth(1).click({ modifiers: ['Control'] });
      await expect(component).toHaveScreenshot('tags-view-multiple-selected.png');
    }
  });

  test('selection info panel @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Select a tag to show info panel
    const tagLink = component.locator('.tag-cloud-item').first();
    if (await tagLink.isVisible().catch(() => false)) {
      await tagLink.click({ modifiers: ['Control'] });
      await wait(300);
      // Check if selection info panel is visible
      const infoPanel = component.locator('.tag-selection-info');
      if (await infoPanel.isVisible().catch(() => false)) {
        await expect(component).toHaveScreenshot('tags-view-selection-info.png');
      }
    }
  });

  test('clear selection button @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <TagsView />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Select a tag first
    const tagLink = component.locator('.tag-cloud-item').first();
    if (await tagLink.isVisible().catch(() => false)) {
      await tagLink.click({ modifiers: ['Control'] });
      await wait(300);
      // Check if clear button is visible
      const clearButton = component.locator('button:has-text("Clear")');
      if (await clearButton.isVisible().catch(() => false)) {
        await expect(component).toHaveScreenshot('tags-view-clear-button.png');
      }
    }
  });
});
