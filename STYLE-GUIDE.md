# Style Guide - Dark Mode Edition
*Inspired by MotherDuck's playful and caring design aesthetic*

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

### Background Colors
```css
/* Primary Backgrounds */
--bg-primary: #0a0a0a;          /* Deep charcoal - main background */
--bg-secondary: #141414;        /* Slightly lighter for panels */
--bg-tertiary: #1a1a1a;         /* Even lighter for elevated panels */
--bg-elevated: #222222;         /* For floating elements */

/* Light Background Accents (for small headers/badges) */
--bg-accent-light: #f5f5f5;     /* Light background for dark mode headers */
--bg-accent-light-alt: #e8e8e8; /* Alternative light accent */
```

### Foreground Colors
```css
/* Text Colors */
--text-primary: #f0f0f0;        /* Primary text - high contrast */
--text-secondary: #d0d0d0;      /* Secondary text */
--text-tertiary: #b0b0b0;       /* Tertiary/muted text */
--text-inverse: #0a0a0a;        /* Text on light backgrounds */

/* Accent Colors - Vibrant & Playful */
--accent-yellow: #ffd43b;       /* Bright, cheerful yellow */
--accent-yellow-dark: #ffa500;  /* Darker yellow variant */
--accent-blue: #4fc3f7;        /* Sky blue */
--accent-blue-dark: #29b6f6;    /* Deeper blue */
--accent-green: #66bb6a;       /* Fresh green */
--accent-green-dark: #43a047;   /* Deeper green */
--accent-purple: #ab47bc;      /* Playful purple */
--accent-purple-dark: #8e24aa;  /* Deeper purple */
--accent-pink: #ec407a;        /* Warm pink */
--accent-orange: #ff9800;       /* Vibrant orange */

/* Status Colors */
--success: #66bb6a;             /* Green for success states */
--warning: #ffa726;             /* Orange for warnings */
--error: #ef5350;               /* Red for errors */
--info: #42a5f5;                /* Blue for information */
```

### Border Colors
```css
/* Borders - Bold & Defined */
--border-primary: #3a3a3a;      /* Primary border color */
--border-secondary: #4a4a4a;    /* Secondary border */
--border-accent: #6a6a6a;       /* Accent borders */
--border-vibrant: #ffd43b;      /* Bright yellow for highlights */
--border-glow: rgba(255, 212, 59, 0.3); /* Subtle glow effect */
```

### Interactive States
```css
/* Hover States */
--hover-overlay: rgba(255, 255, 255, 0.05);
--hover-border: #ffd43b;
--hover-bg: rgba(255, 212, 59, 0.1);

/* Active/Focus States */
--focus-ring: rgba(255, 212, 59, 0.4);
--focus-border: #ffd43b;
--active-bg: rgba(255, 212, 59, 0.15);

/* Disabled States */
--disabled-text: #666666;
--disabled-bg: #1a1a1a;
--disabled-border: #2a2a2a;
```

---

## Typography

### Font Families
```css
/* Primary Font Stack */
--font-primary: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
                'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
                'Helvetica Neue', sans-serif;

/* Monospace Font (for code/technical content) */
--font-mono: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 
             'Consolas', 'Roboto Mono', monospace;
```

### Font Sizes
```css
/* Scale - Responsive Typography */
--text-xs: 0.75rem;      /* 12px */
--text-sm: 0.875rem;     /* 14px */
--text-base: 1rem;       /* 16px */
--text-lg: 1.125rem;     /* 18px */
--text-xl: 1.25rem;      /* 20px */
--text-2xl: 1.5rem;      /* 24px */
--text-3xl: 1.875rem;    /* 30px */
--text-4xl: 2.25rem;     /* 36px */
--text-5xl: 3rem;        /* 48px */
--text-6xl: 3.75rem;     /* 60px */
```

### Font Weights
```css
--weight-light: 300;
--weight-regular: 400;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
--weight-extrabold: 800;
```

### Typography Styles

