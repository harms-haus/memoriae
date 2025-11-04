# Mother Theme Testing Plan - Phase 2 Components

## Overview

This document outlines the comprehensive testing strategy for Phase 2 components (Form Controls) in the Mother Theme library. The plan includes shared test utilities, test patterns, and specific test cases for each component.

## Testing Strategy

### Three-Tier Approach

1. **Unit Tests** (`*.test.tsx`) - Component logic, interactions, accessibility
2. **Visual Regression Tests** (`*.ct.tsx`) - Visual consistency (Playwright Component Testing)
3. **Integration Tests** - Real browser environment (optional)

### Shared Test Resources

All tests share common utilities and patterns:

- **Location**: `src/test/utils.ts` - Shared test utilities
- **Setup**: `src/test/setup.ts` - Global test configuration
- **Theme CSS**: Automatically imported in setup for consistent styling

## Test Utilities

### Available Helpers (`src/test/utils.ts`)

1. **`renderWithTheme()`** - Custom render function with theme CSS
2. **`createUserEvent()`** - Standardized user event instance
3. **`waitForDelay()`** - Wait for animations/transitions
4. **`waitForNextTick()`** - Wait for state updates
5. **`createControlledWrapper()`** - Helper for controlled component testing
6. **`a11y`** - Accessibility test helpers
7. **`testData`** - Common test data generators

## Component Test Patterns

### Pattern 1: Controlled/Uncontrolled Components

All form controls support both controlled and uncontrolled modes:

```typescript
describe('Controlled Mode', () => {
  it('should respect controlled value', () => {
    const { rerender } = render(
      <Component value="value1" onChange={() => {}} />
    );
    // Test controlled behavior
  });
});

describe('Uncontrolled Mode', () => {
  it('should use default value', () => {
    render(<Component defaultValue="value1" />);
    // Test uncontrolled behavior
  });
});
```

### Pattern 2: User Interactions

All interactive components test:
- Click events
- Keyboard navigation (where applicable)
- Label click handling (where applicable)

