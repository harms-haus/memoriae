import { test, expect } from '@playwright/experimental-ct-react';
import { ToastProvider, useToast } from './Toast';

function ToastTestComponent() {
  const { toast } = useToast();

  return (
    <div>
      <button onClick={() => toast({ message: 'Success message', variant: 'success' })}>
        Show Success
      </button>
      <button onClick={() => toast({ message: 'Error message', variant: 'error' })}>
        Show Error
      </button>
      <button onClick={() => toast({ message: 'Warning message', variant: 'warning' })}>
        Show Warning
      </button>
      <button onClick={() => toast({ message: 'Info message', variant: 'info' })}>
        Show Info
      </button>
    </div>
  );
}

test.describe('Toast Visual Regression', () => {
  test('success toast @visual', async ({ mount, page }) => {
    const component = await mount(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await component.getByText('Show Success').click();
    await page.waitForTimeout(100); // Wait for toast to appear

    const toast = page.locator('.toast-success').first();
    await expect(toast).toHaveScreenshot('toast-success.png');
  });

  test('error toast @visual', async ({ mount, page }) => {
    const component = await mount(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await component.getByText('Show Error').click();
    await page.waitForTimeout(100);

    const toast = page.locator('.toast-error').first();
    await expect(toast).toHaveScreenshot('toast-error.png');
  });

  test('warning toast @visual', async ({ mount, page }) => {
    const component = await mount(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await component.getByText('Show Warning').click();
    await page.waitForTimeout(100);

    const toast = page.locator('.toast-warning').first();
    await expect(toast).toHaveScreenshot('toast-warning.png');
  });

  test('info toast @visual', async ({ mount, page }) => {
    const component = await mount(
      <ToastProvider>
        <ToastTestComponent />
      </ToastProvider>
    );

    await component.getByText('Show Info').click();
    await page.waitForTimeout(100);

    const toast = page.locator('.toast-info').first();
    await expect(toast).toHaveScreenshot('toast-info.png');
  });
});

