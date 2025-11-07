import { test, expect } from '@playwright/experimental-ct-react';
import { Tag } from './Tag';

test.describe('Tag Visual Regression', () => {
  test('all colors @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag>Default</Tag>
        <Tag color="var(--accent-blue)">Blue</Tag>
        <Tag color="var(--accent-green)">Green</Tag>
        <Tag color="var(--accent-purple)">Purple</Tag>
        <Tag color="var(--accent-pink)">Pink</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-colors.png');
  });

  test('active state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag active>Active Default</Tag>
        <Tag color="var(--accent-blue)" active>Active Blue</Tag>
        <Tag color="var(--accent-green)" active>Active Green</Tag>
        <Tag color="var(--accent-purple)" active>Active Purple</Tag>
        <Tag color="var(--accent-pink)" active>Active Pink</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-active.png');
  });

  test('with remove button @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag onRemove={() => {}}>With Remove</Tag>
        <Tag color="var(--accent-blue)" onRemove={() => {}}>With Remove</Tag>
        <Tag color="var(--accent-green)" onRemove={() => {}}>With Remove</Tag>
        <Tag color="var(--accent-purple)" active onRemove={() => {}}>Active with Remove</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-remove-button.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag disabled>Disabled</Tag>
        <Tag color="var(--accent-blue)" disabled>Disabled</Tag>
        <Tag color="var(--accent-green)" disabled active>Disabled Active</Tag>
        <Tag color="var(--accent-purple)" disabled onRemove={() => {}}>Disabled with Remove</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-disabled.png');
  });

  test('clickable vs non-clickable @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag>Non-clickable</Tag>
        <Tag onClick={() => {}}>Clickable</Tag>
        <Tag color="var(--accent-blue)" onClick={() => {}} active>Clickable Active</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-clickable.png');
  });
});

