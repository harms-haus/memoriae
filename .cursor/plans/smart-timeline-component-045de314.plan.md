<!-- 045de314-6f7e-4446-95b9-da337493632a e9d44bfe-8acc-4c51-88fa-5e96043a6612 -->
# Timeline Component Implementation Plan

## Overview

Create a new `Timeline` component in `mother-theme/src/components/Timeline/` that intelligently positions panels with pointing arrows based on dot position and timeline alignment mode. The component will use the existing `PointerPanel` from the same package and support custom rendering functions. In center mode, supports rendering content on the opposite side (e.g., for timestamps).

## Component Design

### File Structure

- `mother-theme/src/components/Timeline/Timeline.tsx` - Main component
- `mother-theme/src/components/Timeline/Timeline.css` - Component styles
- `mother-theme/src/components/Timeline/Timeline.test.tsx` - Test suite
- `mother-theme/src/components/Timeline/index.ts` - Exports
- `mother-theme/src/index.ts` - Export Timeline from main index

### Component API

```typescript
interface TimelineProps {
  items: Array<{
    id: string;
    // Dot position along timeline (0-100% or pixel value)
    position: number;
    // Optional dot color/visual
    dot?: ReactNode;
  }>;
  // Timeline alignment mode
  mode: 'left' | 'center' | 'right';
  // Render panel content (default: uses PointerPanel)
  renderPanel?: (index: number, width: number) => ReactNode;
  // Custom panel creation (overrides default PointerPanel)
  createPanel?: (
    direction: 'left' | 'right',
    pos: { x: number; y: number },
    index: number,
    width: number,
    styles?: React.CSSProperties
  ) => ReactNode;
  // Render content on opposite side (center mode only)
  // Called when panel is on one side, allows rendering on the other side
  renderOpposite?: (
    index: number,
    width: number,
    panelSide: 'left' | 'right' // Which side the panel is on
  ) => ReactNode;
  // Maximum panel width
  maxPanelWidth?: number;
  // Panel spacing from timeline
  panelSpacing?: number;
  className?: string;
}
```

### Panel Selection Logic

Based on dot index and timeline mode:

**For top dot (index 0):**

- Left mode: panel right, points left → `top-right` position
- Right mode: panel left, points right → `top-left` position  
- Center mode: panel right, points left → `top-right` position

**For bottom dot (last index):**

- Left mode: panel right, points left → `bottom-right` position
- Right mode: panel left, points right → `bottom-left` position
- Center mode: panel left, points right → `bottom-left` position

**For middle dots:**

- Left mode: all panels right, points left → `center-right` position
- Right mode: all panels left, points right → `center-left` position
- Center mode: alternate left/right → `center-left` or `center-right` position

### Implementation Details

1. **Timeline Line**: Vertical line positioned based on mode (left/center/right)
2. **Dots**: Circular markers positioned along timeline at specified positions
3. **Panels**: Positioned relative to dots, aligned to pointer tip at dot center
4. **Custom Rendering**: If `createPanel` provided, use it; else use `renderPanel` with default `PointerPanel` wrapper
5. **Responsive**: Consider container width for panel positioning

## Testing Plan

### Unit Tests (`SmartTimeline.test.tsx`)

1. **Rendering Tests**

   - Renders timeline container
   - Renders correct number of dots
   - Renders correct number of panels
   - Applies correct CSS classes for mode

2. **Panel Selection Tests**

   - Top dot uses top panel variant
   - Bottom dot uses bottom panel variant
   - Middle dots use center panel variant
   - Left mode: all panels point left
   - Right mode: all panels point right
   - Center mode: panels alternate correctly

3. **Custom Rendering Tests**

   - `renderPanel` function receives correct index and width
   - `createPanel` function receives correct parameters
   - Custom panel overrides default PointerPanel
   - Panel content renders correctly

4. **Positioning Tests**

   - Timeline line positioned correctly in left mode
   - Timeline line positioned correctly in right mode
   - Timeline line positioned correctly in center mode
   - Panels positioned relative to dots correctly
   - Panel pointers align with dot centers

5. **Edge Cases**

   - Single item (top and bottom are same)
   - Two items (top and bottom)
   - Empty items array
   - Zero/negative panel width
   - Very large item count

6. **Visual Regression Tests** (using image as ground truth)

   - Center mode with 4 items matches image layout
   - Panel positions match image
   - Pointer directions match image
   - Panel styling matches image (borders, shadows, colors)

## Implementation Steps

1. **Create Component Structure**

   - Create `SmartTimeline` directory and files
   - Set up TypeScript interfaces
   - Import `PointerPanel` from `mother-theme`

