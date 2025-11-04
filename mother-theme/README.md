# Mother Theme Library

A comprehensive design system and React component library for Memoriae.

## Overview

Mother Theme provides:
- Complete CSS theme system with custom properties
- Reusable React components built on the theme
- Type-safe TypeScript interfaces
- Accessibility-first design

## Installation

Currently, Mother Theme is used as a local package in the Memoriae project.

## Usage

### Importing Styles

```typescript
import '../../mother-theme/src/styles/theme.css';
```

### Using Components

Components will be exported from the main index:

```typescript
import { Button, Dialog, Tabs } from '../../mother-theme/src';
```

## Theme Structure

The theme is organized into modular CSS files:

- `theme.colors.css` - Color palette (backgrounds, text, accents, status)
- `theme.sizes.css` - Spacing system, border widths, border radii
- `theme.props.css` - Interactive states (hover, focus, disabled)
- `theme.typography.css` - Font families, sizes, weights
- `theme.shadows.css` - Shadow definitions and glows
- `theme.animation.css` - Keyframe animations
- Component-specific theme files (button, input, dialog, etc.)

## Components

### Planned Components

#### Phase 1: Essential Components
- **Tabs** - Tab navigation with smooth animations
- **Dialog** - Modal dialogs with focus trapping
- **Drawer** - Slide-out panels
- **Toast** - Toast notifications with queue management
- **Notification** - Notifications with countdown timers

#### Phase 2: Form Controls
- **Checkbox** - Checkbox with label wrapping
- **Radio** - Radio buttons with group management
- **Toggle** - Toggle switches
- **Progress** - Progress bars with variants
- **Slider** - Range sliders with value display

#### Phase 3: Enhancement Components
- **Tag** - Tags with click handlers and variants
- **Badge** - Badge components
- **Button** - Buttons with loading states and icons
- **Input** - Input fields with validation states

## Development

### Type Checking

```bash
npm run type-check
```

### Building

```bash
npm run build
```

## Design Philosophy

Mother Theme follows these principles:

1. **Immutability First** - Components are designed to be predictable and controlled
2. **Accessibility** - All components include proper ARIA attributes and keyboard navigation
3. **Type Safety** - Full TypeScript support with strict typing
4. **Theme Integration** - All components use CSS classes from the theme system
5. **Consistency** - Unified API patterns across all components

## License

Part of the Memoriae project.

