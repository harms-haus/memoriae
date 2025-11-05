# Style Guide - Dark Mode Edition
*Inspired by MotherDuck's playful and caring design aesthetic*

---

## ⚠️ Important Note

**The complete style system implementation is in `mother-theme/src/styles/theme.css`**. This document provides design philosophy, usage examples, and references to the CSS file. All custom properties, component classes, animations, and utilities are defined in `theme.css`.

---

## Design Philosophy

This style guide captures the playful, caring, and high-contrast aesthetic of MotherDuck while adapting it for a dark mode environment. The design emphasizes:
- **Bold outlines** and blocky shapes
- **Vibrant, high-contrast colors** that pop against dark backgrounds
- **Light animations** that feel playful, not distracting
- **Line-based illustrations** with geometric simplicity
- **Accessibility** through high contrast and clear visual hierarchy

---

## Color Palette

All colors are defined as CSS custom properties in `theme.css`:

### Background Colors
- `--bg-primary`: Deep charcoal - main background
- `--bg-secondary`: Slightly lighter for panels
- `--bg-tertiary`: Even lighter for elevated panels
- `--bg-elevated`: For floating elements
- `--bg-accent-light`: Light background for dark mode headers
- `--bg-accent-light-alt`: Alternative light accent

### Foreground Colors
- `--text-primary`: Primary text - high contrast
- `--text-secondary`: Secondary text
- `--text-tertiary`: Tertiary/muted text
- `--text-inverse`: Text on light backgrounds

### Accent Colors - Vibrant & Playful
- `--accent-yellow`: Bright, cheerful yellow (primary accent)
- `--accent-yellow-dark`: Darker yellow variant
- `--accent-blue`: Sky blue
- `--accent-blue-dark`: Deeper blue
- `--accent-green`: Fresh green
- `--accent-green-dark`: Deeper green
- `--accent-purple`: Playful purple
- `--accent-purple-dark`: Deeper purple
- `--accent-pink`: Warm pink
- `--accent-orange`: Vibrant orange

### Status Colors
- `--success`: Green for success states
- `--warning`: Orange for warnings
- `--error`: Red for errors
- `--info`: Blue for information

### Border Colors
- `--border-primary`: Primary border color
- `--border-secondary`: Secondary border
- `--border-accent`: Accent borders
- `--border-vibrant`: Bright yellow for highlights
- `--border-glow`: Subtle glow effect

### Interactive States
- `--hover-overlay`: Hover overlay effect
- `--hover-border`: Hover border color
- `--hover-bg`: Hover background
- `--focus-ring`: Focus ring color (accessibility)
- `--focus-border`: Focus border color
- `--active-bg`: Active state background
- `--disabled-text`, `--disabled-bg`, `--disabled-border`: Disabled states

**Reference**: See `theme.css` for complete color definitions.

---

## Typography

### Font Families (from `theme.css`)
- `--font-primary`: System font stack (sans-serif)
- `--font-mono`: Monospace font stack (for code/technical content)

### Font Sizes (from `theme.css`)
- `--text-xs` through `--text-6xl`: Complete size scale

### Font Weights (from `theme.css`)
- `--weight-light` through `--weight-extrabold`: Complete weight scale

### Typography Styles

All typography styles are implemented in `theme.css`:

- **Headings** (`h1`-`h5`): Pre-styled with uppercase transformation where appropriate
- **Body Text** (`p`, `.lead`, `small`, `.text-sm`): Pre-styled with appropriate line heights
- **Labels** (`.label`): Small, bold, uppercase
- **Tags** (`.tag`): Rounded, colorful, inline-block

**Reference**: See `theme.css` for complete typography styles.

---

## Components

All component classes are implemented in `theme.css`. Use these predefined classes:

### Buttons

- **`.btn-primary`**: Primary action button with yellow background
- **`.btn-secondary`**: Secondary button with transparent background and border
- **`.btn-ghost`**: Ghost button with minimal styling

