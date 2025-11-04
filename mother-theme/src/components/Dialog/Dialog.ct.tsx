import { test, expect } from '@playwright/experimental-ct-react';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './Dialog';

test.describe('Dialog Visual Regression', () => {
  test('default dialog @visual', async ({ mount }) => {
    const component = await mount(
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogHeader title="Dialog Title" onClose={() => {}} />
        <DialogBody>
          <p>This is the dialog body content. It can contain any React elements.</p>
        </DialogBody>
        <DialogFooter>
          <button className="btn-secondary">Cancel</button>
          <button className="btn-primary">Confirm</button>
        </DialogFooter>
      </Dialog>
    );

    await expect(component).toHaveScreenshot('dialog-default.png');
  });

  test('small dialog @visual', async ({ mount }) => {
    const component = await mount(
      <Dialog open={true} onOpenChange={() => {}} size="small">
        <DialogHeader title="Small Dialog" onClose={() => {}} />
        <DialogBody>
          <p>This is a small dialog.</p>
        </DialogBody>
      </Dialog>
    );

    await expect(component).toHaveScreenshot('dialog-small.png');
  });

  test('large dialog @visual', async ({ mount }) => {
    const component = await mount(
      <Dialog open={true} onOpenChange={() => {}} size="large">
        <DialogHeader title="Large Dialog" onClose={() => {}} />
        <DialogBody>
          <p>This is a large dialog with more content.</p>
          <p>It can contain multiple paragraphs and elements.</p>
        </DialogBody>
      </Dialog>
    );

    await expect(component).toHaveScreenshot('dialog-large.png');
  });
});

