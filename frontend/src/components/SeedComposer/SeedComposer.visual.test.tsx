import { test, expect } from '@playwright/experimental-ct-react';
import { SeedComposer } from './SeedComposer';
import testUtils from '../../test/visual-setup';

const { TestWrapper, wait } = testUtils;

test.describe('SeedComposer Visual Regression', () => {
  test('small mode @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedComposer onClose={() => {}} />
      </TestWrapper>
    );
    // Wait for component to render
    await wait(100);
    await expect(component).toHaveScreenshot('seed-composer-small.png');
  });

  test('medium mode @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedComposer onClose={() => {}} />
      </TestWrapper>
    );
    // Medium mode is the default, wait for it to render
    await wait(100);
    const textarea = component.locator('textarea');
    await textarea.fill('Sample content for medium mode');
    await expect(component).toHaveScreenshot('seed-composer-medium.png');
  });

  test('zen mode @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper style={{ position: 'relative', height: '100vh' }}>
        <SeedComposer onClose={() => {}} />
      </TestWrapper>
    );
    // Click maximize button to enter zen mode
    const maximizeButton = component.locator('button[aria-label="Maximize"]');
    await maximizeButton.click();
    // Wait for zen mode transition
    await wait(300);
    const zenOverlay = component.locator('.seed-composer-zen-overlay');
    await expect(zenOverlay).toBeVisible();
    await expect(component).toHaveScreenshot('seed-composer-zen.png');
  });

  test('zen mode with content @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper style={{ position: 'relative', height: '100vh' }}>
        <SeedComposer onClose={() => {}} />
      </TestWrapper>
    );
    // Enter zen mode
    const maximizeButton = component.locator('button[aria-label="Maximize"]');
    await maximizeButton.click();
    await wait(300);
    // Add content
    const textarea = component.locator('textarea');
    await textarea.fill('This is content in zen mode. It should display nicely in fullscreen.');
    await expect(component).toHaveScreenshot('seed-composer-zen-content.png');
  });

  test('confirmation dialog @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedComposer onClose={() => {}} />
      </TestWrapper>
    );
    // Add some content
    const textarea = component.locator('textarea');
    await textarea.fill('Content that will be lost');
    // Click close button to trigger confirmation dialog
    const closeButton = component.locator('button[aria-label="Close"]');
    await closeButton.click();
    // Wait for dialog to appear
    await wait(200);
    await expect(component).toHaveScreenshot('seed-composer-confirmation-dialog.png');
  });

  test('submit button visible @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <SeedComposer onClose={() => {}} />
      </TestWrapper>
    );
    // Add content to enable submit button
    const textarea = component.locator('textarea');
    await textarea.fill('Content to submit');
    // Wait for submit button to be enabled
    await wait(100);
    const submitButton = component.locator('button[aria-label="Submit"]');
    await expect(submitButton).toBeVisible();
    await expect(component).toHaveScreenshot('seed-composer-submit-button.png');
  });
});