All buttons support `:disabled`, `:hover`, `:focus`, and `:active` states.

### Panels & Cards

- **`.panel`**: Base panel with secondary background
- **`.panel-elevated`**: Elevated panel with tertiary background and stronger shadow
- **`.panel-accent`**: Panel with yellow accent border
- **`.panel-header-light`**: Light background header panel (for small headers)

### Input Fields

- **`.input`**: Text input field with dark background and border
- **`.textarea`**: Textarea with same styling, resizable vertically

Both support `:focus`, `:hover`, `:disabled`, and `::placeholder` states.

### Form Controls

- **`.checkbox`**: Custom-styled checkbox with yellow accent when checked
- **`.radio`**: Custom-styled radio button with yellow accent when selected

### Tag Lists

- **`.tag-list`**: Container for tags (flex, wrap)
- **`.tag-item`**: Individual tag item
- **`.tag-item.active`**: Active tag state
- **`.tag-item.tag-blue`**, **`.tag-item.tag-green`**, **`.tag-item.tag-purple`**, **`.tag-item.tag-pink`**: Color variants

### Badges

- **`.badge`**: Base badge style
- **`.badge-primary`**: Yellow badge
- **`.badge-success`**: Green badge
- **`.badge-warning`**: Orange badge
- **`.badge-error`**: Red badge

**Reference**: See `theme.css` for complete component implementations.

---

## Layout Patterns

### Containers (from `theme.css`)

- **`.container`**: Max-width 1200px, centered
- **`.container-wide`**: Max-width 1400px
- **`.container-narrow`**: Max-width 800px

### Grid System (from `theme.css`)

- **`.grid`**: Base grid with gap
- **`.grid-2`**, **`.grid-3`**, **`.grid-4`**: Column variants

### Flexbox Utilities (from `theme.css`)

- **`.flex`**: Display flex
- **`.flex-col`**: Flex column direction
- **`.items-center`**, **`.items-start`**, **`.items-end`**: Alignment
- **`.justify-center`**, **`.justify-between`**, **`.justify-start`**, **`.justify-end`**: Justification
- **`.gap-1`**, **`.gap-2`**, **`.gap-3`**, **`.gap-4`**, **`.gap-6`**, **`.gap-8`**: Gap utilities

**Reference**: See `theme.css` for complete layout utilities.

---

## Animations

All animations are defined in `theme.css`:

### Keyframe Animations
- `@keyframes bounce-subtle`: Subtle bounce effect
- `@keyframes pulse-glow`: Pulsing glow effect
- `@keyframes slide-up`: Slide up from bottom
- `@keyframes fade-in`: Fade in effect

### Animation Utility Classes
- **`.bounce-subtle`**: Apply subtle bounce animation
- **`.pulse-glow`**: Apply pulsing glow animation
- **`.slide-up`**: Apply slide-up animation (0.3s)
- **`.fade-in`**: Apply fade-in animation (0.4s)

### Transition Variables
- `--transition-base`: Standard transition (0.2s ease)
- `--transition-hover`: Hover transition (cubic-bezier)
- `--transition-active`: Active transition (0.1s ease)

**Reference**: See `theme.css` for complete animation definitions.

---

## Spacing System

All spacing values are defined in `theme.css` as `--space-1` through `--space-24`:
- `--space-1`: 0.25rem (4px)
- `--space-2`: 0.5rem (8px)
- `--space-4`: 1rem (16px)
- `--space-6`: 1.5rem (24px)
- `--space-8`: 2rem (32px)
- ... and more

**Reference**: See `theme.css` for complete spacing scale.

---

## Borders & Outlines

All border styles are defined in `theme.css`:

### Border Widths
- `--border-thin`: 1px
- `--border-medium`: 2px
- `--border-thick`: 3px
- `--border-extra-thick`: 4px

