import { test, expect } from '@playwright/experimental-ct-react';
import { RadioGroup, Radio } from './Radio';

test.describe('Radio Visual Regression', () => {
  test('RadioGroup with multiple radios @visual', async ({ mount }) => {
    const component = await mount(
      <RadioGroup defaultValue="option1">
        <Radio value="option1" label="Option 1" />
        <Radio value="option2" label="Option 2" />
        <Radio value="option3" label="Option 3" />
      </RadioGroup>
    );

    await expect(component).toHaveScreenshot('radio-group.png');
  });

  test('checked and unchecked states @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <RadioGroup value="option1" onValueChange={() => {}}>
          <Radio value="option1" label="Checked" />
          <Radio value="option2" label="Unchecked" />
        </RadioGroup>
      </div>
    );

    await expect(component).toHaveScreenshot('radio-states.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <RadioGroup defaultValue="option1">
        <Radio value="option1" label="Normal" />
        <Radio value="option2" label="Disabled unchecked" disabled />
        <Radio value="option3" label="Disabled checked" disabled />
      </RadioGroup>
    );

    await expect(component).toHaveScreenshot('radio-disabled.png');
  });

  test('with labels @visual', async ({ mount }) => {
    const component = await mount(
      <RadioGroup defaultValue="option1">
        <Radio value="option1" label="Short label" />
        <Radio value="option2" label="Medium length label" />
        <Radio value="option3">Radio with children</Radio>
        <Radio value="option4" label="Very long label text that might wrap to multiple lines" />
      </RadioGroup>
    );

    await expect(component).toHaveScreenshot('radio-with-labels.png');
  });
});

