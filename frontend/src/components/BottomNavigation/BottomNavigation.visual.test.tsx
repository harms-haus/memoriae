import { test, expect } from '@playwright/experimental-ct-react';
import { BottomNavigation } from './BottomNavigation';
import testUtils from '../../test/visual-setup';

const { TestWrapper } = testUtils;

test.describe('BottomNavigation Visual Regression', () => {
  test('default state - seeds active @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <BottomNavigation activeView="seeds" onViewChange={() => {}} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('bottom-navigation-seeds-active.png');
  });

  test('timeline active @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <BottomNavigation activeView="timeline" onViewChange={() => {}} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('bottom-navigation-timeline-active.png');
  });

  test('categories active @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <BottomNavigation activeView="categories" onViewChange={() => {}} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('bottom-navigation-categories-active.png');
  });

  test('tags active @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <BottomNavigation activeView="tags" onViewChange={() => {}} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('bottom-navigation-tags-active.png');
  });

  test('settings active @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <BottomNavigation activeView="settings" onViewChange={() => {}} />
      </TestWrapper>
    );
    await expect(component).toHaveScreenshot('bottom-navigation-settings-active.png');
  });

  test('all tabs visible @visual', async ({ mount }) => {
    const component = await mount(
      <TestWrapper>
        <BottomNavigation activeView="seeds" onViewChange={() => {}} />
      </TestWrapper>
    );
    // Verify all tabs are visible
    const tabs = component.locator('.bottom-nav-item');
    const count = await tabs.count();
    expect(count).toBe(5);
    await expect(component).toHaveScreenshot('bottom-navigation-all-tabs.png');
  });
});
