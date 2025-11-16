import { test, expect } from '@playwright/experimental-ct-react';
import { TransactionHistoryList } from './TransactionHistoryList';
import testUtils from '../../test/visual-setup';
import type { TransactionHistoryMessage } from './TransactionHistoryList';

const { TestWrapper } = testUtils;

test.describe('TransactionHistoryList Visual Regression', () => {
  const getColor = (message: TransactionHistoryMessage): string => {
    if (message.title.includes('Tag')) return 'var(--accent-purple)';
    if (message.title.includes('Category')) return 'var(--accent-yellow)';
    if (message.title.includes('Content')) return 'var(--accent-blue)';
    if (message.title.includes('Created')) return 'var(--accent-green)';
    return 'var(--text-secondary)';
  };

  test('default state @visual', async ({ mount }) => {
    const messages: TransactionHistoryMessage[] = [
      {
        id: 'msg-1',
        title: 'Seed Created',
        content: 'Initial seed content was created',
        time: new Date(Date.now() - 1000 * 60 * 60),
      },
      {
        id: 'msg-2',
        title: 'Content Edited',
        content: 'Seed content was updated',
        time: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: 'msg-3',
        title: 'Tag Added',
        content: 'Tag "work" was added',
        time: new Date(Date.now() - 1000 * 60 * 15),
      },
    ];
    const component = await mount(
      <TestWrapper>
        <TransactionHistoryList messages={messages} getColor={getColor} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('transaction-history-default.png');
  });

  test('with grouped messages @visual', async ({ mount }) => {
    const now = Date.now();
    const messages: TransactionHistoryMessage[] = [
      {
        id: 'msg-1',
        title: 'Tags Added',
        content: 'Tag "work" was added',
        time: new Date(now - 1000 * 60 * 5),
        groupKey: 'add_tag',
      },
      {
        id: 'msg-2',
        title: 'Tags Added',
        content: 'Tag "important" was added',
        time: new Date(now - 1000 * 60 * 4),
        groupKey: 'add_tag',
      },
      {
        id: 'msg-3',
        title: 'Tags Added',
        content: 'Tag "project" was added',
        time: new Date(now - 1000 * 60 * 3),
        groupKey: 'add_tag',
      },
    ];
    const component = await mount(
      <TestWrapper>
        <TransactionHistoryList messages={messages} getColor={getColor} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('transaction-history-grouped.png');
  });

  test('with many messages @visual', async ({ mount }) => {
    const messages: TransactionHistoryMessage[] = Array.from({ length: 15 }, (_, i) => ({
      id: `msg-${i + 1}`,
      title: i % 2 === 0 ? 'Content Edited' : 'Tag Added',
      content: `Transaction ${i + 1} description`,
      time: new Date(Date.now() - 1000 * 60 * (15 - i)),
    }));
    const component = await mount(
      <TestWrapper>
        <TransactionHistoryList messages={messages} getColor={getColor} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('transaction-history-many-messages.png');
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <TransactionHistoryList messages={[]} getColor={getColor} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('transaction-history-empty.png');
  });

  test('with different transaction types @visual', async ({ mount }) => {
    const messages: TransactionHistoryMessage[] = [
      {
        id: 'msg-1',
        title: 'Seed Created',
        content: 'Initial seed was created',
        time: new Date(Date.now() - 1000 * 60 * 60 * 2),
      },
      {
        id: 'msg-2',
        title: 'Content Edited',
        content: 'Seed content was updated',
        time: new Date(Date.now() - 1000 * 60 * 45),
      },
      {
        id: 'msg-3',
        title: 'Tag Added',
        content: 'Tag "work" was added',
        time: new Date(Date.now() - 1000 * 60 * 30),
      },
      {
        id: 'msg-4',
        title: 'Category Set',
        content: 'Category "Projects" was set',
        time: new Date(Date.now() - 1000 * 60 * 20),
      },
      {
        id: 'msg-5',
        title: 'Tag Removed',
        content: 'Tag "old-tag" was removed',
        time: new Date(Date.now() - 1000 * 60 * 10),
      },
    ];
    const component = await mount(
      <TestWrapper>
        <TransactionHistoryList messages={messages} getColor={getColor} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('transaction-history-various-types.png');
  });

  test('with custom grouping threshold @visual', async ({ mount }) => {
    const now = Date.now();
    const messages: TransactionHistoryMessage[] = [
      {
        id: 'msg-1',
        title: 'Tags Added',
        content: 'Tag "work" was added',
        time: new Date(now - 1000 * 30), // 30 seconds ago
        groupKey: 'add_tag',
      },
      {
        id: 'msg-2',
        title: 'Tags Added',
        content: 'Tag "important" was added',
        time: new Date(now - 1000 * 20), // 20 seconds ago
        groupKey: 'add_tag',
      },
    ];
    // Use a shorter grouping threshold (30 seconds)
    const component = await mount(
      <TestWrapper>
        <TransactionHistoryList 
          messages={messages} 
          getColor={getColor}
          groupThresholdMs={30000}
        />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('transaction-history-custom-threshold.png');
  });
});
