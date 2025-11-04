import { test, expect } from '@playwright/experimental-ct-react';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { Search, Mail } from 'lucide-react';

test.describe('Input Visual Regression', () => {
  test('with label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Username" />
        <Input label="Email Address" />
        <Input label="Password" type="password" />
      </div>
    );

    await expect(component).toHaveScreenshot('input-with-label.png');
  });

  test('error state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Email" error="This field is required" />
        <Input label="Username" error="Username already taken" value="test" onChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('input-error.png');
  });

  test('helper text @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Username" helperText="Choose a unique username" />
        <Input label="Password" helperText="Must be at least 8 characters" type="password" />
      </div>
    );

    await expect(component).toHaveScreenshot('input-helper-text.png');
  });

  test('with icon @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Search" icon={Search} placeholder="Search..." />
        <Input label="Email" icon={Mail} type="email" placeholder="email@example.com" />
      </div>
    );

    await expect(component).toHaveScreenshot('input-with-icon.png');
  });

  test('character count @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Username" value="test" showCount maxLength={20} onChange={() => {}} />
        <Input label="Description" value="Almost at limit" showCount maxLength={20} onChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('input-character-count.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Username" disabled />
        <Input label="Email" disabled value="disabled@example.com" />
      </div>
    );

    await expect(component).toHaveScreenshot('input-disabled.png');
  });

  test('input types @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Input label="Text" type="text" value="text input" onChange={() => {}} />
        <Input label="Email" type="email" value="email@example.com" onChange={() => {}} />
        <Input label="Password" type="password" value="password123" onChange={() => {}} />
        <Input label="Number" type="number" value="123" onChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('input-types.png');
  });
});

test.describe('Textarea Visual Regression', () => {
  test('with label @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Textarea label="Description" />
        <Textarea label="Comments" />
      </div>
    );

    await expect(component).toHaveScreenshot('textarea-with-label.png');
  });

  test('error state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Textarea label="Description" error="This field is required" />
        <Textarea label="Comments" error="Maximum 500 characters allowed" value="Some text" onChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('textarea-error.png');
  });

  test('helper text @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Textarea label="Description" helperText="Provide a detailed description" />
        <Textarea label="Comments" helperText="Optional: Add any additional comments" />
      </div>
    );

    await expect(component).toHaveScreenshot('textarea-helper-text.png');
  });

  test('character count @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Textarea label="Description" value="Some text" showCount maxLength={100} onChange={() => {}} />
        <Textarea label="Comments" value="Almost at the character limit text" showCount maxLength={50} onChange={() => {}} />
      </div>
    );

    await expect(component).toHaveScreenshot('textarea-character-count.png');
  });

  test('disabled state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Textarea label="Description" disabled />
        <Textarea label="Comments" disabled value="Disabled textarea content" />
      </div>
    );

    await expect(component).toHaveScreenshot('textarea-disabled.png');
  });

  test('resizing behavior @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', width: '400px' }}>
        <Textarea label="Resizable" defaultValue="This textarea can be resized" />
        <Textarea label="Not Resizable" style={{ resize: 'none' }} defaultValue="This textarea cannot be resized" />
      </div>
    );

    await expect(component).toHaveScreenshot('textarea-resizing.png');
  });
});

