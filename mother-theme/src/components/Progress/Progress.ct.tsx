import { test, expect } from '@playwright/experimental-ct-react';
import { Progress } from './Progress';

test.describe('Progress Visual Regression', () => {
  test('all variants @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={50} variant="default" />
        <Progress value={50} variant="success" />
        <Progress value={50} variant="warning" />
        <Progress value={50} variant="error" />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-variants.png');
  });

  test('with label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={65} showLabel />
        <Progress value={30} showLabel />
        <Progress value={100} showLabel />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-with-label.png');
  });

  test('with custom label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={75} label="Uploading..." />
        <Progress value={45} label="Processing" />
        <Progress value={90} label="Almost done" />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-custom-label.png');
  });

  test('striped variant @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={50} striped />
        <Progress value={50} variant="success" striped />
        <Progress value={50} variant="warning" striped />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-striped.png');
  });

  test('animated variant @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={50} animated />
        <Progress value={50} variant="success" animated />
        <Progress value={50} variant="warning" animated />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-animated.png');
  });

  test('different values @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={0} showLabel />
        <Progress value={25} showLabel />
        <Progress value={50} showLabel />
        <Progress value={75} showLabel />
        <Progress value={100} showLabel />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-values.png');
  });

  test('striped and animated combination @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Progress value={50} striped animated />
        <Progress value={50} variant="success" striped animated />
        <Progress value={50} variant="warning" striped animated showLabel />
      </div>
    );

    await expect(component).toHaveScreenshot('progress-striped-animated.png');
  });
});

