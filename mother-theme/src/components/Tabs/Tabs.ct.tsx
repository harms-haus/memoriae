import { test, expect } from '@playwright/experimental-ct-react';
import { Tabs, Tab, TabPanel } from './Tabs';

test.describe('Tabs Visual Regression', () => {
  test('default state @visual', async ({ mount }) => {
    const component = await mount(
      <Tabs defaultValue="tab1">
        <Tab value="tab1" label="Tab 1" />
        <Tab value="tab2" label="Tab 2" />
        <Tab value="tab3" label="Tab 3" />
        <TabPanel value="tab1">Content for Tab 1</TabPanel>
        <TabPanel value="tab2">Content for Tab 2</TabPanel>
        <TabPanel value="tab3">Content for Tab 3</TabPanel>
      </Tabs>
    );

    await expect(component).toHaveScreenshot('tabs-default.png');
  });

  test('active tab state @visual', async ({ mount }) => {
    const component = await mount(
      <Tabs defaultValue="tab2">
        <Tab value="tab1" label="Tab 1" />
        <Tab value="tab2" label="Tab 2" />
        <Tab value="tab3" label="Tab 3" />
        <TabPanel value="tab1">Content for Tab 1</TabPanel>
        <TabPanel value="tab2">Content for Tab 2</TabPanel>
        <TabPanel value="tab3">Content for Tab 3</TabPanel>
      </Tabs>
    );

    await expect(component).toHaveScreenshot('tabs-active-tab2.png');
  });

  test('disabled tab state @visual', async ({ mount }) => {
    const component = await mount(
      <Tabs defaultValue="tab1">
        <Tab value="tab1" label="Tab 1" />
        <Tab value="tab2" label="Tab 2" disabled />
        <Tab value="tab3" label="Tab 3" />
        <TabPanel value="tab1">Content for Tab 1</TabPanel>
        <TabPanel value="tab2">Content for Tab 2</TabPanel>
        <TabPanel value="tab3">Content for Tab 3</TabPanel>
      </Tabs>
    );

    await expect(component).toHaveScreenshot('tabs-disabled.png');
  });
});

