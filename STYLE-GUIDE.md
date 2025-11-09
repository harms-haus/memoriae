# Memoriae Style Guide

A comprehensive design system guide for the Memoriae application, built on the Mother Theme foundation.

## Table of Contents

1. [Design Philosophy](#design-philosophy)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Spacing & Layout](#spacing--layout)
5. [Components](#components)
6. [Animations & Interactions](#animations--interactions)
7. [Shadows & Effects](#shadows--effects)
8. [Responsive Design](#responsive-design)
9. [Accessibility](#accessibility)
10. [Usage Examples](#usage-examples)

## Design Philosophy

Memoriae's design system is built on principles of **playfulness**, **clarity**, and **accessibility**. Inspired by MotherDuck's caring aesthetic, the design balances vibrant colors with high contrast for readability.

### Core Principles

1. **Dark Mode First** - The entire system is designed for dark backgrounds with vibrant accents
2. **High Contrast** - Text and interactive elements maintain WCAG AA contrast ratios
3. **Sharp Shadows** - Distinctive sharp, offset shadows create depth without blur
4. **Vibrant Accents** - Yellow, blue, green, purple, and pink accents add personality
5. **Accessibility First** - Keyboard navigation, focus states, and reduced motion support
6. **Mobile-First** - Responsive design starting from 320px viewport width

### Visual Language

- **Bold & Playful**: Uppercase buttons, thick borders, vibrant colors
- **Clean & Modern**: Sharp corners (no border radius by default), structured layouts
- **Caring & Approachable**: Warm yellow accents, smooth animations, clear feedback

## Color System

### Background Colors

The color system uses a dark palette with subtle elevation:

```css
--bg-primary: #0a0a0a;        /* Deepest black - main background */
--bg-secondary: #141414;      /* Slightly lighter - panels, cards */
--bg-tertiary: #1a1a1a;       /* Elevated surfaces */
--bg-elevated: #222222;       /* Highest elevation */
--bg-accent-light: #f5f5f5;   /* Light background for headers */
--bg-accent-light-alt: #e8e8e8; /* Alternative light background */
```

**Usage:**
- `--bg-primary`: Main page background
- `--bg-secondary`: Default panel background (`.panel`)
- `--bg-tertiary`: Elevated panels (`.panel-elevated`)
- `--bg-accent-light`: Light header backgrounds (`.panel-header-light`)

### Text Colors

Text colors provide clear hierarchy:

```css
--text-primary: #f0f0f0;      /* Main text - highest contrast */
--text-secondary: #d0d0d0;    /* Secondary text - medium contrast */
--text-tertiary: #b0b0b0;     /* Tertiary text - lower contrast */
--text-inverse: #0a0a0a;      /* Text on light backgrounds */
```

**Usage:**
- `--text-primary`: Body text, headings, primary content
- `--text-secondary`: Labels, metadata, less important text
- `--text-tertiary`: Timestamps, hints, disabled states
- `--text-inverse`: Text on light backgrounds (yellow buttons, light headers)

### Accent Colors

Vibrant accent colors add personality and visual interest:

```css
--accent-yellow: #ffd43b;         /* Primary accent - playful, warm */
--accent-yellow-dark: #ffa500;    /* Darker yellow for hover states */
--accent-blue: #4fc3f7;           /* Secondary accent - calm, tech */
--accent-blue-dark: #29b6f6;      /* Darker blue for hover */
--accent-green: #66bb6a;          /* Success, growth */
--accent-green-dark: #43a047;     /* Darker green */
--accent-purple: #ab47bc;         /* Creative, unique */
--accent-purple-dark: #8e24aa;    /* Darker purple */
--accent-pink: #ec407a;           /* Playful, energetic */
--accent-orange: #ff9800;          /* Warm, attention-grabbing */
```

**Usage:**
- Yellow (`--accent-yellow`): Primary buttons, focus states, highlights
- Blue (`--accent-blue`): Links, secondary actions, information
- Green (`--accent-green`): Success states, positive actions
- Purple (`--accent-purple`): Creative features, special content
- Pink (`--accent-pink`): Playful elements, tags
- Orange (`--accent-orange`): Warnings, attention

### Status Colors

Semantic colors for feedback and status:

```css
--success: #66bb6a;    /* Success messages, positive feedback */
--warning: #ffa726;    /* Warnings, caution */
--error: #ef5350;      /* Errors, destructive actions */
--info: #42a5f5;       /* Informational messages */
```

### Border Colors

Borders create structure and hierarchy:

```css
--border-primary: #3a3a3a;        /* Default borders */
--border-secondary: #4a4a4a;      /* Elevated borders */
--border-accent: #6a6a6a;         /* Accent borders */
--border-vibrant: #ffd43b;        /* Vibrant yellow border */
--border-glow: rgba(255, 212, 59, 0.3); /* Glowing border effect */
```

## Typography

### Font Families

```css
--font-primary: 'Nunito', 'Quicksand', -apple-system, BlinkMacSystemFont, ...
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', ...
```

**Usage:**
- `--font-primary`: All UI text, body content, headings
- `--font-mono`: Code blocks, technical content, monospace needs

### Font Sizes

A clear size scale from 12px to 60px:

```css
--text-xs: 0.75rem;      /* 12px - Labels, small text */
--text-sm: 0.875rem;    /* 14px - Secondary text */
--text-base: 1rem;      /* 16px - Body text (default) */
--text-lg: 1.125rem;    /* 18px - Lead text */
--text-xl: 1.25rem;    /* 20px - Large text */
--text-2xl: 1.5rem;    /* 24px - h3 headings */
--text-3xl: 1.875rem;  /* 30px - Medium headings */
--text-4xl: 2.25rem;   /* 36px - h2 headings */
--text-5xl: 3rem;      /* 48px - h1 headings (mobile) */
--text-6xl: 3.75rem;   /* 60px - h1 headings (desktop) */
```

### Font Weights

```css
--weight-light: 300;
--weight-regular: 400;    /* Default body text */
--weight-medium: 500;     /* Buttons, tags */
--weight-semibold: 600;   /* Labels, emphasis */
--weight-bold: 700;        /* Headings, strong emphasis */
--weight-extrabold: 800;   /* h1 headings */
```

### Typography Styles

**Headings:**

```html
<h1>Main Heading</h1>        <!-- 48px/60px, extrabold -->
<h2>Section Heading</h2>      <!-- 36px, bold -->
<h3>Subsection</h3>           <!-- 24px, bold -->
<h4>Light Header</h4>         <!-- 18px, semibold, light bg -->
<h5>Small Heading</h5>        <!-- 16px, semibold, uppercase -->
```

**Body Text:**

```html
<p>Regular paragraph text</p>
<p class="lead">Lead paragraph - slightly larger</p>
<small class="text-sm">Small text for metadata</small>
```

**Labels & Tags:**

```html
<span class="label">UPPERCASE LABEL</span>
<span class="tag">Tag Text</span>
```

## Spacing & Layout

### Spacing Scale

Consistent spacing scale using rem units:

```css
--space-1: 0.25rem;   /* 4px - Tight spacing */
--space-2: 0.5rem;    /* 8px - Small gaps */
--space-3: 0.75rem;   /* 12px - Medium gaps */
--space-4: 1rem;      /* 16px - Standard spacing */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px - Panel padding */
--space-8: 2rem;      /* 32px - Large spacing */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

**Usage:**
- `--space-1` to `--space-3`: Tight spacing (icons, badges)
- `--space-4` to `--space-6`: Standard spacing (margins, padding)
- `--space-8` to `--space-12`: Large spacing (sections, containers)
- `--space-16` to `--space-24`: Extra large spacing (major sections)

### Border Widths

```css
--border-thin: 1px;           /* Subtle borders */
--border-medium: 2px;        /* Standard borders */
--border-thick: 3px;          /* Prominent borders (default) */
--border-extra-thick: 4px;   /* Extra prominent */
```

**Usage:**
- `--border-thick`: Default for buttons, panels, inputs
- `--border-medium`: Subtle elements, dividers
- `--border-thin`: Minimal borders

### Border Radius

**Note:** The design system uses sharp corners (0 radius) by default for a modern, structured look. Border radius is available but used sparingly:

```css
--radius-sm: 0;    /* Small radius (if needed) */
--radius-md: 0;    /* Medium radius (if needed) */
--radius-lg: 0;    /* Large radius (if needed) */
--radius-xl: 0;    /* Extra large radius (if needed) */
--radius-full: 0;  /* Full circle (if needed) */
```

### Containers

```css
.container { }              /* Max-width: 1200px */
.container-wide { }         /* Max-width: 1400px */
.container-narrow { }      /* Max-width: 800px */
```

**Usage:**
- `.container`: Standard content width
- `.container-wide`: Full-width layouts
- `.container-narrow`: Focused content (forms, articles)

### Grid System

```css
.grid { }                   /* Grid container */
.grid-2 { }                 /* 2 columns */
.grid-3 { }                 /* 3 columns */
.grid-4 { }                 /* 4 columns */
```

**Usage:**
```html
<div class="grid grid-3">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

### Flexbox Utilities

```css
.flex { }                   /* Display flex */
.flex-col { }               /* Flex column */
.items-center { }           /* Align items center */
.items-start { }            /* Align items start */
.items-end { }              /* Align items end */
.justify-center { }        /* Justify center */
.justify-between { }        /* Justify space-between */
.justify-start { }         /* Justify start */
.justify-end { }           /* Justify end */
.gap-1 { }                 /* Gap spacing-1 */
.gap-2 { }                 /* Gap spacing-2 */
.gap-3 { }                 /* Gap spacing-3 */
.gap-4 { }                 /* Gap spacing-4 */
.gap-6 { }                 /* Gap spacing-6 */
.gap-8 { }                 /* Gap spacing-8 */
```

## Components

### Buttons

Three button variants with distinct styles:

**Primary Button** (`.btn-primary`):
- Yellow background (`--accent-yellow`)
- Black text (`--text-inverse`)
- Thick black border
- Sharp shadow that increases on hover
- Uppercase text, bold weight
- Lifts up on hover (`translateY(-4px)`)

```html
<button class="btn-primary">Click Me</button>
```

**Secondary Button** (`.btn-secondary`):
- Transparent background
- White text (`--text-primary`)
- Gray border that turns yellow on hover
- No shadow
- Uppercase text, bold weight

```html
<button class="btn-secondary">Cancel</button>
```

**Ghost Button** (`.btn-ghost`):
- Transparent background
- Gray text (`--text-secondary`)
- Bottom border appears on hover (yellow)
- Smaller padding, medium weight
- Uppercase text

```html
<button class="btn-ghost">Learn More</button>
```

**Button with Icons:**
```html
<button class="btn-primary">
  <span class="button-icon-left button-icon-spaced">
    <Icon size={16} />
  </span>
  Text
</button>
```

**Disabled State:**
All buttons support `:disabled` state with reduced opacity and `not-allowed` cursor.

### Panels

Panels are the primary container component:

**Default Panel** (`.panel`):
- Dark background (`--bg-secondary`)
- Thick border (`--border-primary`)
- Standard padding (`--space-6`)
- Shadow for depth

```html
<div class="panel">
  <h3>Panel Title</h3>
  <p>Panel content</p>
</div>
```

**Elevated Panel** (`.panel-elevated`):
- Lighter background (`--bg-tertiary`)
- Stronger shadow
- More prominent border

```html
<div class="panel panel-elevated">
  Content
</div>
```

**Accent Panel** (`.panel-accent`):
- Yellow border accent
- Same background as default

```html
<div class="panel panel-accent">
  Highlighted content
</div>
```

**Panel with Light Header** (`.panel-header-light`):
```html
<div class="panel">
  <div class="panel-header-light">
    <h4>Header Text</h4>
  </div>
  <p>Content</p>
</div>
```

### Inputs

**Text Input** (`.input`):
- Dark background (`--bg-primary`)
- Thick border
- Yellow border on focus
- Focus ring for accessibility

```html
<input type="text" class="input" placeholder="Enter text" />
```

**Textarea** (`.textarea`):
- Same styling as input
- Minimum height: 120px
- Vertical resize enabled

```html
<textarea class="textarea" placeholder="Enter text"></textarea>
```

**Input with Icon:**
```html
<div class="input-container flex-center">
  <Icon class="input-icon" />
  <input class="input input-with-icon" />
</div>
```

### Tags

**Tag List** (`.tag-list`):
- Flex container with wrapping
- Gap spacing between tags

**Tag Item** (`.tag-item`):
- Transparent background
- Underline on hover
- Yellow color on hover
- Active state with yellow background

```html
<div class="tag-list">
  <a href="#" class="tag-item">Tag 1</a>
  <a href="#" class="tag-item active">Tag 2</a>
  <span class="tag-item">Tag 3</span>
</div>
```

**Tag Colors:**
Tags can use custom colors via CSS variables:
```css
.tag-item {
  --tag-custom-color: var(--accent-blue);
}
```

### Badges

**Badge** (`.badge`):
- Small, compact indicators
- Various variants: `.badge-primary`, `.badge-success`, `.badge-warning`, `.badge-error`

```html
<span class="badge badge-primary">New</span>
<span class="badge badge-success">Active</span>
```

### Form Controls

**Checkbox** (`.checkbox`):
- Custom styled checkbox
- Label wrapping support
- Focus states

**Radio** (`.radio`):
- Custom styled radio buttons
- Group management

**Toggle** (`.toggle`):
- Switch-style toggle
- Animated transitions

**Slider** (`.slider`):
- Range slider with value display
- Custom track and handle styling

## Animations & Interactions

### Animation Keyframes

**Bounce Subtle:**
```css
.bounce-subtle { }           /* Single bounce animation */
.bounce-subtle-continuous { } /* Continuous bouncing */
```

**Pulse Glow:**
```css
.pulse-glow { }              /* Single pulse */
.pulse-glow-continuous { }   /* Continuous pulsing */
```

**Slide Up:**
```css
.slide-up { }                /* Slide up from bottom */
```

**Fade In:**
```css
.fade-in { }                 /* Fade in */
```

**Shake:**
```css
.shake { }                   /* Single shake */
.shake-continuous { }        /* Continuous shaking */
```

**Grow:**
```css
.grow { }                    /* Single grow */
.grow-continuous { }         /* Continuous growing */
```

### Hover Effects

**Raise Hover:**
```css
.raise-hover { }             /* Lifts up on hover */
```

**Grow Hover:**
```css
.grow-hover { }              /* Scales up on hover */
```

### Transitions

```css
--transition-base: all 0.2s ease;
--transition-hover: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
--transition-active: all 0.1s ease;
```

### Interactive States

```css
--hover-overlay: rgba(255, 255, 255, 0.05);
--hover-border: #ffd43b;
--hover-bg: rgba(255, 212, 59, 0.1);
--focus-ring: rgba(255, 212, 59, 0.4);
--focus-border: #ffd43b;
--active-bg: rgba(255, 212, 59, 0.15);
--disabled-text: #666666;
--disabled-bg: #1a1a1a;
--disabled-border: #2a2a2a;
```

## Shadows & Effects

### Elevation Shadows

Sharp, offset shadows (no blur) for depth:

```css
--shadow-sm: 2px 2px 0 rgba(0, 0, 0, 0.3);
--shadow-md: 4px 4px 0 rgba(0, 0, 0, 0.4);
--shadow-lg: 8px 8px 0 rgba(0, 0, 0, 0.5);
--shadow-xl: 16px 16px 0 rgba(0, 0, 0, 0.6);
```

**Usage:**
- `--shadow-sm`: Subtle elevation
- `--shadow-md`: Default panels, buttons
- `--shadow-lg`: Elevated panels
- `--shadow-xl`: Modals, dialogs

### Soft Shadows

Rare decorative shadows with blur:

```css
--shadow-soft-sm: 2px 2px 8px rgba(0, 0, 0, 0.15);
--shadow-soft-md: 4px 4px 16px rgba(0, 0, 0, 0.2);
--shadow-soft-lg: 8px 8px 24px rgba(0, 0, 0, 0.25);
```

### Glow Effects

Colored glow shadows for special effects:

```css
--shadow-glow-yellow: 0 0 20px rgba(255, 212, 59, 0.3);
--shadow-glow-blue: 0 0 20px rgba(79, 195, 247, 0.3);
--shadow-glow-green: 0 0 20px rgba(102, 187, 106, 0.3);
--glow-yellow: 0 0 0px rgba(255, 212, 59, 0.6), 0 0 15px rgba(255, 212, 59, 0.2);
--glow-blue: 0 0 0px rgba(79, 195, 247, 0.6), 0 0 15px rgba(79, 195, 247, 0.2);
/* ... more glow colors ... */
```

## Responsive Design

### Breakpoints

**Mobile First Approach:**
- **Base (Mobile)**: 320px+ - Default styles
- **Tablet**: 768px+ - Increased padding, grid gaps
- **Desktop**: 1024px+ - Further increased padding

### Responsive Utilities

**Container Padding:**
```css
/* Mobile: --container-padding (--space-4) */
/* Tablet: --container-padding-tablet (--space-6) */
/* Desktop: --container-padding-desktop (--space-8) */
```

**Grid Gaps:**
```css
/* Mobile: --grid-gap (--space-6) */
/* Tablet: --grid-gap-tablet (--space-8) */
/* Desktop: --grid-gap-desktop (--space-10) */
```

**Typography:**
- Headings scale up on tablet/desktop
- h1: 48px (mobile) → 60px (tablet+)

### Media Queries

```css
/* Tablet: 768px+ */
@media (min-width: 768px) {
  /* Tablet styles */
}

/* Desktop: 1024px+ */
@media (min-width: 1024px) {
  /* Desktop styles */
}
```

## Accessibility

### Focus States

All interactive elements have visible focus states:

```css
:focus-visible {
  outline: var(--border-thick) solid var(--focus-ring);
  outline-offset: 2px;
}
```

**Focus Ring Color:**
- Yellow (`--focus-ring: rgba(255, 212, 59, 0.4)`)
- High contrast for visibility
- Thick outline (3px)

### Reduced Motion

The design system respects `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Keyboard Navigation

- All interactive elements are keyboard accessible
- Focus order follows visual hierarchy
- Tab navigation supported throughout

### Color Contrast

- Text colors maintain WCAG AA contrast ratios
- Status colors are distinguishable
- Focus states are clearly visible

### ARIA Attributes

Components include proper ARIA attributes:
- `aria-label` for icon-only buttons
- `aria-disabled` for disabled states
- `aria-busy` for loading states
- `role` attributes where appropriate

## Usage Examples

### Complete Component Example

```html
<div class="container">
  <div class="panel panel-elevated">
    <div class="panel-header-light">
      <h4>Create New Memory</h4>
    </div>
    
    <form class="flex flex-col gap-4">
      <div class="input-container">
        <input 
          type="text" 
          class="input" 
          placeholder="Memory title"
          aria-label="Memory title"
        />
      </div>
      
      <textarea 
        class="textarea" 
        placeholder="Write your memory..."
        aria-label="Memory content"
      ></textarea>
      
      <div class="tag-list">
        <span class="tag-item">work</span>
        <span class="tag-item active">personal</span>
        <span class="tag-item">ideas</span>
      </div>
      
      <div class="flex justify-between items-center">
        <button class="btn-secondary" type="button">
          Cancel
        </button>
        <button class="btn-primary" type="submit">
          Save Memory
        </button>
      </div>
    </form>
  </div>
</div>
```

### Card Layout Example

```html
<div class="container">
  <div class="grid grid-3">
    <div class="panel">
      <h3>Card Title</h3>
      <p class="text-secondary">Card content</p>
      <div class="tag-list">
        <span class="tag-item">tag1</span>
        <span class="tag-item">tag2</span>
      </div>
    </div>
    
    <div class="panel panel-elevated">
      <h3>Elevated Card</h3>
      <p>More prominent card</p>
    </div>
    
    <div class="panel panel-accent">
      <h3>Accent Card</h3>
      <p>Highlighted card</p>
    </div>
  </div>
</div>
```

### Form Example

```html
<form class="panel container-narrow">
  <h2>Settings</h2>
  
  <div class="flex flex-col gap-6">
    <div>
      <label class="label">Username</label>
      <input type="text" class="input" />
    </div>
    
    <div>
      <label class="label">Email</label>
      <input type="email" class="input" />
    </div>
    
    <div class="flex items-center gap-2">
      <input type="checkbox" class="checkbox" id="notifications" />
      <label for="notifications">Enable notifications</label>
    </div>
    
    <div class="flex justify-end gap-4">
      <button class="btn-secondary" type="button">Cancel</button>
      <button class="btn-primary" type="submit">Save</button>
    </div>
  </div>
</form>
```

### Animation Example

```html
<!-- Fade in on load -->
<div class="fade-in">
  <h1>Welcome</h1>
</div>

<!-- Slide up animation -->
<div class="slide-up">
  <p>Content slides up</p>
</div>

<!-- Hover effects -->
<button class="btn-primary raise-hover">
  Hover to lift
</button>

<div class="grow-hover">
  <img src="..." alt="Grows on hover" />
</div>
```

### Responsive Example

```html
<div class="container">
  <!-- Mobile: single column -->
  <!-- Tablet: 2 columns -->
  <!-- Desktop: 3 columns -->
  <div class="grid grid-2 grid-3">
    <div class="panel">Item 1</div>
    <div class="panel">Item 2</div>
    <div class="panel">Item 3</div>
  </div>
</div>
```

## Best Practices

### Do's

✅ **Use theme variables** - Always use CSS custom properties instead of hardcoded values
✅ **Follow spacing scale** - Use `--space-*` variables for consistent spacing
✅ **Use component classes** - Leverage `.panel`, `.btn-primary`, etc. instead of custom CSS
✅ **Maintain contrast** - Ensure text meets WCAG AA contrast ratios
✅ **Test keyboard navigation** - Verify all interactive elements are keyboard accessible
✅ **Use semantic HTML** - Use proper HTML elements (`<button>`, `<nav>`, etc.)
✅ **Mobile-first** - Design for mobile, then enhance for larger screens

### Don'ts

❌ **Don't hardcode colors** - Always use `var(--color-name)` instead of hex values
❌ **Don't skip focus states** - All interactive elements need visible focus
❌ **Don't use arbitrary spacing** - Stick to the spacing scale
❌ **Don't override component styles** - Extend components, don't replace them
❌ **Don't ignore reduced motion** - Animations should respect user preferences
❌ **Don't use inline styles** - Use CSS classes and variables instead
❌ **Don't break the grid** - Use the grid system for layouts

## Implementation

### Importing the Theme

The complete theme is available in `mother-theme/src/styles/theme.css`:

```typescript
// In your component or main CSS file
import '@mother/styles/theme.css';
```

### Using CSS Variables

```css
.my-component {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: var(--border-thick) solid var(--border-primary);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
}
```

### Extending Components

```css
.my-custom-button {
  /* Extend btn-primary */
  composes: btn-primary;
  
  /* Add custom properties */
  --button-primary-bg: var(--accent-blue);
  --button-primary-color: var(--text-primary);
}
```

## Resources

- **Theme CSS**: `mother-theme/src/styles/theme.css`
- **Component Library**: `mother-theme/src/components/`
- **AGENTS.md**: Development patterns and conventions
- **README.md**: Project overview and setup

---

**Remember**: This style guide is a living document. As the design system evolves, this guide will be updated to reflect changes and new patterns.

