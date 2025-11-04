import { test, expect } from '@playwright/experimental-ct-react';
import { Slider } from './Slider';

test.describe('Slider Visual Regression', () => {
  test('with label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', width: '400px' }}>
        <Slider label="Volume" value={50} onValueChange={() => {}} />
        <Slider label="Brightness" value={75} onValueChange={() => {}} />
        <Slider label="Opacity" value={25} onValueChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('slider-with-label.png');
  });

  test('with value display @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', width: '400px' }}>
        <Slider label="Volume" value={50} showValue onValueChange={() => {}} />
        <Slider label="Brightness" value={75} showValue onValueChange={() => {}} />
        <Slider label="Opacity" value={25} showValue onValueChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('slider-value-display.png');
  });

  test('with custom formatter @visual', async ({ mount }) => {
    const formatValue = (val: number) => `${val}%`;
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', width: '400px' }}>
        <Slider label="Volume" value={50} showValue formatValue={formatValue} onValueChange={() => {}} />
        <Slider label="Brightness" value={75} showValue formatValue={formatValue} onValueChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('slider-custom-formatter.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', width: '400px' }}>
        <Slider label="Volume" value={50} disabled onValueChange={() => {}} />
        <Slider label="Brightness" value={75} disabled showValue onValueChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('slider-disabled.png');
  });

  test('different value ranges @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', padding: '1rem', width: '400px' }}>
        <Slider label="Min" value={0} min={0} max={100} showValue onValueChange={() => {}} />
        <Slider label="Mid" value={50} min={0} max={100} showValue onValueChange={() => {}} />
        <Slider label="Max" value={100} min={0} max={100} showValue onValueChange={() => {}} />
        <Slider label="Custom Range" value={25} min={10} max={50} showValue onValueChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('slider-value-ranges.png');
  });
});

