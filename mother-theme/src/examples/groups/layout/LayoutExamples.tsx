import '../../../styles/theme.css';
import { PointerPanel, Timeline } from '../../../components';
import { ExampleSection } from '../../shared/ExampleSection';
import './LayoutExamples.css';

export function LayoutExamples() {
  return (
    <div className="examples-container">
      <header className="examples-header">
        <h1>Layout</h1>
        <p className="lead">Layout components: layered panels, pointer panels, and timeline</p>
      </header>

      {/* Layered Panels Section */}
      <ExampleSection id="panels" title="Layered Panels">
        <div className="panel">
          <h3>Level 1 - Base Panel</h3>
          <p>This is the base panel with secondary background.</p>
          <div className="panel-elevated" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Level 2 - Elevated Panel</h3>
            <p>This is an elevated panel with tertiary background and stronger shadow.</p>
            <div className="panel panel-accent" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Level 3 - Accent Panel</h3>
              <p>This is a panel with yellow accent border, nested three levels deep.</p>
            </div>
          </div>
        </div>

        <div className="panel-elevated">
          <h3>Alternate Layering</h3>
          <p>Elevated panel as level 1.</p>
          <div className="panel" style={{ marginTop: 'var(--space-4)' }}>
            <div className="panel-header-light">
              <h4>Light Header Panel</h4>
            </div>
            <p style={{ marginTop: 'var(--space-4)' }}>Content below the light header.</p>
          </div>
        </div>
      </ExampleSection>

      {/* Pointer Panels Section */}
      <ExampleSection id="pointer-panels" title="Pointer Panels">
        <div className="panel">
          <h3>Pointing Panels</h3>
          <p className="text-sm">Panels with arrow pointers that extend from the panel body. Positioned by the anchor point at the tip of the arrow. Perfect for timelines, tooltips, and popovers.</p>
          
          <div style={{ position: 'relative', minHeight: '400px', padding: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
            {/* Top-left */}
            <PointerPanel
              position="top-left"
              style={{ left: '0', top: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Top-left pointing left</div>
            </PointerPanel>

            {/* Top-right */}
            <PointerPanel
              position="top-right"
              style={{ right: '0', top: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Top-right pointing right</div>
            </PointerPanel>

            {/* Center-left */}
            <PointerPanel
              position="center-left"
              style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Center-left pointing left</div>
            </PointerPanel>

            {/* Center-right */}
            <PointerPanel
              position="center-right"
              style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Center-right pointing right</div>
            </PointerPanel>

            {/* Bottom-left */}
            <PointerPanel
              position="bottom-left"
              style={{ left: '0', bottom: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Bottom-left pointing left</div>
            </PointerPanel>

            {/* Bottom-right */}
            <PointerPanel
              position="bottom-right"
              style={{ right: '0', bottom: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Bottom-right pointing right</div>
            </PointerPanel>
          </div>
        </div>

        <div className="panel">
          <h3>Customizable Arrow Size</h3>
          <p className="text-sm">The arrow size can be customized using the arrowSize prop.</p>
          
          <div style={{ position: 'relative', minHeight: '200px', padding: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
            <PointerPanel
              position="center-left"
              arrowSize={12}
              style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Small arrow (12px)</div>
            </PointerPanel>

            <PointerPanel
              position="center-right"
              arrowSize={24}
              style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Large arrow (24px)</div>
            </PointerPanel>
          </div>
        </div>
      </ExampleSection>

      {/* Timeline Section */}
      <ExampleSection id="timeline" title="Timeline">
        <div className="panel">
          <h3>Center Mode (Alternating)</h3>
          <p className="text-sm">Timeline with panels alternating left and right, with optional tail content on opposite side.</p>
          
          <div style={{ marginTop: 'var(--space-6)', minHeight: '600px' }}>
            <Timeline
              items={[
                { id: '1', position: 0 },
                { id: '2', position: 33 },
                { id: '3', position: 67 },
                { id: '4', position: 100 },
              ]}
              mode="center"
              renderPanel={(index, width) => (
                <div style={{ padding: 'var(--space-2)' }}>
                  <div style={{ fontWeight: 'var(--weight-bold)', marginBottom: 'var(--space-2)' }}>
                    Item {index + 1}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Panel content for timeline item {index + 1}
                  </div>
                </div>
              )}
              renderOpposite={(index, width, panelSide) => (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                  {new Date(2024, 0, index + 1).toLocaleDateString()}
                </div>
              )}
              renderDot={(index, position, isTop, isBottom) => (
                <div
                  className="timeline-dot-default"
                  style={{
                    backgroundColor: index % 2 === 0 ? 'var(--accent-blue)' : 'var(--accent-purple)',
                    borderColor: index % 2 === 0 ? 'var(--accent-blue-dark)' : 'var(--accent-purple-dark)',
                  }}
                />
              )}
            />
          </div>
        </div>

        <div className="panel">
          <h3>Left Mode</h3>
          <p className="text-sm">Timeline aligned to the left, all panels on the right side.</p>
          
          <div style={{ marginTop: 'var(--space-6)', minHeight: '400px' }}>
            <Timeline
              items={[
                { id: '1', position: 0 },
                { id: '2', position: 50 },
                { id: '3', position: 100 },
              ]}
              mode="left"
              renderPanel={(index, width) => (
                <div style={{ padding: 'var(--space-2)' }}>
                  <div style={{ fontWeight: 'var(--weight-bold)' }}>Left Mode Item {index + 1}</div>
                </div>
              )}
            />
          </div>
        </div>

        <div className="panel">
          <h3>Right Mode</h3>
          <p className="text-sm">Timeline aligned to the right, all panels on the left side.</p>
          
          <div style={{ marginTop: 'var(--space-6)', minHeight: '400px' }}>
            <Timeline
              items={[
                { id: '1', position: 0 },
                { id: '2', position: 50 },
                { id: '3', position: 100 },
              ]}
              mode="right"
              renderPanel={(index, width) => (
                <div style={{ padding: 'var(--space-2)' }}>
                  <div style={{ fontWeight: 'var(--weight-bold)' }}>Right Mode Item {index + 1}</div>
                </div>
              )}
            />
          </div>
        </div>
      </ExampleSection>
    </div>
  );
}