### Border Radius
- `--radius-sm`: 0.25rem (4px)
- `--radius-md`: 0.5rem (8px)
- `--radius-lg`: 0.75rem (12px)
- `--radius-xl`: 1rem (16px)
- `--radius-full`: 9999px (full circle/pill)

### Focus States
All interactive elements have accessible focus states using `:focus-visible` and `var(--focus-ring)`.

**Reference**: See `theme.css` for complete border definitions.

---

## Shadows

All shadow values are defined in `theme.css`:

### Elevation Shadows
- `--shadow-sm`: Small shadow
- `--shadow-md`: Medium shadow
- `--shadow-lg`: Large shadow
- `--shadow-xl`: Extra large shadow

### Colored Glow Shadows
- `--shadow-glow-yellow`: Yellow glow
- `--shadow-glow-blue`: Blue glow
- `--shadow-glow-green`: Green glow

**Reference**: See `theme.css` for complete shadow definitions.

---

## Responsive Design

Responsive breakpoints are defined in `theme.css`:

### Breakpoints
- **Mobile (Base)**: 320px+ - Default styles
- **Tablet**: `@media (min-width: 768px)` - Container padding and grid gaps increased
- **Desktop**: `@media (min-width: 1024px)` - Container padding further increased

### Approach
All components are **mobile-first**. Base styles target mobile, with enhancements at tablet and desktop breakpoints.

**Reference**: See `theme.css` for complete responsive styles.

---

## Accessibility

Accessibility features are built into `theme.css`:

### Focus States
- All interactive elements use `:focus-visible` with `var(--focus-ring)`
- Proper outline offset and border radius

### Reduced Motion
- `@media (prefers-reduced-motion: reduce)` disables animations for users who prefer reduced motion

### Color Contrast
- All color combinations meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)

### Disabled States
- All interactive elements support `:disabled` state with appropriate styling

**Reference**: See `theme.css` for complete accessibility implementations.

---

## Usage Examples

### Button Group

```html
<div class="flex gap-4">
  <button class="btn-primary">Save Memory</button>
  <button class="btn-secondary">Cancel</button>
  <button class="btn-ghost">View All</button>
</div>
```

### Panel with Light Header

```html
<div class="panel">
  <div class="panel-header-light">
    <h4>New Category</h4>
  </div>
  <p class="mt-4">Content goes here...</p>
</div>
```

### Tag List

```html
<div class="tag-list">
  <span class="tag-item tag-blue">Work</span>
  <span class="tag-item tag-green">Personal</span>
  <span class="tag-item tag-purple active">Ideas</span>
</div>
```

### Input Group

```html
<div class="flex flex-col gap-4">
  <label class="label">Memory Title</label>
  <input type="text" class="input" placeholder="Enter your memory...">
  <textarea class="textarea" placeholder="Add details..."></textarea>
</div>
```

### Animated Content

```html
<!-- Using utility classes -->
<div class="slide-up">Content that slides up</div>
<div class="fade-in">Content that fades in</div>

<!-- Or using CSS directly -->
<div style="animation: slide-up 0.3s ease-out;">Content</div>
```

### Responsive Grid

```html
<div class="container">
  <div class="grid grid-2">
    <div class="panel">Item 1</div>
    <div class="panel">Item 2</div>
  </div>
</div>
```

---

## Using Mother Theme Components

In addition to CSS classes and utilities, Mother Theme provides React components that implement the design system. These components are built on the theme CSS and provide type-safe, accessible implementations.

### Importing Components

```typescript
// Import individual components
import { Button } from '../../mother-theme/src/components/Button';
import { Panel } from '../../mother-theme/src/components/Panel';
import { Tag } from '../../mother-theme/src/components/Tag';
import { Badge } from '../../mother-theme/src/components/Badge';
import { Input, Textarea } from '../../mother-theme/src/components/Input';
import { Tabs, Tab, TabPanel } from '../../mother-theme/src/components/Tabs';
import { Dialog } from '../../mother-theme/src/components/Dialog';
import { Drawer } from '../../mother-theme/src/components/Drawer';
import { Toast } from '../../mother-theme/src/components/Toast';
import { Timeline, type TimelineItem } from '../../mother-theme/src/components/Timeline';
```

