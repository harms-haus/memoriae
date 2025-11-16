import { test, expect } from '@playwright/experimental-ct-react';
import { Timeline } from './Timeline';
import testUtils from '../../test/visual-setup';

const { TestWrapper } = testUtils;

test.describe('Timeline Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const items = [
      {
        id: 'item-1',
        content: 'First timeline item',
        time: '2 hours ago',
      },
      {
        id: 'item-2',
        content: 'Second timeline item',
        time: '1 hour ago',
      },
      {
        id: 'item-3',
        content: 'Third timeline item',
        time: '30 minutes ago',
      },
    ];
    const component = await mount(
      <TestWrapper>
        <Timeline items={items} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-default.png');
  });

  test('with custom dots @visual', async ({ mount }) => {
    const items = [
      {
        id: 'item-1',
        content: 'Item with custom dot',
        time: '2 hours ago',
        dot: <div style={{ width: '12px', height: '12px', background: '#ffd43b', borderRadius: '50%' }} />,
      },
      {
        id: 'item-2',
        content: 'Another item',
        time: '1 hour ago',
        dot: <div style={{ width: '12px', height: '12px', background: '#4fc3f7', borderRadius: '50%' }} />,
      },
    ];
    const component = await mount(
      <TestWrapper>
        <Timeline items={items} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-custom-dots.png');
  });

  test('with disabled items @visual', async ({ mount }) => {
    const items = [
      {
        id: 'item-1',
        content: 'Active item',
        time: '2 hours ago',
        disabled: false,
      },
      {
        id: 'item-2',
        content: 'Disabled item',
        time: '1 hour ago',
        disabled: true,
      },
      {
        id: 'item-3',
        content: 'Another active item',
        time: '30 minutes ago',
        disabled: false,
      },
    ];
    const component = await mount(
      <TestWrapper>
        <Timeline items={items} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-disabled-items.png');
  });

  test('single item @visual', async ({ mount }) => {
    const items = [
      {
        id: 'item-1',
        content: 'Single timeline item',
        time: '2 hours ago',
      },
    ];
    const component = await mount(
      <TestWrapper>
        <Timeline items={items} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-single-item.png');
  });

  test('with many items @visual', async ({ mount }) => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      id: `item-${i + 1}`,
      content: `Timeline item ${i + 1}`,
      time: `${10 - i} hours ago`,
    }));
    const component = await mount(
      <TestWrapper>
        <Timeline items={items} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-many-items.png');
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <Timeline items={[]} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-empty.png');
  });

  test('with click handlers @visual', async ({ mount }) => {
    const items = [
      {
        id: 'item-1',
        content: 'Clickable item',
        time: '2 hours ago',
        onClick: () => {},
      },
      {
        id: 'item-2',
        content: 'Another clickable item',
        time: '1 hour ago',
        onClick: () => {},
      },
    ];
    const component = await mount(
      <TestWrapper>
        <Timeline items={items} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('timeline-clickable.png');
  });
});
