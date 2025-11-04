import { test, expect } from '@playwright/experimental-ct-react';
import { Drawer, DrawerHeader, DrawerBody, DrawerItem } from './Drawer';
import { Settings, User, Mail } from 'lucide-react';

test.describe('Drawer Visual Regression', () => {
  test('left drawer @visual', async ({ mount }) => {
    const component = await mount(
      <Drawer open={true} onOpenChange={() => {}} position="left">
        <DrawerHeader title="Left Drawer" onClose={() => {}} />
        <DrawerBody>
          <DrawerItem icon={Settings} title="Settings" description="Configure your preferences" onClick={() => {}} />
          <DrawerItem icon={User} title="Profile" description="Manage your account" onClick={() => {}} />
          <DrawerItem icon={Mail} title="Messages" onClick={() => {}} />
        </DrawerBody>
      </Drawer>
    );

    await expect(component).toHaveScreenshot('drawer-left.png');
  });

  test('right drawer @visual', async ({ mount }) => {
    const component = await mount(
      <Drawer open={true} onOpenChange={() => {}} position="right">
        <DrawerHeader title="Right Drawer" onClose={() => {}} />
        <DrawerBody>
          <DrawerItem icon={Settings} title="Settings" onClick={() => {}} />
        </DrawerBody>
      </Drawer>
    );

    await expect(component).toHaveScreenshot('drawer-right.png');
  });

  test('wide drawer @visual', async ({ mount }) => {
    const component = await mount(
      <Drawer open={true} onOpenChange={() => {}} size="wide">
        <DrawerHeader title="Wide Drawer" onClose={() => {}} />
        <DrawerBody>
          <DrawerItem icon={Settings} title="Settings" description="Configure your preferences" onClick={() => {}} />
        </DrawerBody>
      </Drawer>
    );

    await expect(component).toHaveScreenshot('drawer-wide.png');
  });
});