### Available Components

- **Button** - Primary, secondary, and ghost variants with loading states
- **Panel** - Container panels with elevation variants
- **Tag** - Tag components with color variants and click handlers
- **Badge** - Badge components for status indicators
- **Input** - Text inputs with validation states
- **Textarea** - Textarea inputs with same styling
- **Tabs** - Tab navigation with smooth animations
- **Dialog** - Modal dialogs with focus trapping
- **Drawer** - Slide-out panels
- **Toast** - Toast notifications with queue management
- **Timeline** - Timeline visualization component
- **Checkbox** - Checkbox with label wrapping
- **Radio** - Radio buttons with group management
- **Toggle** - Toggle switches
- **Progress** - Progress bars with variants
- **Slider** - Range sliders with value display

### Component Usage Example

```typescript
import { Button, Panel, Tag, Badge } from '../../mother-theme/src/components';

function MyComponent() {
  return (
    <Panel className="panel-elevated">
      <div className="flex gap-4">
        <Button variant="primary">Save</Button>
        <Button variant="secondary">Cancel</Button>
      </div>
      <div className="tag-list">
        <Tag color="blue">Work</Tag>
        <Tag color="green" active>Personal</Tag>
      </div>
      <Badge variant="success">Complete</Badge>
    </Panel>
  );
}
```

**Note**: All Mother Theme components use the CSS classes and custom properties from `theme.css`. They are fully integrated with the design system.

**Reference**: See `mother-theme/README.md` for complete component documentation.

---

## Implementation Notes

1. **CSS Custom Properties**: All design tokens are available as CSS custom properties in `theme.css` for easy theming and runtime updates.

2. **Dark Mode First**: This style guide assumes dark mode as the default. All colors are optimized for dark backgrounds with high contrast.

3. **Animations**: Keep animations subtle and purposeful. The `prefers-reduced-motion` media query in `theme.css` automatically disables animations for users who prefer reduced motion.

4. **Responsive Design**: All components are mobile-first and scale gracefully across breakpoints (320px → 768px → 1024px+).

5. **Browser Support**: Target modern browsers that support CSS custom properties and Grid/Flexbox.

6. **Import the Theme**: Always import the theme from `mother-theme` in your main application file:
   ```typescript
   import '../../mother-theme/src/styles/theme.css';
   ```
   
   Or if importing from the frontend root:
   ```typescript
   import '../mother-theme/src/styles/theme.css';
   ```

---

## Quick Reference

### Most Common CSS Variables

```css
/* Backgrounds */
--bg-primary, --bg-secondary, --bg-tertiary

/* Text */
--text-primary, --text-secondary, --text-inverse

/* Accents */
--accent-yellow, --accent-blue, --accent-green

/* Borders */
--border-primary, --border-thick, --radius-md

/* Spacing */
--space-4, --space-6, --space-8

/* Interactive */
--focus-ring, --hover-bg
```

### Most Common Component Classes

- `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- `.panel`, `.panel-elevated`, `.panel-accent`
- `.input`, `.textarea`
- `.tag-list`, `.tag-item`
- `.badge`, `.badge-primary`

### Most Common Utilities

- `.flex`, `.flex-col`, `.gap-4`
- `.container`, `.grid`, `.grid-2`
- `.slide-up`, `.fade-in`

**For complete reference, see `mother-theme/src/styles/theme.css`.**

---

## Inspiration Credits

Design aesthetic inspired by [MotherDuck](https://motherduck.com)'s playful and caring visual identity, adapted for dark mode with vibrant, high-contrast colors and bold geometric shapes.
