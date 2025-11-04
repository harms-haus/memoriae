import { test, expect } from '@playwright/experimental-ct-react';
import { Checkbox } from './Checkbox';

test.describe('Checkbox Visual Regression', () => {
  test('checked and unchecked states @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Checkbox checked={false} onCheckedChange={() => {}} label="Unchecked" />
        <Checkbox checked={true} onCheckedChange={() => {}} label="Checked" />
      </div>
    );

    await expect(component).toHaveScreenshot('checkbox-states.png');
  });

  test('with label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Checkbox label="Checkbox with label" />
        <Checkbox>Checkbox with children</Checkbox>
        <Checkbox>Checkbox with longer label text that might wrap to multiple lines</Checkbox>
      </div>
    );

    await expect(component).toHaveScreenshot('checkbox-with-label.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Checkbox disabled label="Disabled unchecked" />
        <Checkbox disabled checked={true} onCheckedChange={() => {}} label="Disabled checked" />
      </div>
    );

    await expect(component).toHaveScreenshot('checkbox-disabled.png');
  });

  test('controlled vs uncontrolled appearance @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Checkbox checked={true} onCheckedChange={() => {}} label="Controlled (checked)" />
        <Checkbox defaultChecked={true} label="Uncontrolled (defaultChecked)" />
      </div>
    );

    await expect(component).toHaveScreenshot('checkbox-controlled-uncontrolled.png');
  });
});

