<!-- 4fa6e8d3-2532-4737-bee0-07fcf796dc67 172c7382-0ae3-420d-a9ff-842d64c83ec9 -->
# Theme CSS Refactoring Plan

## Overview

Refactor the theme.css file to implement a property-driven architecture where each control has specific named CSS custom properties that can be customized. Split the monolithic theme.css into modular files organized by domain.

## Goals

1. Create named properties for each control (e.g., `--toggle-track-color-disabled`, `--toggle-handle-color-checked`)
2. Default properties should reference other theme properties or be calculated from them
3. Split controls into separate files (theme.toggle.css, theme.button.css, etc.)
4. Separate animations into theme.animation.css
5. Separate shadows/glows into theme.shadows.css
6. Separate typography into theme.typography.css
7. Separate colors into theme.colors.css
8. Separate spacing, border widths, and radii into theme.sizes.css
9. Group shared interactive properties into theme.props.css
10. Define domain-specific properties within their relevant CSS files

## File Structure

### New File Organization

```
frontend/src/styles/
├── theme.css              # Main entry point (imports all modules)
├── theme.colors.css       # Color palette (backgrounds, text, accents, status, borders)
├── theme.sizes.css        # Spacing system, border widths, border radii
├── theme.props.css        # Shared properties (interactive states, transitions)
├── theme.typography.css    # Typography styles and properties
├── theme.shadows.css      # Shadow definitions and properties
├── theme.animation.css    # Animation keyframes and properties
├── theme.button.css       # Button controls and properties
├── theme.panel.css        # Panel controls and properties
├── theme.input.css        # Input/textarea controls and properties
├── theme.select.css       # Select dropdown controls and properties
├── theme.checkbox.css     # Checkbox controls and properties
├── theme.radio.css        # Radio button controls and properties
├── theme.toggle.css       # Toggle switch controls and properties
├── theme.slider.css       # Slider/range controls and properties
├── theme.progress.css     # Progress bar controls and properties
├── theme.notification.css # Notification controls and properties
├── theme.toast.css        # Toast controls and properties
├── theme.dialog.css       # Dialog/modal controls and properties
├── theme.drawer.css       # Drawer/sidebar controls and properties
├── theme.tabs.css         # Tabs controls and properties
├── theme.tag.css          # Tag controls and properties
├── theme.badge.css        # Badge controls and properties
└── theme.layout.css       # Layout utilities (containers, grid, flex)
```

## Implementation Strategy

### Phase 1: Extract Shared Properties

- Create `theme.colors.css` with:
  - Color palette (backgrounds, text, accents, status, borders)
- Create `theme.sizes.css` with:
  - Spacing system
  - Border widths
  - Border radii
- Create `theme.props.css` with:
  - Interactive states (hover, focus, active, disabled)
  - Transitions

### Phase 2: Extract Domain-Specific Files

- Extract typography, shadows, animations, and all control-specific files
- Each file defines its own properties with defaults to theme.colors.css, theme.sizes.css, or theme.props.css

### Phase 3: Default Property Values

- Each control's properties should default to theme properties from `theme.colors.css`, `theme.sizes.css`, or `theme.props.css`
- Example: `--toggle-track-color-unchecked: var(--bg-secondary);` (from theme.colors.css)
- Example: `--toggle-border-thickness: var(--border-thick);` (from theme.sizes.css)

### Phase 4: Update Main theme.css

- Convert to an import-only file with @import statements for all modules
- Import order: colors, sizes, props, then all other modules

## Property Naming Convention

- Pattern: `--{control}-{element}-{property}-{state}`
- Examples: `--toggle-track-color-checked`, `--button-primary-bg-hover`

## Documentation Requirements

Each control file should include a comment block listing all customizable properties.

## Migration Notes

- All existing functionality must be preserved
- No visual changes should occur after refactoring
- Maintain backward compatibility with existing class names
- Update imports in main.tsx and App.tsx if needed

### To-dos

- [x] Extract color palette to theme.colors.css (backgrounds, text, accents, status, borders)
- [x] Extract spacing and sizes to theme.sizes.css (spacing system, border widths, border radii)
- [x] Extract shared properties to theme.props.css (interactive states, transitions)
- [x] Extract typography to theme.typography.css with all font styles and properties
- [x] Extract shadows to theme.shadows.css with elevation and glow shadow definitions
- [x] Extract animations to theme.animation.css with all keyframes and animation properties
- [x] Extract button controls to theme.button.css with all button variants and properties
- [x] Extract panel controls to theme.panel.css with panel variants and properties
- [x] Extract input/textarea controls to theme.input.css with all input properties and states
- [x] Extract select dropdown controls to theme.select.css with select properties
- [x] Extract checkbox controls to theme.checkbox.css with checkbox properties and states
- [x] Extract radio button controls to theme.radio.css with radio properties and states
- [x] Extract toggle switch controls to theme.toggle.css with all toggle properties (track, handle, states)
- [ ] Extract slider/range controls to theme.slider.css with slider properties and webkit/moz pseudo-elements
- [ ] Extract progress bar controls to theme.progress.css with progress properties and variants
- [ ] Extract notification controls to theme.notification.css with notification variants and properties
- [ ] Extract toast controls to theme.toast.css with toast variants and properties
- [ ] Extract dialog/modal controls to theme.dialog.css with dialog properties and animations
- [ ] Extract drawer/sidebar controls to theme.drawer.css with drawer variants and properties
- [ ] Extract tabs controls to theme.tabs.css with tabs properties and active states
- [ ] Extract tag controls to theme.tag.css with tag variants and properties
- [ ] Extract badge controls to theme.badge.css with badge variants and properties
- [ ] Extract layout utilities to theme.layout.css (containers, grid, flexbox)
- [ ] Update main theme.css to import-only file with @import statements (colors, sizes, props first, then others)
- [ ] Verify all controls maintain visual appearance, properties have defaults, and imports work correctly