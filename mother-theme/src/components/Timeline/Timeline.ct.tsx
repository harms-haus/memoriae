import { test, expect } from '@playwright/experimental-ct-react';
import { Timeline, TimelineItem } from './Timeline';

test.describe('Timeline Visual Regression', () => {
  const sampleItems: TimelineItem[] = [
    { id: '1', position: 0 },
    { id: '2', position: 33 },
    { id: '3', position: 66 },
    { id: '4', position: 100 },
  ];

  test('left mode @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '800px', padding: '2rem' }}>
        <Timeline
          items={sampleItems}
          mode="left"
          renderPanel={(index) => (
            <div style={{ padding: '1rem' }}>
              <h3>Event {index + 1}</h3>
              <p>Content for event {index + 1}</p>
            </div>
          )}
        />
      </div>
    );

    await expect(component).toHaveScreenshot('timeline-left-mode.png');
  });

  test('center mode @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '800px', padding: '2rem' }}>
        <Timeline
          items={sampleItems}
          mode="center"
          renderPanel={(index) => (
            <div style={{ padding: '1rem' }}>
              <h3>Event {index + 1}</h3>
              <p>Content for event {index + 1}</p>
            </div>
          )}
        />
      </div>
    );

    await expect(component).toHaveScreenshot('timeline-center-mode.png');
  });

  test('right mode @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '800px', padding: '2rem' }}>
        <Timeline
          items={sampleItems}
          mode="right"
          renderPanel={(index) => (
            <div style={{ padding: '1rem' }}>
              <h3>Event {index + 1}</h3>
              <p>Content for event {index + 1}</p>
            </div>
          )}
        />
      </div>
    );

    await expect(component).toHaveScreenshot('timeline-right-mode.png');
  });

  test('with multiple items @visual', async ({ mount }) => {
    const manyItems: TimelineItem[] = [
      { id: '1', position: 0 },
      { id: '2', position: 20 },
      { id: '3', position: 40 },
      { id: '4', position: 60 },
      { id: '5', position: 80 },
      { id: '6', position: 100 },
    ];

    const component = await mount(
      <div style={{ width: '800px', padding: '2rem' }}>
        <Timeline
          items={manyItems}
          mode="center"
          renderPanel={(index) => (
            <div style={{ padding: '1rem' }}>
              <h3>Event {index + 1}</h3>
            </div>
          )}
        />
      </div>
    );

    await expect(component).toHaveScreenshot('timeline-multiple-items.png');
  });

  test('with custom panels @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '800px', padding: '2rem' }}>
        <Timeline
          items={sampleItems}
          mode="center"
          createPanel={(direction, pos, index, width) => (
            <div
              style={{
                padding: '1rem',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-primary)',
                borderRadius: 'var(--radius-md)',
                maxWidth: width,
              }}
            >
              <h3>Custom Panel {index + 1}</h3>
              <p>Direction: {direction}</p>
            </div>
          )}
        />
      </div>
    );

    await expect(component).toHaveScreenshot('timeline-custom-panels.png');
  });

  test('with renderOpposite (center mode) @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ width: '800px', padding: '2rem' }}>
        <Timeline
          items={sampleItems}
          mode="center"
          renderPanel={(index) => (
            <div style={{ padding: '1rem' }}>
              <h3>Main Panel {index + 1}</h3>
            </div>
          )}
          renderOpposite={(index, width, panelSide) => (
            <div
              style={{
                padding: '0.5rem',
                background: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-sm)',
                maxWidth: width,
              }}
            >
              <p>Opposite content {index + 1} (Panel on {panelSide})</p>
            </div>
          )}
        />
      </div>
    );

    await expect(component).toHaveScreenshot('timeline-render-opposite.png');
  });
});

