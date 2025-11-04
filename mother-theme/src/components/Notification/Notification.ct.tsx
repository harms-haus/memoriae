import { test, expect } from '@playwright/experimental-ct-react';
import { Notification } from './Notification';

test.describe('Notification Visual Regression', () => {
  test('success notification @visual', async ({ mount }) => {
    const component = await mount(
      <Notification
        variant="success"
        title="Success"
        message="Operation completed successfully"
        onClose={() => {}}
      />
    );

    await expect(component).toHaveScreenshot('notification-success.png');
  });

  test('error notification @visual', async ({ mount }) => {
    const component = await mount(
      <Notification
        variant="error"
        title="Error"
        message="Something went wrong"
        onClose={() => {}}
      />
    );

    await expect(component).toHaveScreenshot('notification-error.png');
  });

  test('warning notification @visual', async ({ mount }) => {
    const component = await mount(
      <Notification
        variant="warning"
        title="Warning"
        message="Please review your actions"
        onClose={() => {}}
      />
    );

    await expect(component).toHaveScreenshot('notification-warning.png');
  });

  test('info notification @visual', async ({ mount }) => {
    const component = await mount(
      <Notification
        variant="info"
        title="Information"
        message="This is an informational message"
        onClose={() => {}}
      />
    );

    await expect(component).toHaveScreenshot('notification-info.png');
  });

  test('notification with actions @visual', async ({ mount }) => {
    const component = await mount(
      <Notification
        variant="info"
        title="Notification with Actions"
        message="This notification has action buttons"
        actions={[
          { label: 'Action 1', onClick: () => {} },
          { label: 'Action 2', onClick: () => {} },
        ]}
        onClose={() => {}}
      />
    );

    await expect(component).toHaveScreenshot('notification-with-actions.png');
  });
});

