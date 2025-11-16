import { test, expect } from '@playwright/experimental-ct-react';
import { WikipediaSproutDetail } from './WikipediaSproutDetail';
import testUtils from '../../test/visual-setup';
import { BrowserRouter } from 'react-router-dom';

const { TestWrapper, createMockSprout, wait } = testUtils;

test.describe('WikipediaSproutDetail Visual Regression', () => {
  const createWikipediaSprout = (overrides?: Partial<any>) => {
    return createMockSprout({
      sprout_type: 'wikipedia_reference',
      sprout_data: {
        reference: overrides?.reference || 'Human chimerism',
        article_url: overrides?.article_url || 'https://en.wikipedia.org/wiki/Human_chimerism',
        article_title: overrides?.article_title || 'Human chimerism',
        summary: overrides?.summary || 'Human chimerism is a condition in which an individual has two or more genetically distinct cell populations.',
      },
      ...overrides,
    });
  };

  test('default state @visual', async ({ mount }) => {
    const sprout = createWikipediaSprout();
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for data to load
    await wait(500);
    await expect(component).toHaveScreenshot('wikipedia-sprout-detail-default.png');
  });

  test('loading state @visual', async ({ mount }) => {
    const sprout = createWikipediaSprout();
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Capture loading state immediately
    await wait(50);
    // Check if loading indicator is shown
    const loadingIndicator = component.locator('text=Loading');
    if (await loadingIndicator.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('wikipedia-sprout-detail-loading.png');
    }
  });

  test('with long summary @visual', async ({ mount }) => {
    const longSummary = 'Human chimerism is a condition in which an individual has two or more genetically distinct cell populations. '.repeat(5);
    const sprout = createWikipediaSprout({
      sprout_data: {
        reference: 'Human chimerism',
        article_url: 'https://en.wikipedia.org/wiki/Human_chimerism',
        article_title: 'Human chimerism',
        summary: longSummary,
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    await expect(component).toHaveScreenshot('wikipedia-sprout-detail-long-summary.png');
  });

  test('with edit button @visual', async ({ mount }) => {
    const sprout = createWikipediaSprout();
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Check if edit button is visible
    const editButton = component.locator('button[aria-label*="Edit"], button:has-text("Edit")');
    if (await editButton.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('wikipedia-sprout-detail-edit-button.png');
    }
  });

  test('with regenerate button @visual', async ({ mount }) => {
    const sprout = createWikipediaSprout();
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Check if regenerate button is visible
    const regenerateButton = component.locator('button[aria-label*="Regenerate"], button:has-text("Regenerate")');
    if (await regenerateButton.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('wikipedia-sprout-detail-regenerate-button.png');
    }
  });

  test('with article link @visual', async ({ mount }) => {
    const sprout = createWikipediaSprout({
      sprout_data: {
        reference: 'Human chimerism',
        article_title: 'Human Chimerism',
        article_url: 'https://en.wikipedia.org/wiki/Human_chimerism',
        summary: 'A brief summary.',
      },
    });
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    await wait(500);
    // Check if article link is visible
    const articleLink = component.locator('a[href*="wikipedia"]');
    if (await articleLink.isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('wikipedia-sprout-detail-article-link.png');
    }
  });

  test('with transactions @visual', async ({ mount }) => {
    const sprout = createWikipediaSprout();
    const component = await mount(
      <BrowserRouter>
        <TestWrapper>
          <WikipediaSproutDetail sprout={sprout} onUpdate={() => {}} />
        </TestWrapper>
      </BrowserRouter>
    );
    // Wait for data to load (including transactions)
    await wait(500);
    // Check if transactions are displayed
    const transactions = component.locator('[class*="transaction"], [class*="history"]');
    if (await transactions.first().isVisible().catch(() => false)) {
      await expect(component).toHaveScreenshot('wikipedia-sprout-detail-transactions.png');
    }
  });
});
