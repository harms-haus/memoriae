import '../../../styles/theme.css';
import { Clock, FileText, Tags as TagsIcon, Settings, Plus, Search, Info, CheckCircle, AlertTriangle, XCircle, X } from 'lucide-react';
import { ExampleSection } from '../../shared/ExampleSection';
import './FoundationExamples.css';

export function FoundationExamples() {
  return (
    <div className="examples-container">
      <header className="examples-header">
        <h1>Foundation</h1>
        <p className="lead">Design tokens: colors, typography, spacing, borders, shadows, and iconography</p>
      </header>

      {/* Colors Section */}
      <ExampleSection id="colors" title="Colors">
        <div className="panel">
          <h3>Background Colors</h3>
          <div className="color-grid">
            {[
              { name: 'bg-primary', value: '#0a0a0a', var: '--bg-primary' },
              { name: 'bg-secondary', value: '#141414', var: '--bg-secondary' },
              { name: 'bg-tertiary', value: '#1a1a1a', var: '--bg-tertiary' },
              { name: 'bg-elevated', value: '#222222', var: '--bg-elevated' },
              { name: 'bg-accent-light', value: '#f5f5f5', var: '--bg-accent-light' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Text Colors</h3>
          <div className="color-grid">
            {[
              { name: 'text-primary', value: '#f0f0f0', var: '--text-primary' },
              { name: 'text-secondary', value: '#d0d0d0', var: '--text-secondary' },
              { name: 'text-tertiary', value: '#b0b0b0', var: '--text-tertiary' },
              { name: 'text-inverse', value: '#0a0a0a', var: '--text-inverse' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Accent Colors</h3>
          <div className="color-grid">
            {[
              { name: 'accent-yellow', value: '#ccaa2f', var: '--accent-yellow' },
              { name: 'accent-blue', value: '#3f9cc6', var: '--accent-blue' },
              { name: 'accent-green', value: '#529954', var: '--accent-green' },
              { name: 'accent-purple', value: '#893895', var: '--accent-purple' },
              { name: 'accent-pink', value: '#bd3362', var: '--accent-pink' },
              { name: 'accent-orange', value: '#cc7a00', var: '--accent-orange' },
              { name: 'accent-red', value: '#c74240', var: '--accent-red' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Status Colors</h3>
          <div className="color-grid">
            {[
              { name: 'success', value: '#529954', var: '--success' },
              { name: 'warning', value: '#cc7a00', var: '--warning' },
              { name: 'error', value: '#c74240', var: '--error' },
              { name: 'info', value: '#3f9cc6', var: '--info' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </ExampleSection>

      {/* Typography Section */}
      <ExampleSection id="typography" title="Typography">
        <div className="panel">
          <h3>Headings</h3>
          <div className="typography-examples">
            <h1>Heading 1 - Extra Large</h1>
            <h2>Heading 2 - Large</h2>
            <h3>Heading 3 - Medium</h3>
            <h4>Heading 4 - Small with Light Background</h4>
            <h5>Heading 5 - Extra Small Uppercase</h5>
          </div>
        </div>

        <div className="panel">
          <h3>Body Text</h3>
          <div className="typography-examples">
            <p>This is regular paragraph text. It has a comfortable line height and readable size for body content.</p>
            <p className="lead">This is lead text - slightly larger and with more spacing for emphasis.</p>
            <p className="text-sm">This is small text for secondary information.</p>
            <small>This is even smaller text for fine print.</small>
          </div>
        </div>

        <div className="panel">
          <h3>Labels & Tags</h3>
          <div className="typography-examples">
            <div className="label">Label Text</div>
            <div className="tag">Tag Text</div>
          </div>
        </div>

        <div className="panel">
          <h3>Font Weights</h3>
          <div className="typography-examples">
            {[
              { weight: 'Light (300)', var: '--weight-light' },
              { weight: 'Regular (400)', var: '--weight-regular' },
              { weight: 'Medium (500)', var: '--weight-medium' },
              { weight: 'Semibold (600)', var: '--weight-semibold' },
              { weight: 'Bold (700)', var: '--weight-bold' },
              { weight: 'Extrabold (800)', var: '--weight-extrabold' },
            ].map((item) => (
              <p key={item.var} style={{ fontWeight: `var(${item.var})` }}>
                {item.weight}
              </p>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Font Sizes</h3>
          <div className="typography-examples">
            {[
              { size: 'Extra Small (12px)', var: '--text-xs' },
              { size: 'Small (14px)', var: '--text-sm' },
              { size: 'Base (16px)', var: '--text-base' },
              { size: 'Large (18px)', var: '--text-lg' },
              { size: 'Extra Large (20px)', var: '--text-xl' },
              { size: '2XL (24px)', var: '--text-2xl' },
              { size: '3XL (30px)', var: '--text-3xl' },
              { size: '4XL (36px)', var: '--text-4xl' },
            ].map((item) => (
              <p key={item.var} style={{ fontSize: `var(${item.var})` }}>
                {item.size}
              </p>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Monospace Font</h3>
          <div className="typography-examples">
            <p style={{ fontFamily: 'var(--font-mono)' }}>Code: const example = "monospace font";</p>
          </div>
        </div>
      </ExampleSection>

      {/* Spacing Section */}
      <ExampleSection id="spacing" title="Spacing System">
        <div className="panel">
          <h3>Spacing Scale</h3>
          <div className="flex flex-col gap-4">
            {[
              { name: 'space-1 (4px)', var: '--space-1' },
              { name: 'space-2 (8px)', var: '--space-2' },
              { name: 'space-4 (16px)', var: '--space-4' },
              { name: 'space-6 (24px)', var: '--space-6' },
              { name: 'space-8 (32px)', var: '--space-8' },
              { name: 'space-12 (48px)', var: '--space-12' },
            ].map((spacing) => (
              <div key={spacing.var} className="flex items-center gap-4">
                <div className="spacing-demo-bar" style={{ width: `var(${spacing.var})` }} />
                <span className="label">{spacing.name}</span>
              </div>
            ))}
          </div>
        </div>
      </ExampleSection>

      {/* Borders Section */}
      <ExampleSection id="borders" title="Borders">
        <div className="panel">
          <h3>Border Widths</h3>
          <div className="flex flex-col gap-4">
            {[
              { name: 'Thin Border (1px)', var: '--border-thin' },
              { name: 'Medium Border (2px)', var: '--border-medium' },
              { name: 'Thick Border (3px)', var: '--border-thick' },
              { name: 'Extra Thick Border (4px)', var: '--border-extra-thick' },
            ].map((border) => (
              <div
                key={border.var}
                className="border-demo"
                style={{ borderWidth: `var(${border.var})` }}
              >
                {border.name}
              </div>
            ))}
          </div>
        </div>
      </ExampleSection>

      {/* Shadows and Glows Section */}
      <ExampleSection id="shadows" title="Shadows and Glows">
        <div className="panel">
          <h3>Sharp Shadows & Elevation</h3>
          <p className="text-sm">The main way to show shadows and elevation in the design system.</p>
          <div className="shadow-demo-grid">
            {[
              { name: 'Small Shadow', var: '--shadow-sm' },
              { name: 'Medium Shadow', var: '--shadow-md' },
              { name: 'Large Shadow', var: '--shadow-lg' },
              { name: 'Extra Large Shadow', var: '--shadow-xl' },
            ].map((shadow) => (
              <div key={shadow.var} className="shadow-demo" style={{ boxShadow: `var(${shadow.var})` }}>
                <div className="shadow-label">{shadow.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Soft Shadows</h3>
          <p className="text-sm">Extremely subtle blurred shadows for rare decorative use.</p>
          <div className="shadow-demo-grid">
            {[
              { name: 'Soft Small', var: '--shadow-soft-sm' },
              { name: 'Soft Medium', var: '--shadow-soft-md' },
              { name: 'Soft Large', var: '--shadow-soft-lg' },
            ].map((shadow) => (
              <div key={shadow.var} className="shadow-demo" style={{ boxShadow: `var(${shadow.var})` }}>
                <div className="shadow-label">{shadow.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Glows</h3>
          <p className="text-sm">Subtle glow effects with white or accent colors at 0.2 opacity.</p>
          <div className="shadow-demo-grid">
            {[
              { name: 'White Glow', var: '--glow-white' },
              { name: 'Yellow Glow', var: '--glow-yellow' },
              { name: 'Blue Glow', var: '--glow-blue' },
              { name: 'Green Glow', var: '--glow-green' },
              { name: 'Purple Glow', var: '--glow-purple' },
              { name: 'Pink Glow', var: '--glow-pink' },
              { name: 'Orange Glow', var: '--glow-orange' },
              { name: 'Red Glow', var: '--glow-red' },
            ].map((glow) => (
              <div
                key={glow.var}
                className="shadow-demo"
                style={{
                  boxShadow: `var(${glow.var})`,
                  background: 'var(--bg-tertiary)',
                }}
              >
                <div className="shadow-label">{glow.name}</div>
              </div>
            ))}
          </div>
        </div>
      </ExampleSection>

      {/* Iconography Section */}
      <ExampleSection id="iconography" title="Iconography">
        <div className="panel">
          <h3>Icon Sizes</h3>
          <p className="text-sm">Line-based icons from Lucide (same library used in React components: lucide-react).</p>
          <div className="flex flex-col gap-4">
            {[
              { name: 'XS (12px)', size: 12 },
              { name: 'SM (16px)', size: 16 },
              { name: 'MD (24px)', size: 24 },
              { name: 'LG (32px)', size: 32 },
              { name: 'XL (40px)', size: 40 },
              { name: '2XL (48px)', size: 48 },
            ].map((icon) => (
              <div key={icon.size} className="flex items-center gap-4">
                <span className="label">{icon.name}</span>
                <Clock size={icon.size} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Common Icons</h3>
          <p className="text-sm">Icons used in the Memoriae application from Lucide icon library.</p>
          <div className="icon-grid">
            {[
              { icon: FileText, name: 'FileText' },
              { icon: Clock, name: 'Clock' },
              { icon: TagsIcon, name: 'Tags' },
              { icon: Settings, name: 'Settings' },
              { icon: Search, name: 'Search' },
              { icon: Plus, name: 'Plus' },
              { icon: X, name: 'X' },
              { icon: CheckCircle, name: 'CheckCircle' },
              { icon: AlertTriangle, name: 'AlertTriangle' },
              { icon: XCircle, name: 'XCircle' },
              { icon: Info, name: 'Info' },
            ].map((item) => (
              <div key={item.name} className="icon-showcase">
                <item.icon size={24} />
                <span className="icon-label">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </ExampleSection>
    </div>
  );
}

