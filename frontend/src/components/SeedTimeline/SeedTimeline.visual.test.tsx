import { test, expect } from '@playwright/experimental-ct-react';
import { SeedTimeline } from './SeedTimeline';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';
import type { TransactionHistoryMessage } from '../TransactionHistoryList';

const { TestWrapper, createMockSeedTransaction, createMockSprout, createMockTag, wait } = testUtils;

test.describe('SeedTimeline Visual Regression', () => {
  const getColor = (message: TransactionHistoryMessage): string => {
    if (message.title.includes('Tag')) return 'var(--accent-purple)';
    if (message.title.includes('Category')) return 'var(--accent-yellow)';
    if (message.title.includes('Content')) return 'var(--accent-blue)';
    return 'var(--text-secondary)';
  };

  test('default state with transactions @visual', async ({ mount }) => {
    const transactions = [
      createMockSeedTransaction({
        id: 'txn-1',
        transaction_type: 'create_seed',
        transaction_data: { content: 'Initial seed content' },
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
      }),
      createMockSeedTransaction({
        id: 'txn-2',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      }),
    ];
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedTimeline 
            transactions={transactions}
            sprouts={[]}
            tags={[]}
            getColor={getColor}
          />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for timeline to render
    await wait(300);
    await expect(component).toHaveScreenshot('seed-timeline-default.png');
  });

  test('with sprouts @visual', async ({ mount }) => {
    const sprouts = [
      createMockSprout({
        id: 'sprout-1',
        sprout_type: 'followup',
        sprout_data: {
          trigger: 'manual',
          initial_time: new Date().toISOString(),
          initial_message: 'Follow up on this seed',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      }),
      createMockSprout({
        id: 'sprout-2',
        sprout_type: 'wikipedia_reference',
        sprout_data: {
          reference: 'Human chimerism',
          article_url: 'https://en.wikipedia.org/wiki/Human_chimerism',
          article_title: 'Human chimerism',
          summary: 'A brief summary of the topic.',
        },
        created_at: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
      }),
    ];
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedTimeline 
            transactions={[]}
            sprouts={sprouts}
            tags={[]}
            getColor={getColor}
          />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for timeline and sprout states to load
    await wait(500);
    await expect(component).toHaveScreenshot('seed-timeline-with-sprouts.png');
  });

  test('with grouped tags @visual', async ({ mount }) => {
    const transactions = [
      createMockSeedTransaction({
        id: 'txn-1',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-1', tag_name: 'work' },
        created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      }),
      createMockSeedTransaction({
        id: 'txn-2',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-2', tag_name: 'important' },
        created_at: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
      }),
      createMockSeedTransaction({
        id: 'txn-3',
        transaction_type: 'add_tag',
        transaction_data: { tag_id: 'tag-3', tag_name: 'project' },
        created_at: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      }),
    ];
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work', color: '#ffd43b' }),
      createMockTag({ id: 'tag-2', name: 'important', color: '#4fc3f7' }),
      createMockTag({ id: 'tag-3', name: 'project', color: '#66bb6a' }),
    ];
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedTimeline 
            transactions={transactions}
            sprouts={[]}
            tags={tags}
            getColor={getColor}
          />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(300);
    await expect(component).toHaveScreenshot('seed-timeline-grouped-tags.png');
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedTimeline 
            transactions={[]}
            sprouts={[]}
            tags={[]}
            getColor={getColor}
          />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for empty state to render
    await wait(200);
    await expect(component).toHaveScreenshot('seed-timeline-empty.png');
  });

  test('with many items @visual', async ({ mount }) => {
    const transactions = Array.from({ length: 10 }, (_, i) =>
      createMockSeedTransaction({
        id: `txn-${i + 1}`,
        transaction_type: i === 0 ? 'create_seed' : 'edit_content',
        transaction_data: i === 0 
          ? { content: 'Initial content' }
          : { content: `Edit ${i}` },
        created_at: new Date(Date.now() - 1000 * 60 * (10 - i)).toISOString(),
      })
    );
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <SeedTimeline 
            transactions={transactions}
            sprouts={[]}
            tags={[]}
            getColor={getColor}
          />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(300);
    await expect(component).toHaveScreenshot('seed-timeline-many-items.png');
  });
});
