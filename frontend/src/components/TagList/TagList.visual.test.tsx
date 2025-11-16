import { test, expect } from '@playwright/experimental-ct-react';
import { TagList } from './TagList';
import testUtils from '../../test/visual-setup';

const { TestWrapper, createMockTag, wait } = testUtils;

test.describe('TagList Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work', color: '#ffd43b' }),
      createMockTag({ id: 'tag-2', name: 'personal', color: '#4fc3f7' }),
      createMockTag({ id: 'tag-3', name: 'important', color: '#66bb6a' }),
    ];
    const component = await mount(
      <TestWrapper>
        <TagList tags={tags} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('tag-list-default.png');
  });

  test('with hash prefixes @visual', async ({ mount }) => {
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work' }),
      createMockTag({ id: 'tag-2', name: 'personal' }),
    ];
    const component = await mount(
      <TestWrapper>
        <TagList tags={tags} suppressHashes={false} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('tag-list-with-hashes.png');
  });

  test('without hash prefixes @visual', async ({ mount }) => {
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work' }),
      createMockTag({ id: 'tag-2', name: 'personal' }),
    ];
    const component = await mount(
      <TestWrapper>
        <TagList tags={tags} suppressHashes={true} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('tag-list-without-hashes.png');
  });

  test('with custom colors @visual', async ({ mount }) => {
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work', color: '#ff0000' }),
      createMockTag({ id: 'tag-2', name: 'personal', color: '#00ff00' }),
      createMockTag({ id: 'tag-3', name: 'important', color: '#0000ff' }),
    ];
    const component = await mount(
      <TestWrapper>
        <TagList tags={tags} suppressColors={false} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('tag-list-custom-colors.png');
  });

  test('with many tags - truncation @visual', async ({ mount }) => {
    const tags = Array.from({ length: 20 }, (_, i) =>
      createMockTag({ id: `tag-${i + 1}`, name: `tag${i + 1}` })
    );
    const component = await mount(
      <TestWrapper>
        <TagList tags={tags} />
      </TestWrapper>
    );
    // Wait for truncation to apply
    await wait(200);
    await expect(component).toHaveScreenshot('tag-list-truncated.png');
  });

  test('empty state @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <TagList tags={[]} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('tag-list-empty.png');
  });

  test('with click handlers @visual', async ({ mount }) => {
    const tags = [
      createMockTag({ id: 'tag-1', name: 'work' }),
      createMockTag({ id: 'tag-2', name: 'personal' }),
    ];
    const component = await mount(
      <TestWrapper>
        <TagList 
          tags={tags} 
          onTagClick={(tag, event) => {
            event.preventDefault();
          }}
        />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('tag-list-clickable.png');
  });
});
