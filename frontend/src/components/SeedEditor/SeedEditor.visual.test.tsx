import { test, expect } from '@playwright/experimental-ct-react';
import { SeedEditor } from './SeedEditor';
import testUtils from '../../test/visual-setup';

const { TestWrapper, wait } = testUtils;

test.describe('SeedEditor Visual Regression', () => {
  test('small stage - empty @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedEditor />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('seed-editor-small-empty.png');
  });

  test('small stage - with short content @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedEditor />
      </TestWrapper>
    );
    // Type some content to trigger small stage
    const textarea = component.locator('textarea');
    await textarea.fill('Short content');
    await expect(component).toHaveScreenshot('seed-editor-small-content.png');
  });

  test('medium stage - with content @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedEditor />
      </TestWrapper>
    );
    // Type content to trigger medium stage (>= 100 chars)
    const textarea = component.locator('textarea');
    const mediumContent = 'This is a longer content that should trigger the medium stage of the editor. It needs to be at least 100 characters long to show the markdown toolbar.';
    await textarea.fill(mediumContent);
    // Wait for stage transition
    await wait(100);
    await expect(component).toHaveScreenshot('seed-editor-medium.png');
  });

  test('medium stage - with markdown toolbar @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedEditor />
      </TestWrapper>
    );
    const textarea = component.locator('textarea');
    const mediumContent = 'This is a longer content that should trigger the medium stage of the editor. It needs to be at least 100 characters long to show the markdown toolbar.';
    await textarea.fill(mediumContent);
    // Wait for toolbar to appear
    await wait(100);
    // Check that toolbar is visible
    const toolbar = component.locator('.seed-editor-toolbar');
    await expect(toolbar).toBeVisible();
    await expect(component).toHaveScreenshot('seed-editor-medium-toolbar.png');
  });

  test('zen mode - fullscreen @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper style={{ position: 'relative', height: '100vh' }}>
        <SeedEditor />
      </TestWrapper>
    );
    const textarea = component.locator('textarea');
    const longContent = 'This is a very long content that should trigger zen mode automatically when it reaches 750 characters. '.repeat(10);
    await textarea.fill(longContent);
    // Wait for zen mode to activate (auto-triggers at 750 chars)
    await wait(500);
    // Zen mode should be active
    const zenContainer = component.locator('.seed-editor-zen-mode');
    await expect(zenContainer).toBeVisible();
    await expect(component).toHaveScreenshot('seed-editor-zen-mode.png');
  });

  test('zen mode - with toolbar @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper style={{ position: 'relative', height: '100vh' }}>
        <SeedEditor />
      </TestWrapper>
    );
    const textarea = component.locator('textarea');
    const longContent = 'This is a very long content that should trigger zen mode automatically when it reaches 750 characters. '.repeat(10);
    await textarea.fill(longContent);
    // Wait for zen mode
    await wait(500);
    // Check toolbar is visible in zen mode
    const zenToolbar = component.locator('.seed-editor-zen-toolbar');
    await expect(zenToolbar).toBeVisible();
    await expect(component).toHaveScreenshot('seed-editor-zen-toolbar.png');
  });

  test('save button visible @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedEditor />
      </TestWrapper>
    );
    const textarea = component.locator('textarea');
    await textarea.fill('Content to save');
    // Wait for save button to appear
    await wait(100);
    const saveButton = component.locator('.seed-editor-save-button');
    await expect(saveButton).toBeVisible();
    await expect(component).toHaveScreenshot('seed-editor-save-button.png');
  });
});