#### Headings
```css
/* H1 - Hero/Page Titles */
h1 {
  font-size: var(--text-5xl);
  font-weight: var(--weight-extrabold);
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  text-transform: uppercase;
}

/* H2 - Section Titles */
h2 {
  font-size: var(--text-4xl);
  font-weight: var(--weight-bold);
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  text-transform: uppercase;
}

/* H3 - Subsection Titles */
h3 {
  font-size: var(--text-2xl);
  font-weight: var(--weight-bold);
  line-height: 1.3;
  color: var(--text-primary);
  text-transform: uppercase;
}

/* H4 - Small Headers (often with light background) */
h4 {
  font-size: var(--text-lg);
  font-weight: var(--weight-semibold);
  line-height: 1.4;
  color: var(--text-inverse); /* Dark text on light background */
  background: var(--bg-accent-light);
  padding: 0.5rem 1rem;
  display: inline-block;
  border: 2px solid var(--text-inverse);
}

/* H5 - Subheaders */
h5 {
  font-size: var(--text-base);
  font-weight: var(--weight-semibold);
  line-height: 1.5;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
```

#### Body Text
```css
/* Paragraphs */
p {
  font-size: var(--text-base);
  font-weight: var(--weight-regular);
  line-height: 1.6;
  color: var(--text-primary);
}

/* Lead Text (larger intro paragraphs) */
.lead {
  font-size: var(--text-lg);
  font-weight: var(--weight-regular);
  line-height: 1.7;
  color: var(--text-secondary);
}

/* Small Text */
small, .text-sm {
  font-size: var(--text-sm);
  color: var(--text-tertiary);
}
```

#### Labels & Tags
```css
/* Labels - Small, Bold, Uppercase */
.label {
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--text-secondary);
}

/* Tags - Rounded, Colorful */
.tag {
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  border: 2px solid currentColor;
  display: inline-block;
  background: transparent;
}
```

---

## Components

### Buttons

#### Primary Button
```css
.btn-primary {
  background: var(--accent-yellow);
  color: var(--text-inverse);
  border: 3px solid var(--text-inverse);
  padding: 0.875rem 1.75rem;
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 0 var(--text-inverse);
}

.btn-primary:hover {
  transform: translateY(2px);
  box-shadow: 0 2px 0 var(--text-inverse);
  background: var(--accent-yellow-dark);
}

.btn-primary:active {
  transform: translateY(4px);
  box-shadow: none;
}

.btn-primary:focus {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}
```

#### Secondary Button
```css
.btn-secondary {
  background: transparent;
  color: var(--text-primary);
  border: 3px solid var(--border-primary);
  padding: 0.875rem 1.75rem;
  font-size: var(--text-base);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-secondary:hover {
  border-color: var(--accent-yellow);
  color: var(--accent-yellow);
  background: var(--hover-bg);
}

.btn-secondary:focus {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}
```

#### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
  border: 2px solid transparent;
  padding: 0.75rem 1.5rem;
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-ghost:hover {
  color: var(--text-primary);
  border-bottom-color: var(--accent-yellow);
}
```

### Panels & Cards

#### Primary Panel
```css
.panel {
  background: var(--bg-secondary);
  border: 3px solid var(--border-primary);
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.panel-elevated {
  background: var(--bg-tertiary);
  border-color: var(--border-secondary);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.panel-accent {
  border-color: var(--accent-yellow);
  background: var(--bg-secondary);
}
```

#### Light Header Panel (for small headers)
```css
.panel-header-light {
  background: var(--bg-accent-light);
  border: 3px solid var(--text-inverse);
  border-radius: 0.25rem;
  padding: 0.5rem 1rem;
  display: inline-block;
}

.panel-header-light h4,
.panel-header-light p {
  color: var(--text-inverse);
  margin: 0;
}
```

### Input Fields

#### Text Input
```css
.input {
  background: var(--bg-primary);
  border: 3px solid var(--border-primary);
  border-radius: 0.25rem;
  padding: 0.75rem 1rem;
  font-size: var(--text-base);
  color: var(--text-primary);
  font-family: var(--font-primary);
  transition: all 0.2s ease;
  width: 100%;
}

.input:focus {
  outline: none;
  border-color: var(--accent-yellow);
  box-shadow: 0 0 0 3px var(--focus-ring);
}

.input:hover {
  border-color: var(--border-secondary);
}

.input::placeholder {
  color: var(--text-tertiary);
}
```

#### Textarea
```css
.textarea {
  background: var(--bg-primary);
  border: 3px solid var(--border-primary);
  border-radius: 0.25rem;
  padding: 0.75rem 1rem;
  font-size: var(--text-base);
  color: var(--text-primary);
  font-family: var(--font-primary);
  min-height: 120px;
  resize: vertical;
  transition: all 0.2s ease;
  width: 100%;
}

.textarea:focus {
  outline: none;
  border-color: var(--accent-yellow);
  box-shadow: 0 0 0 3px var(--focus-ring);
}
```

### Checkboxes & Radio Buttons

#### Checkbox
```css
.checkbox {
  appearance: none;
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid var(--border-primary);
  border-radius: 0.25rem;
  background: var(--bg-primary);
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.checkbox:hover {
  border-color: var(--accent-yellow);
}

.checkbox:checked {
  background: var(--accent-yellow);
  border-color: var(--accent-yellow);
}

.checkbox:checked::after {
  content: '✓';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-inverse);
  font-weight: var(--weight-bold);
  font-size: 1rem;
}

.checkbox:focus {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}
```

#### Radio Button
```css
.radio {
  appearance: none;
  width: 1.5rem;
  height: 1.5rem;
  border: 3px solid var(--border-primary);
  border-radius: 50%;
  background: var(--bg-primary);
  cursor: pointer;
  transition: all 0.2s ease;
}

.radio:hover {
  border-color: var(--accent-yellow);
}

.radio:checked {
  border-color: var(--accent-yellow);
  background: var(--accent-yellow);
  box-shadow: inset 0 0 0 4px var(--bg-primary);
}

.radio:focus {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
}
```

### Tag Lists

#### Tag Container
```css
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-item {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.875rem;
  border: 2px solid var(--border-primary);
  border-radius: 0.375rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-weight: var(--weight-medium);
  transition: all 0.2s ease;
}

.tag-item:hover {
  border-color: var(--accent-yellow);
  color: var(--accent-yellow);
  background: var(--hover-bg);
  transform: translateY(-1px);
}

.tag-item.active {
  border-color: var(--accent-yellow);
  background: var(--accent-yellow);
  color: var(--text-inverse);
  font-weight: var(--weight-bold);
}

/* Color Variants */
.tag-item.tag-blue {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.tag-item.tag-green {
  border-color: var(--accent-green);
  color: var(--accent-green);
}

.tag-item.tag-purple {
  border-color: var(--accent-purple);
  color: var(--accent-purple);
}

.tag-item.tag-pink {
  border-color: var(--accent-pink);
  color: var(--accent-pink);
}
```

### Badges

#### Badge
```css
.badge {
  display: inline-block;
  padding: 0.25rem 0.625rem;
  font-size: var(--text-xs);
  font-weight: var(--weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: 2px solid currentColor;
  border-radius: 0.25rem;
  background: transparent;
}

.badge-primary {
  color: var(--accent-yellow);
  border-color: var(--accent-yellow);
}

.badge-success {
  color: var(--success);
  border-color: var(--success);
}

.badge-warning {
  color: var(--warning);
  border-color: var(--warning);
}

.badge-error {
  color: var(--error);
  border-color: var(--error);
}
```

---

## Animations

### Transitions
```css
/* Standard Transition */
--transition-base: all 0.2s ease;

/* Hover Transitions */
--transition-hover: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

/* Active Transitions */
--transition-active: all 0.1s ease;
```

### Keyframe Animations

#### Subtle Bounce
```css
@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

/* Usage */
.bounce-subtle {
  animation: bounce-subtle 2s ease-in-out infinite;
}
```

#### Pulse Glow
```css
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(255, 212, 59, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(255, 212, 59, 0);
  }
}

/* Usage */
.pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}
```

#### Slide In (from bottom)
```css
@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Usage */
.slide-up {
  animation: slide-up 0.3s ease-out;
}
```

#### Fade In
```css
@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

/* Usage */
.fade-in {
  animation: fade-in 0.4s ease-out;
}
```

---

## Spacing System

```css
/* Spacing Scale */
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-5: 1.25rem;   /* 20px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-10: 2.5rem;   /* 40px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
--space-20: 5rem;     /* 80px */
--space-24: 6rem;     /* 96px */
```

---

## Borders & Outlines

### Border Styles
```css
/* Border Widths */
--border-thin: 1px;
--border-medium: 2px;
--border-thick: 3px;
--border-extra-thick: 4px;

/* Border Radius */
--radius-sm: 0.25rem;    /* 4px */
--radius-md: 0.5rem;     /* 8px */
--radius-lg: 0.75rem;    /* 12px */
--radius-xl: 1rem;       /* 16px */
--radius-full: 9999px;   /* Full circle/pill */
```

### Outline Styles
```css
/* Focus Outlines - Always visible for accessibility */
:focus-visible {
  outline: 3px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}
```

---

## Shadows

```css
/* Elevation Shadows */
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
--shadow-xl: 0 16px 48px rgba(0, 0, 0, 0.6);

/* Colored Glow Shadows */
--shadow-glow-yellow: 0 0 20px rgba(255, 212, 59, 0.3);
--shadow-glow-blue: 0 0 20px rgba(79, 195, 247, 0.3);
--shadow-glow-green: 0 0 20px rgba(102, 187, 106, 0.3);
```

---

## Layout Patterns

### Container
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--space-4);
}

.container-wide {
  max-width: 1400px;
}

.container-narrow {
  max-width: 800px;
}
```

### Grid System
```css
.grid {
  display: grid;
  gap: var(--space-6);
}

.grid-2 {
  grid-template-columns: repeat(2, 1fr);
}

.grid-3 {
  grid-template-columns: repeat(3, 1fr);
}

.grid-4 {
  grid-template-columns: repeat(4, 1fr);
}
```

### Flexbox Utilities
```css
.flex {
  display: flex;
}

.flex-col {
  flex-direction: column;
}

.items-center {
  align-items: center;
}

.justify-between {
  justify-content: space-between;
}

.gap-2 {
  gap: var(--space-2);
}

.gap-4 {
  gap: var(--space-4);
}
```

---

## Accessibility Guidelines

### Color Contrast
- All text must meet WCAG AA standards (4.5:1 for normal text, 3:1 for large text)
- Interactive elements must have clear focus states
- Never rely solely on color to convey information

### Focus States
- All interactive elements must have visible focus indicators
- Use `:focus-visible` for keyboard navigation
- Focus rings should use `var(--focus-ring)` color

### Screen Reader Support
- Use semantic HTML elements
- Provide ARIA labels where needed
- Ensure logical heading hierarchy

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

---

## Implementation Notes

1. **CSS Custom Properties**: All design tokens are available as CSS custom properties for easy theming and runtime updates.

2. **Dark Mode First**: This style guide assumes dark mode as the default. If light mode is needed, invert the background and text colors while maintaining contrast ratios.

3. **Animations**: Keep animations subtle and purposeful. Use `prefers-reduced-motion` media query to disable animations for users who prefer reduced motion:
   ```css
   @media (prefers-reduced-motion: reduce) {
     * {
       animation: none !important;
       transition: none !important;
     }
   }
   ```

4. **Responsive Design**: All components should be mobile-first and scale gracefully across breakpoints:
   - Mobile: 320px - 768px
   - Tablet: 768px - 1024px
   - Desktop: 1024px+

5. **Browser Support**: Target modern browsers that support CSS custom properties and Grid/Flexbox.

---

## Inspiration Credits

Design aesthetic inspired by [MotherDuck](https://motherduck.com)'s playful and caring visual identity, adapted for dark mode with vibrant, high-contrast colors and bold geometric shapes.