```typescript
describe('User Interactions', () => {
  it('should handle click events', async () => {
    const user = createUserEvent();
    const handleClick = vi.fn();
    render(<Component onClick={handleClick} />);
    
    await user.click(screen.getByRole('...'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Pattern 3: Accessibility

All components include accessibility tests:

```typescript
describe('Accessibility', () => {
  it('should have proper ARIA attributes', () => {
    render(<Component />);
    const element = screen.getByRole('...');
    expect(a11y.hasRole(element, '...')).toBe(true);
    expect(a11y.isLabeled(element)).toBe(true);
  });
});
```

### Pattern 4: Disabled States

All components support disabled states:

```typescript
describe('Disabled State', () => {
  it('should not respond to interactions when disabled', async () => {
    const user = createUserEvent();
    const handleChange = vi.fn();
    render(<Component disabled onChange={handleChange} />);
    
    await user.click(screen.getByRole('...'));
    expect(handleChange).not.toHaveBeenCalled();
  });
});
```

## Component-Specific Test Plans

### 1. Checkbox Component

**Test Coverage**:
- ✅ Rendering with label
- ✅ Controlled mode (value prop)
- ✅ Uncontrolled mode (defaultChecked)
- ✅ Label click handling
- ✅ Checked state changes
- ✅ Disabled state
- ✅ Accessibility (ARIA attributes, label association)

**Test File**: `src/components/Checkbox/Checkbox.test.tsx`

**Key Test Cases**:
1. Renders checkbox with label
2. Controlled mode: respects `checked` prop
3. Uncontrolled mode: uses `defaultChecked`
4. Clicking label toggles checkbox
5. Clicking checkbox toggles state
6. `onCheckedChange` callback is called
7. Disabled checkbox doesn't respond to clicks
8. Proper ARIA attributes (aria-checked, aria-labelledby)
9. Label is properly associated with checkbox (for attribute)

### 2. Radio Component

**Test Coverage**:
- ✅ RadioGroup rendering
- ✅ Radio rendering within group
- ✅ Controlled mode (value prop on RadioGroup)
- ✅ Uncontrolled mode (defaultValue on RadioGroup)
- ✅ Group value management
- ✅ Keyboard navigation (Arrow keys)
- ✅ Disabled state
- ✅ Accessibility (ARIA attributes, role="radiogroup")

**Test File**: `src/components/Radio/Radio.test.tsx`

**Key Test Cases**:
1. RadioGroup renders with radios
2. Controlled mode: respects `value` prop
3. Uncontrolled mode: uses `defaultValue`
4. Selecting one radio deselects others
5. Keyboard navigation with Arrow keys
6. Disabled radio doesn't respond to clicks
7. Proper ARIA attributes (role="radiogroup", aria-checked)
8. Radio buttons are properly grouped (name attribute)

### 3. Toggle Component

**Test Coverage**:
- ✅ Rendering with label
- ✅ Controlled mode (checked prop)
- ✅ Uncontrolled mode (defaultChecked)
- ✅ Label click handling
- ✅ Toggle state changes
- ✅ Disabled state
- ✅ Accessibility (ARIA attributes, role="switch")

**Test File**: `src/components/Toggle/Toggle.test.tsx`

**Key Test Cases**:
1. Renders toggle with label
2. Controlled mode: respects `checked` prop
3. Uncontrolled mode: uses `defaultChecked`
4. Clicking label toggles switch
5. Clicking toggle toggles state
6. `onCheckedChange` callback is called
7. Disabled toggle doesn't respond to clicks
8. Proper ARIA attributes (role="switch", aria-checked)
9. Label is properly associated with toggle

### 4. Progress Component

**Test Coverage**:
- ✅ Rendering with value
- ✅ Value display (showLabel)
- ✅ Percentage label
- ✅ Custom label text
- ✅ Variants (default, success, warning, error)
- ✅ Striped variant
- ✅ Animated variant
- ✅ Value clamping (0-100)
- ✅ Accessibility (role="progressbar", aria-valuenow)

**Test File**: `src/components/Progress/Progress.test.tsx`

**Key Test Cases**:
1. Renders progress bar with correct width
2. Shows percentage label when `showLabel` is true
3. Shows custom label when provided
4. Applies correct variant classes
5. Striped variant applies correct class
6. Animated variant applies correct class
7. Clamps value to 0-100 range
8. Proper ARIA attributes (role="progressbar", aria-valuenow, aria-valuemin, aria-valuemax)

### 5. Slider Component

**Test Coverage**:
- ✅ Rendering with value
- ✅ Controlled mode (value prop)
- ✅ Uncontrolled mode (defaultValue)
- ✅ Value display (showValue)
- ✅ Custom value formatting
- ✅ Min/max/step constraints
- ✅ Value change handling
- ✅ Disabled state
- ✅ Label support
- ✅ Accessibility (role="slider", aria-valuenow)

**Test File**: `src/components/Slider/Slider.test.tsx`

**Key Test Cases**:
1. Renders slider with correct value
2. Controlled mode: respects `value` prop
3. Uncontrolled mode: uses `defaultValue`
4. Shows value display when `showValue` is true
5. Formats value with custom formatter
6. Respects min/max constraints
7. Respects step increments
8. `onValueChange` callback is called
9. Disabled slider doesn't respond to interactions
10. Proper ARIA attributes (role="slider", aria-valuenow, aria-valuemin, aria-valuemax)
11. Label is properly associated with slider

## Test Execution

### Running Tests

```bash
# Run all unit tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- Checkbox.test.tsx
```

### Test Coverage Goals

- **Minimum**: 80% coverage for all Phase 2 components
- **Focus Areas**: User interactions, state management, accessibility
- **Exclude**: Implementation details, internal state variables

## Continuous Improvement

### Test Maintenance

- Update tests when component APIs change
- Add tests for new features/edge cases
- Refactor tests to use shared utilities
- Review and update accessibility tests

### Test Quality

- Tests should be readable and maintainable
- Tests should be independent (no shared state)
- Tests should be fast (avoid unnecessary delays)
- Tests should be deterministic (no flakiness)

## References

- [React Testing Library](https://testing-library.com/react)
- [Vitest Documentation](https://vitest.dev/)
- [Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

