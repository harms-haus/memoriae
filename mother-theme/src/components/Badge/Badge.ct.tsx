import { test, expect } from '@playwright/experimental-ct-react';
import { Badge } from './Badge';

test.describe('Badge Visual Regression', () => {
  test('all variants @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Badge variant="primary">Primary</Badge>
        <Badge variant="success">Success</Badge>
        <Badge variant="warning">Warning</Badge>
        <Badge variant="error">Error</Badge>
      </div>
    );

    await expect(component).toHaveScreenshot('badge-all-variants.png');
  });

  test('different content lengths @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <Badge variant="primary">Short</Badge>
        <Badge variant="primary">Medium Length Text</Badge>
        <Badge variant="primary">This is a very long badge text that might wrap</Badge>
        <Badge variant="primary">123</Badge>
      </div>
    );

    await expect(component).toHaveScreenshot('badge-content-lengths.png');
  });

  test('custom className @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Badge variant="primary" className="custom-badge">Default</Badge>
        <Badge variant="primary" className="custom-badge">Custom Class</Badge>
      </div>
    );

    await expect(component).toHaveScreenshot('badge-custom-class.png');
  });
});

