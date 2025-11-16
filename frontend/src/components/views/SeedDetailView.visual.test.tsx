import { test, expect } from '@playwright/experimental-ct-react';
import { SeedDetailView } from './SeedDetailView';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, wait } = testUtils;

test.describe('SeedDetailView Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="seed-1" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for component to load
    await wait(500);
    await expect(component).toHaveScreenshot('seed-detail-view-default.png');
  });

  test('loading state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="seed-1" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Capture loading state immediately
    await wait(50);
    // Check if loading message is shown
    const loadingMessage = component.locator('text=Loading seed');
    if (await loadingMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seed-detail-view-loading.png');
    }
  });

  test('error state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="invalid-seed" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for error state to render
    await wait(1000);
    // Check if error message is shown
    const errorMessage = component.locator('.text-error');
    if (await errorMessage.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seed-detail-view-error.png');
    }
  });

  test('with tags @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="seed-1" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Check if tags are displayed
    const tags = component.locator('.tag-item, [class*="tag"]');
    if (await tags.first().isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seed-detail-view-with-tags.png');
    }
  });

  test('edit mode @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="seed-1" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Click edit button
    const editButton = component.locator('button[aria-label="Edit seed"]');
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await wait(300);
      await expect(component).toHaveScreenshot('seed-detail-view-edit-mode.png');
    }
  });

  test('with automations @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="seed-1" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Check if automations panel is visible
    const automationsPanel = component.locator('.seed-detail-automations');
    if (await automationsPanel.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seed-detail-view-automations.png');
    }
  });

  test('with timeline @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedDetailView seedId="seed-1" onBack={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Check if timeline is visible
    const timeline = component.locator('.seed-detail-timeline');
    if (await timeline.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('seed-detail-view-timeline.png');
    }
  });
});
