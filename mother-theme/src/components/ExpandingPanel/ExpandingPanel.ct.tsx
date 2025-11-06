import { test, expect } from '@playwright/experimental-ct-react';
import { ExpandingPanel } from './ExpandingPanel';

test.describe('ExpandingPanel Visual Regression', () => {
  test('collapsed state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)' }}>
        <ExpandingPanel title="Collapsed Panel">
          <p>This content is hidden when the panel is collapsed.</p>
          <p>Click the header to expand and see this content.</p>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-collapsed.png');
  });

  test('expanded state @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)' }}>
        <ExpandingPanel title="Expanded Panel" defaultExpanded={true}>
          <p>This content is visible when the panel is expanded.</p>
          <p>The panel starts in an expanded state.</p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-expanded.png');
  });

  test('all variants @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ExpandingPanel title="Default Variant" variant="default" defaultExpanded={true}>
          <p>This is the default variant with standard styling.</p>
        </ExpandingPanel>
        <ExpandingPanel title="Elevated Variant" variant="elevated" defaultExpanded={true}>
          <p>This is the elevated variant with shadow and elevated background.</p>
        </ExpandingPanel>
        <ExpandingPanel title="Accent Variant" variant="accent" defaultExpanded={true}>
          <p>This is the accent variant with accent colors.</p>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-all-variants.png');
  });

  test('with different content lengths @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ExpandingPanel title="Short Content" defaultExpanded={true}>
          <p>Short</p>
        </ExpandingPanel>
        <ExpandingPanel title="Medium Content" defaultExpanded={true}>
          <p>This is a medium length content that spans a few lines and provides some context about what the panel contains.</p>
        </ExpandingPanel>
        <ExpandingPanel title="Long Content" defaultExpanded={true}>
          <p>This is a very long content section that demonstrates how the ExpandingPanel handles extensive content. It includes multiple paragraphs and various elements to show how the component adapts to different content sizes.</p>
          <p>Here's another paragraph to add more content. The panel should handle this gracefully and maintain proper spacing and layout regardless of the content length.</p>
          <ul>
            <li>First item in a list</li>
            <li>Second item in a list</li>
            <li>Third item in a list</li>
            <li>Fourth item in a list</li>
          </ul>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-content-lengths.png');
  });

  test('with complex content @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)' }}>
        <ExpandingPanel title="Complex Content Panel" defaultExpanded={true}>
          <div>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: 'var(--text-lg)' }}>Section Title</h3>
            <p style={{ margin: '0 0 1rem 0' }}>
              This panel contains complex content with various elements including headings, paragraphs, lists, and interactive elements.
            </p>
            <ul style={{ margin: '0 0 1rem 0', paddingLeft: '1.5rem' }}>
              <li>First list item</li>
              <li>Second list item</li>
              <li>Third list item</li>
            </ul>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button className="btn-primary">Primary Action</button>
              <button className="btn-secondary">Secondary Action</button>
            </div>
          </div>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-complex-content.png');
  });

  test('multiple panels @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ExpandingPanel title="First Panel" defaultExpanded={true}>
          <p>Content for the first panel.</p>
        </ExpandingPanel>
        <ExpandingPanel title="Second Panel">
          <p>Content for the second panel (collapsed).</p>
        </ExpandingPanel>
        <ExpandingPanel title="Third Panel" defaultExpanded={true}>
          <p>Content for the third panel.</p>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-multiple.png');
  });

  test('with React node title @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)' }}>
        <ExpandingPanel 
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>Custom Title</span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>(With Badge)</span>
            </div>
          }
          defaultExpanded={true}
        >
          <p>This panel has a custom React node as the title instead of a simple string.</p>
        </ExpandingPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('expanding-panel-react-title.png');
  });

  test('hover and focus states @visual', async ({ mount, page }) => {
    const component = await mount(
      <div style={{ width: '600px', padding: '2rem', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <ExpandingPanel title="Hover State">
          <p>Hover over this panel header to see the hover effect.</p>
        </ExpandingPanel>
        <ExpandingPanel title="Focus State">
          <p>Focus on this panel header to see the focus ring.</p>
        </ExpandingPanel>
      </div>
    );

    // Hover over first panel
    const firstHeader = component.locator('.expanding-panel-header').first();
    await firstHeader.hover();
    await page.waitForTimeout(100); // Wait for hover state

    // Focus on second panel
    const secondHeader = component.locator('.expanding-panel-header').nth(1);
    await secondHeader.focus();
    await page.waitForTimeout(100); // Wait for focus state

    await expect(component).toHaveScreenshot('expanding-panel-interactive-states.png');
  });
});

