# Memoriae Theme - Standalone Reusable Theme

This directory contains a complete, standalone theme system that can be copied to any project.

## Files

- **`theme.css`** - Complete reusable theme with all CSS variables, components, and utilities
- **`index.html`** - Style guide showcase page (for reference)
- **`index.css`** - Showcase-specific styles (NOT part of the theme)
- **`THEME.md`** - This file

## Using the Theme in Another Project

### Step 1: Copy theme.css

Copy `theme.css` to your project:

```bash
cp frontend/style-guide/theme.css /path/to/your/project/styles/theme.css
```

### Step 2: Link in HTML

Add the theme to your HTML:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Project</title>
  <link rel="stylesheet" href="styles/theme.css">
</head>
<body>
  <!-- Your content -->
</body>
</html>
```

### Step 3: Use Theme Classes and Variables

Now you can use all theme components:

```html
<!-- Buttons -->
<button class="btn-primary">Primary Button</button>
<button class="btn-secondary">Secondary Button</button>

<!-- Panels -->
<div class="panel">Panel content</div>
<div class="panel-elevated">Elevated panel</div>

<!-- Inputs -->
<input type="text" class="input" placeholder="Enter text...">
<textarea class="textarea" placeholder="Enter text..."></textarea>
<select class="select">
  <option>Option 1</option>
</select>

<!-- Form Controls -->
<input type="checkbox" class="checkbox">
<input type="radio" class="radio" name="radio">
<input type="checkbox" class="toggle">

<!-- Progress Bars -->
<div class="progress-bar">
  <div class="progress-bar-fill" style="width: 50%;"></div>
</div>

<!-- Tabs -->
<div class="tabs">
  <button class="tab-item active">Tab 1</button>
  <button class="tab-item">Tab 2</button>
</div>

<!-- Tags -->
<div class="tag-list">
  <span class="tag-item">Tag</span>
  <span class="tag-item active">Active Tag</span>
</div>

<!-- Badges -->
<span class="badge badge-primary">Primary</span>
<span class="badge badge-success">Success</span>
```

## CSS Variables

All design tokens are available as CSS custom properties:

```css
/* Colors */
background: var(--bg-primary);
color: var(--text-primary);
border-color: var(--accent-yellow);

/* Spacing */
padding: var(--space-4);
margin: var(--space-6);
gap: var(--space-8);

/* Typography */
font-size: var(--text-lg);
font-weight: var(--weight-bold);

/* Borders */
border-width: var(--border-thick);
border-radius: var(--radius-md);

/* Shadows */
box-shadow: var(--shadow-md);
box-shadow: var(--shadow-glow-yellow);
```

## Layout Utilities

```html
<!-- Containers -->
<div class="container">Max width 1200px</div>
<div class="container-wide">Max width 1400px</div>
<div class="container-narrow">Max width 800px</div>

<!-- Grid -->
<div class="grid grid-2">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Flexbox -->
<div class="flex items-center justify-between gap-4">
  <div>Left</div>
  <div>Right</div>
</div>
```

## Animations

```html
<div class="slide-up">Slides up</div>
<div class="fade-in">Fades in</div>
<div class="bounce-subtle">Bounces</div>
<div class="pulse-glow">Pulses</div>
```

## Responsive Design

The theme is mobile-first with breakpoints at:
- **Tablet**: 768px+
- **Desktop**: 1024px+

All components automatically adapt.

## Accessibility

- Focus states with visible outlines
- Reduced motion support (respects `prefers-reduced-motion`)
- WCAG AA contrast ratios
- Proper semantic HTML support

## Customization

To customize the theme, modify CSS custom properties in `:root`:

```css
:root {
  --accent-yellow: #your-color;
  --bg-primary: #your-bg-color;
  /* ... etc */
}
```

## Complete Component List

- Buttons: `.btn-primary`, `.btn-secondary`, `.btn-ghost`
- Panels: `.panel`, `.panel-elevated`, `.panel-accent`, `.panel-header-light`
- Inputs: `.input`, `.textarea`, `.select`
- Form Controls: `.checkbox`, `.radio`, `.toggle`
- Sliders: `.slider`
- Progress Bars: `.progress-bar`, `.progress-bar-fill`
- Tabs: `.tabs`, `.tab-item`
- Tags: `.tag-list`, `.tag-item`
- Badges: `.badge`, `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-error`
- Typography: `h1-h5`, `.lead`, `.text-sm`, `.label`, `.tag`
- Layout: `.container`, `.grid`, `.flex`, utility classes

## Browser Support

Modern browsers that support:
- CSS Custom Properties (CSS Variables)
- CSS Grid
- Flexbox

## License

This theme is part of the Memoriae project and follows the same license terms.