2. **Implement Core Logic**

   - Timeline line rendering with mode-based positioning
   - Dot rendering at specified positions
   - Panel selection algorithm (top/bottom/center + mode)
   - Panel positioning calculations

3. **Implement Custom Rendering**

   - Default `PointerPanel` rendering
   - `renderPanel` function integration
   - `createPanel` function integration

4. **Add Styling**

   - Timeline line styles
   - Dot styles (colors, sizes, borders)
   - Panel container styles
   - Responsive adjustments

5. **Write Tests**

   - Unit tests for all logic
   - Visual regression tests using image reference
   - Edge case coverage

6. **Fix Build Errors**

   - TypeScript type errors
   - Import path issues
   - CSS module issues

7. **Fix Tests**

   - Update tests to match actual behavior
   - Use image/documentation as ground truth (not code)
   - Ensure all assertions pass

8. **Iterate**

   - Fix any remaining build errors
   - Fix any failing tests
   - Verify visual matches image

## Key Files to Modify/Create

- `mother-theme/src/components/Timeline/Timeline.tsx` (new)
- `mother-theme/src/components/Timeline/Timeline.css` (new)
- `mother-theme/src/components/Timeline/Timeline.test.tsx` (new)
- `mother-theme/src/components/Timeline/index.ts` (new)
- `mother-theme/src/index.ts` (update - export Timeline)
- `frontend/src/components/StyleGuide/StyleGuide.tsx` (update - add Timeline demo)

## Dependencies

- `mother-theme` package (PointerPanel component)
- `react` and `react-dom`
- `@testing-library/react` and `vitest` for testing
- CSS from `mother-theme/src/styles/theme.css`

## Implementation Todos

- [ ] **Create component files**
  - [ ] Create `Timeline.tsx` with TypeScript interfaces
  - [ ] Create `Timeline.css` with base styles
  - [ ] Create `Timeline.test.tsx` test file
  - [ ] Update `mother-theme/src/index.ts` with Timeline export

- [ ] **Implement timeline line and dots**
  - [ ] Render vertical timeline line positioned by mode (left/center/right)
  - [ ] Render dots at specified positions along timeline
  - [ ] Style dots with colors, borders, sizes

- [ ] **Implement panel selection algorithm**
  - [ ] Determine panel type (top/bottom/center) based on index
  - [ ] Determine panel direction (left/right) based on mode and index
  - [ ] Calculate PointerPanel position variant

- [ ] **Implement panel rendering**
  - [ ] Default: use PointerPanel with renderPanel content
  - [ ] Custom: use createPanel function if provided
  - [ ] Position panels relative to dots with correct spacing

- [ ] **Implement opposite side rendering (center mode)**
  - [ ] Call renderOpposite when in center mode
  - [ ] Position opposite content on correct side
  - [ ] Pass correct parameters (index, width, panelSide)

- [ ] **Add CSS styling**
  - [ ] Timeline container styles
  - [ ] Timeline line styles
  - [ ] Dot styles with theme colors
  - [ ] Panel positioning styles
  - [ ] Responsive adjustments

- [ ] **Write unit tests**
  - [ ] Rendering tests (container, dots, panels)
  - [ ] Panel selection tests (top/bottom/center variants)
  - [ ] Custom rendering tests (renderPanel, createPanel, renderOpposite)
  - [ ] Positioning tests (left/center/right modes)
  - [ ] Edge cases (empty, single item, two items)

- [ ] **Write visual regression tests**
  - [ ] Center mode with 4 items matches image
  - [ ] Verify panel positions match image
  - [ ] Verify pointer directions match image
  - [ ] Verify styling matches image

- [ ] **Fix build errors**
  - [ ] Resolve TypeScript type errors
  - [ ] Fix import paths (PointerPanel from mother-theme)
  - [ ] Fix CSS import issues
  - [ ] Ensure all types are properly defined

- [ ] **Fix and validate tests**
  - [ ] Use image/documentation as ground truth
  - [ ] Update test assertions to match actual behavior
  - [ ] Fix any failing tests
  - [ ] Ensure all test cases pass

- [ ] **Add Timeline to Style Guide**
  - [ ] Import Timeline component in StyleGuide.tsx
  - [ ] Create demo section showing all three modes (left/center/right)
  - [ ] Add examples with renderPanel, createPanel, and renderOpposite
  - [ ] Display timeline with sample data matching image reference

- [ ] **Final verification**
  - [ ] Verify visual output matches image reference
  - [ ] Check all three modes (left/center/right) work correctly
  - [ ] Verify opposite side rendering in center mode
  - [ ] Ensure no console errors or warnings
  - [ ] Verify Timeline displays correctly in Style Guide