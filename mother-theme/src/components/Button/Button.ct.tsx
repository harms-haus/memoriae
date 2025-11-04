import { test, expect } from '@playwright/experimental-ct-react';
import { Button } from './Button';
import { Check, ArrowRight, Settings } from 'lucide-react';

test.describe('Button Visual Regression', () => {
  test('all variants @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    );

    await expect(component).toHaveScreenshot('button-variants.png');
  });

  test('loading state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button variant="primary" loading>Loading</Button>
        <Button variant="secondary" loading>Loading</Button>
        <Button variant="ghost" loading>Loading</Button>
      </div>
    );

    await expect(component).toHaveScreenshot('button-loading.png');
  });

  test('with icons @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="primary" icon={Check} iconPosition="left">Icon Left</Button>
          <Button variant="primary" icon={ArrowRight} iconPosition="right">Icon Right</Button>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="secondary" icon={Check} iconPosition="left">Icon Left</Button>
          <Button variant="secondary" icon={ArrowRight} iconPosition="right">Icon Right</Button>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button variant="ghost" icon={Check} iconPosition="left">Icon Left</Button>
          <Button variant="ghost" icon={ArrowRight} iconPosition="right">Icon Right</Button>
        </div>
      </div>
    );

    await expect(component).toHaveScreenshot('button-icons.png');
  });

  test('icon-only button @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button variant="primary" icon={Settings} aria-label="Settings"></Button>
        <Button variant="secondary" icon={Settings} aria-label="Settings"></Button>
        <Button variant="ghost" icon={Settings} aria-label="Settings"></Button>
      </div>
    );

    await expect(component).toHaveScreenshot('button-icon-only.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button variant="primary" disabled>Disabled</Button>
        <Button variant="secondary" disabled>Disabled</Button>
        <Button variant="ghost" disabled>Disabled</Button>
      </div>
    );

    await expect(component).toHaveScreenshot('button-disabled.png');
  });

  test('disabled with icons @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
        <Button variant="primary" disabled icon={Check}>Disabled</Button>
        <Button variant="secondary" disabled icon={ArrowRight} iconPosition="right">Disabled</Button>
      </div>
    );

    await expect(component).toHaveScreenshot('button-disabled-icons.png');
  });
});

