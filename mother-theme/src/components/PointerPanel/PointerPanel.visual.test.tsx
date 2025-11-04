import { test, expect } from '@playwright/experimental-ct-react';
import { PointerPanel } from './PointerPanel';

test.describe('PointerPanel Visual Regression', () => {
  test('all positions @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ position: 'relative', width: '800px', height: '500px', background: 'var(--bg-primary)', padding: '2rem' }}>
        <PointerPanel position="top-left" style={{ left: '0', top: '0' }}>
          Top-left pointing left
        </PointerPanel>

        <PointerPanel position="top-right" style={{ right: '0', top: '0' }}>
          Top-right pointing right
        </PointerPanel>

        <PointerPanel 
          position="center-left" 
          style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
        >
          Center-left pointing left
        </PointerPanel>

        <PointerPanel 
          position="center-right" 
          style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
        >
          Center-right pointing right
        </PointerPanel>

        <PointerPanel position="bottom-left" style={{ left: '0', bottom: '0' }}>
          Bottom-left pointing left
        </PointerPanel>

        <PointerPanel position="bottom-right" style={{ right: '0', bottom: '0' }}>
          Bottom-right pointing right
        </PointerPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('pointer-panel-all-positions.png');
  });

  test('arrow sizes @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ position: 'relative', width: '600px', height: '300px', background: 'var(--bg-primary)', padding: '2rem' }}>
        <PointerPanel 
          position="center-left" 
          arrowSize={12}
          style={{ left: '0', top: '20%', transform: 'translateY(-50%)' }}
        >
          Small arrow (12px)
        </PointerPanel>

        <PointerPanel 
          position="center-left" 
          arrowSize={16}
          style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
        >
          Default arrow (16px)
        </PointerPanel>

        <PointerPanel 
          position="center-left" 
          arrowSize={24}
          style={{ left: '0', top: '80%', transform: 'translateY(-50%)' }}
        >
          Large arrow (24px)
        </PointerPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('pointer-panel-arrow-sizes.png');
  });

  test('with content @visual', async ({ mount }) => {
    const component = await mount(
      <div style={{ position: 'relative', width: '600px', height: '200px', background: 'var(--bg-primary)', padding: '2rem' }}>
        <PointerPanel 
          position="center-right" 
          style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
        >
          <div>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: 'var(--text-lg)' }}>Timeline Event</h3>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              This is a detailed description of the event that occurred at this point in time.
            </p>
            <button style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>View Details</button>
          </div>
        </PointerPanel>
      </div>
    );

    await expect(component).toHaveScreenshot('pointer-panel-with-content.png');
  });
});

