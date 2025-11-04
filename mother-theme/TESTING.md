# Mother Theme Testing Guide

This document outlines the comprehensive testing strategy for the Mother Theme component library.

## Testing Strategy

We use a **three-tier testing approach**:

1. **Unit Tests** (React Testing Library + Vitest) - Test component logic, interactions, and behavior
2. **Visual Regression Tests** (Playwright Component Testing) - Test visual consistency and catch unintended UI changes
3. **Integration Tests** (Playwright E2E) - Test components in real browser environments (optional)

## Test Types

### Unit Tests (`*.test.tsx`)

**Location**: `src/components/*/ComponentName.test.tsx`

**Purpose**: Test component logic, state management, user interactions, and accessibility.

**Coverage**:
- Component rendering
- User interactions (clicks, keyboard navigation)
- State changes
- Event handlers
- Accessibility attributes
- Edge cases and error handling

**Example**:
```typescript
import { render, screen } from '@testing-library/react';
import { Tabs, Tab, TabPanel } from './Tabs';

test('should switch tabs when clicked', async () => {
  render(
    <Tabs defaultValue="tab1">
      <Tab value="tab1" label="Tab 1" />
      <Tab value="tab2" label="Tab 2" />
      <TabPanel value="tab1">Content 1</TabPanel>
      <TabPanel value="tab2">Content 2</TabPanel>
    </Tabs>
  );

  await userEvent.click(screen.getByText('Tab 2'));
  expect(screen.getByText('Tab 2')).toHaveClass('active');
});
```

### Visual Regression Tests (`*.ct.tsx`)

**Location**: `src/components/*/ComponentName.ct.tsx`

**Purpose**: Capture screenshots of components and compare against baseline images to detect visual regressions.

**Coverage**:
- Component visual appearance
- Different states (default, active, disabled, etc.)
- Variants (sizes, colors, positions)
- Responsive behavior

**Example**:
```typescript
import { test, expect } from '@playwright/experimental-ct-react';
import { Dialog } from './Dialog';

test('default dialog @visual', async ({ mount }) => {
  const component = await mount(
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogBody>Content</DialogBody>
    </Dialog>
  );

  await expect(component).toHaveScreenshot('dialog-default.png');
});
```

## Running Tests

### Unit Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

### Visual Regression Tests

```bash
# Run all component tests (including visual)
npm run test:ct

# Run only visual regression tests
npm run test:visual

# Run with UI mode (interactive)
npm run test:ct:ui
```

### Update Screenshots

When intentional visual changes are made, update baseline screenshots:

```bash
npm run test:ct -- --update-snapshots
```

## Test Organization

### File Structure

```
mother-theme/
├── src/
│   ├── components/
│   │   ├── Tabs/
│   │   │   ├── Tabs.tsx
│   │   │   ├── Tabs.test.tsx      # Unit tests
│   │   │   ├── Tabs.ct.tsx        # Visual regression tests
│   │   │   └── index.ts
│   │   └── ...
│   └── test/
│       └── setup.ts               # Test configuration
├── vitest.config.ts               # Vitest configuration
└── playwright-ct.config.ts         # Playwright Component Testing config
```

## What to Test

### ✅ Always Test

- **Component rendering** - Does it render without errors?
- **User interactions** - Do clicks, keyboard navigation work?
- **State management** - Do controlled/uncontrolled modes work?
- **Accessibility** - Do ARIA attributes exist and work?
- **Edge cases** - What happens with invalid props, disabled states, etc.?

### 🎨 Visual Tests

- **Default state** - How does it look initially?
- **Active/focused states** - Visual feedback on interaction
- **Variants** - Different sizes, colors, positions
- **Responsive** - How does it look on different viewports?

### ⚠️ Don't Test

- **Implementation details** - Don't test internal state variables
- **Third-party libraries** - Don't test React, Lucide icons, etc.
- **CSS specifics** - Let visual regression tests catch CSS issues

## Best Practices

### 1. Test User Behavior, Not Implementation

```typescript
// ❌ Bad - tests implementation
expect(component.state.activeTab).toBe('tab2');

// ✅ Good - tests user-visible behavior
expect(screen.getByText('Tab 2')).toHaveClass('active');
```

### 2. Use Accessible Queries

```typescript
// ❌ Bad - uses class names
screen.getByClassName('tab-button');

// ✅ Good - uses accessible queries
screen.getByRole('tab', { name: 'Tab 1' });
screen.getByLabelText('Username');
```

### 3. Test One Thing Per Test

```typescript
// ❌ Bad - multiple concerns
test('tabs work', () => {
  // Tests clicking, keyboard nav, disabled state, etc.
});

// ✅ Good - focused tests
test('should switch tabs when clicked', () => {});
test('should navigate with arrow keys', () => {});
test('should not switch when disabled', () => {});
```

### 4. Mock External Dependencies

```typescript
// Mock React DOM portal for components that use it
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});
```

### 5. Use Fake Timers for Time-Based Tests

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test('should auto-dismiss after duration', async () => {
  // ... render component
  vi.advanceTimersByTime(5000);
  // ... assert dismissal
});
```

## Coverage Goals

- **Unit Tests**: >90% line coverage
- **Visual Tests**: All component variants and states
- **Critical Paths**: 100% coverage (user interactions, state changes)

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test

  visual-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:ct
```

## Troubleshooting

### Visual Tests Fail

1. **Check if change is intentional** - If yes, update snapshots
2. **Check for flaky tests** - Add `await page.waitForTimeout()` for animations
3. **Check viewport size** - Ensure consistent viewport in tests

### Unit Tests Fail

1. **Check test isolation** - Ensure cleanup between tests
2. **Check async handling** - Use `waitFor` for async updates
3. **Check mocks** - Ensure mocks are properly reset

## Resources

- [React Testing Library Docs](https://testing-library.com/react)
- [Playwright Component Testing](https://playwright.dev/docs/test-components)
- [Vitest Docs](https://vitest.dev/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

