import { test, expect } from '@playwright/experimental-ct-react';
import { Tag } from './Tag';

test.describe('Tag Visual Regression', () => {
  test('all variants @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag variant="default">Default</Tag>
        <Tag variant="blue">Blue</Tag>
        <Tag variant="green">Green</Tag>
        <Tag variant="purple">Purple</Tag>
        <Tag variant="pink">Pink</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-variants.png');
  });

  test('active state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag variant="default" active>Active Default</Tag>
        <Tag variant="blue" active>Active Blue</Tag>
        <Tag variant="green" active>Active Green</Tag>
        <Tag variant="purple" active>Active Purple</Tag>
        <Tag variant="pink" active>Active Pink</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-active.png');
  });

  test('with remove button @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag variant="default" onRemove={() => {}}>With Remove</Tag>
        <Tag variant="blue" onRemove={() => {}}>With Remove</Tag>
        <Tag variant="green" onRemove={() => {}}>With Remove</Tag>
        <Tag variant="purple" active onRemove={() => {}}>Active with Remove</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-remove-button.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag variant="default" disabled>Disabled</Tag>
        <Tag variant="blue" disabled>Disabled</Tag>
        <Tag variant="green" disabled active>Disabled Active</Tag>
        <Tag variant="purple" disabled onRemove={() => {}}>Disabled with Remove</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-disabled.png');
  });

  test('clickable vs non-clickable @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem', flexWrap: 'wrap' }}>
        <Tag variant="default">Non-clickable</Tag>
        <Tag variant="default" onClick={() => {}}>Clickable</Tag>
        <Tag variant="blue" onClick={() => {}} active>Clickable Active</Tag>
      </div>
    );

    await expect(component).toHaveScreenshot('tag-clickable.png');
  });
});

