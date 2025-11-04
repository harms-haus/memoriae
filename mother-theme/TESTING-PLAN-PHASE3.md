# Mother Theme Testing Plan - Phase 3 Components

## Overview

This document outlines the comprehensive testing strategy for Phase 3 components (Enhancement Components: Tag, Badge, Button, Input) in the Mother Theme library. The plan extends the shared test utilities and patterns established in Phase 2.

## Testing Strategy

### Three-Tier Approach

1. **Unit Tests** (`*.test.tsx`) - Component logic, interactions, accessibility
2. **Visual Regression Tests** (`*.ct.tsx`) - Visual consistency (Playwright Component Testing)
3. **Integration Tests** - Real browser environment (optional)

### Shared Test Resources

All tests share common utilities and patterns:

- **Location**: `src/test/utils.ts` - Shared test utilities (already established)
- **Setup**: `src/test/setup.ts` - Global test configuration (already established)
- **Theme CSS**: Automatically imported in setup for consistent styling

## Test Utilities

### Available Helpers (`src/test/utils.ts`)

All existing utilities from Phase 2 are available:

1. **`renderWithTheme()`** - Custom render function with theme CSS
2. **`createUserEvent()`** - Standardized user event instance
3. **`waitForDelay()`** - Wait for animations/transitions
4. **`waitForNextTick()`** - Wait for state updates
5. **`createControlledWrapper()`** - Helper for controlled component testing
6. **`a11y`** - Accessibility test helpers
7. **`testData`** - Common test data generators

## Component Test Patterns

### Pattern 1: Controlled/Uncontrolled Components

Components that support controlled/uncontrolled modes (Button, Input):

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

### 1. Tag Component

**Test Coverage**:
- ✅ Rendering with children
- ✅ Click handler
- ✅ Active state
- ✅ Remove button (onRemove callback)
- ✅ Color variants (default, blue, green, purple, pink)
- ✅ Disabled state
- ✅ Accessibility (keyboard navigation)

**Test File**: `src/components/Tag/Tag.test.tsx`

**Key Test Cases**:
1. Renders tag with children
2. Applies correct variant classes
3. Shows active state when `active` prop is true
4. Calls `onClick` when clicked
5. Shows remove button when `onRemove` is provided
6. Calls `onRemove` when remove button is clicked
7. Does not respond to clicks when disabled
8. Supports keyboard navigation (Enter/Space)
9. Proper ARIA attributes

### 2. Badge Component

**Test Coverage**:
- ✅ Rendering with children
- ✅ Variant classes (primary, success, warning, error)
- ✅ Type-safe variants

**Test File**: `src/components/Badge/Badge.test.tsx`

**Key Test Cases**:
1. Renders badge with children
2. Applies default variant class
3. Applies primary variant class
4. Applies success variant class
5. Applies warning variant class
6. Applies error variant class
7. TypeScript ensures only valid variants

**Note**: Badge is a simple presentational component, so minimal interaction testing needed.

### 3. Button Component

**Test Coverage**:
- ✅ Rendering with children
- ✅ Variant classes (primary, secondary, ghost)
- ✅ Loading state (spinner, disabled during loading)
- ✅ Icon support (left/right positioning)
- ✅ Click handling
- ✅ Disabled state
- ✅ Accessibility (keyboard navigation, ARIA attributes)

**Test File**: `src/components/Button/Button.test.tsx`

**Key Test Cases**:
1. Renders button with children
2. Applies correct variant classes
3. Shows loading spinner when `loading` is true
4. Disables button when `loading` is true
5. Shows icon on left when `iconPosition` is 'left'
6. Shows icon on right when `iconPosition` is 'right'
7. Calls `onClick` when clicked (when not loading)
8. Does not call `onClick` when loading
9. Does not respond to clicks when disabled
10. Supports keyboard navigation (Enter/Space)
11. Proper ARIA attributes (aria-disabled, aria-busy when loading)

### 4. Input Component

**Test Coverage**:
- ✅ Rendering with label
- ✅ Error state styling
- ✅ Helper text support
- ✅ Character count (showCount, maxLength)
- ✅ Icon support
- ✅ Label association
- ✅ Controlled mode (value prop)
- ✅ Uncontrolled mode (defaultValue)
- ✅ Disabled state
- ✅ Accessibility (ARIA attributes, label association)

**Test File**: `src/components/Input/Input.test.tsx`

**Key Test Cases**:
1. Renders input with label
2. Controlled mode: respects `value` prop
3. Uncontrolled mode: uses `defaultValue`
4. Shows error message when `error` prop is provided
5. Applies error styling when `error` prop is provided
6. Shows helper text when `helperText` prop is provided
7. Shows character count when `showCount` is true
8. Respects `maxLength` constraint
9. Shows icon when `icon` prop is provided
10. Label is properly associated with input
11. Does not respond to input when disabled
12. Proper ARIA attributes (aria-invalid, aria-describedby)

### 5. Textarea Component

**Test Coverage**:
- ✅ Rendering with label
- ✅ Error state styling
- ✅ Helper text support
- ✅ Character count (showCount, maxLength)
- ✅ Label association
- ✅ Controlled mode (value prop)
- ✅ Uncontrolled mode (defaultValue)
- ✅ Disabled state
- ✅ Accessibility (ARIA attributes, label association)

**Test File**: `src/components/Input/Input.test.tsx` (shared with Input)

**Key Test Cases**:
1. Renders textarea with label
2. Controlled mode: respects `value` prop
3. Uncontrolled mode: uses `defaultValue`
4. Shows error message when `error` prop is provided
5. Applies error styling when `error` prop is provided
6. Shows helper text when `helperText` prop is provided
7. Shows character count when `showCount` is true
8. Respects `maxLength` constraint
9. Label is properly associated with textarea
10. Does not respond to input when disabled
11. Proper ARIA attributes (aria-invalid, aria-describedby)

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
npm test -- Tag.test.tsx
```

### Test Coverage Goals

- **Minimum**: 80% coverage for all Phase 3 components
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
- Phase 2 Testing Plan (`TESTING-PLAN.md`)

