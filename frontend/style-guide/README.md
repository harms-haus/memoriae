# Style Guide Showcase

This directory contains a static HTML showcase of the Memoriae design system.

## 📁 File Structure

- **`theme.css`** - ✨ **Standalone reusable theme** - Copy this to any project!
- **`index.html`** - Style guide showcase page
- **`index.css`** - Showcase-specific layout styles (NOT part of theme)
- **`THEME.md`** - Documentation for using the theme in other projects
- **`serve.js`** - Simple HTTP server script
- **`README.md`** - This file

## 🚀 Viewing the Style Guide

### Option 1: Using npm script (Recommended)

From the `frontend` directory, run:

```bash
npm run style-guide
```

Then open your browser to: **http://localhost:3001/style-guide/index.html**

### Option 2: Using Python

From the `frontend` directory, run:

```bash
python3 -m http.server 3001
```

Then open your browser to: **http://localhost:3001/style-guide/index.html**

### Option 3: Direct file access

You can also open `index.html` directly in your browser, but relative paths to CSS may not work correctly depending on your browser's security settings.

## 🎨 What's Included

The style guide showcases:

- **Colors**: All background, text, accent, and status colors
- **Typography**: Headings, body text, labels, font weights and sizes
- **Layered Panels**: Multiple nesting levels
- **Buttons**: All variants and states
- **Form Controls**: Inputs, selects, checkboxes, radios, toggles, sliders
- **Progress Bars**: Default and colored variants
- **Tabs**: Navigation component
- **Tags & Badges**: All variants
- **Shadows**: Elevation and glow effects
- **Animations**: Bounce, pulse, slide-up, fade-in
- **Spacing & Borders**: Complete design tokens

## 🔄 Using the Theme in Another Project

The **`theme.css`** file is a complete, standalone theme that can be copied to any project. See **`THEME.md`** for detailed usage instructions.

Quick start:

1. Copy `theme.css` to your project
2. Link it in your HTML: `<link rel="stylesheet" href="theme.css">`
3. Use theme classes and CSS variables

All reusable components (buttons, panels, inputs, tabs, progress bars, etc.) are included in `theme.css`. The `index.css` file only contains showcase-specific layout styles.

