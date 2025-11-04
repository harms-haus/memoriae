import { test, expect } from '@playwright/experimental-ct-react';
import { Toggle } from './Toggle';

test.describe('Toggle Visual Regression', () => {
  test('checked and unchecked states @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Toggle checked={false} onCheckedChange={() => {}} label="Unchecked" />
        <Toggle checked={true} onCheckedChange={() => {}} label="Checked" />
      </div>
    );

    await expect(component).toHaveScreenshot('toggle-states.png');
  });

  test('with label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Toggle label="Toggle with label" />
        <Toggle>Toggle with children</Toggle>
        <Toggle label="Toggle with longer label text that might wrap" />
      </div>
    );

    await expect(component).toHaveScreenshot('toggle-with-label.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Toggle disabled label="Disabled unchecked" />
        <Toggle disabled checked={true} onCheckedChange={() => {}} label="Disabled checked" />
      </div>
    );

    await expect(component).toHaveScreenshot('toggle-disabled.png');
  });

  test('controlled vs uncontrolled appearance @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Toggle checked={true} onCheckedChange={() => {}} label="Controlled (checked)" />
        <Toggle defaultChecked={true} label="Uncontrolled (defaultChecked)" />
      </div>
    );

    await expect(component).toHaveScreenshot('toggle-controlled-uncontrolled.png');
  });
});

