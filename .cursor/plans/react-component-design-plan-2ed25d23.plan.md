<!-- 2ed25d23-837a-45fa-a4fb-c982e216ce71 b403e2f6-65b7-48fe-ba95-fe0c0eb15da1 -->
# Mother Theme Library - Component Design Plan

## Library Structure

**New Location**: `mother-theme/` (sibling to `frontend/` and `backend/`)

```
mother-theme/
├── src/
│   ├── styles/
│   │   ├── theme.css (main import)
│   │   ├── theme.colors.css
│   │   ├── theme.sizes.css
│   │   ├── theme.props.css
│   │   ├── theme.typography.css
│   │   ├── theme.shadows.css
│   │   ├── theme.animation.css
│   │   ├── theme.button.css
│   │   ├── theme.panel.css
│   │   ├── theme.input.css
│   │   ├── theme.select.css
│   │   ├── theme.checkbox.css
│   │   ├── theme.radio.css
│   │   ├── theme.toggle.css
│   │   ├── theme.slider.css
│   │   ├── theme.progress.css
│   │   ├── theme.notification.css
│   │   ├── theme.toast.css
│   │   ├── theme.dialog.css
│   │   ├── theme.drawer.css
│   │   ├── theme.tabs.css
│   │   ├── theme.tag.css
│   │   ├── theme.badge.css
│   │   ├── theme.layout.css
│   │   └── theme.icon.css
│   ├── components/
│   │   ├── Tabs/
│   │   ├── Dialog/
│   │   ├── Drawer/
│   │   ├── Toast/
│   │   ├── Notification/
│   │   ├── Checkbox/
│   │   ├── Radio/
│   │   ├── Toggle/
│   │   ├── Progress/
│   │   ├── Slider/
│   │   ├── Tag/
│   │   ├── Badge/
│   │   ├── Button/
│   │   └── Input/
│   ├── index.ts (main exports)
│   └── package.json
├── README.md
└── tsconfig.json
```

## Migration Tasks

1. **Create `mother-theme/` directory structure**
2. **Move all theme CSS files** from `frontend/src/styles/` to `mother-theme/src/styles/`
3. **Update imports** in `frontend/src/styles/theme.css` (if any internal references)
4. **Create component directories** in `mother-theme/src/components/`
5. **Set up package.json** for mother-theme library
6. **Update frontend** to import from mother-theme (either via relative path or as a package)

## Analysis Summary

After reviewing `theme.css` modules and `style-guide/index.html`, I've identified controls that would benefit from React components. Components are prioritized by complexity, reusability, and interaction needs.

## Components to Build

### 1. **Tabs Component** (High Priority)

**File**: `frontend/src/components/Tabs/Tabs.tsx`

**Why Component**: Tabs require state management for active tab tracking, smooth underline animation calculations, and keyboard navigation.

**Design**:

```typescript
interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface TabProps {
  value: string;
  label: string;
  disabled?: boolean;
}

interface TabPanelProps {
  value: string;
  children: React.ReactNode;
}
```

**Features**:

- Controlled/uncontrolled modes
- Smooth underline animation using CSS custom properties
- Keyboard navigation (Arrow keys, Home/End)
- ARIA attributes for accessibility
- Uses `theme.tabs.css` classes

---

### 2. **Dialog Component** (High Priority)

**File**: `frontend/src/components/Dialog/Dialog.tsx`

**Why Component**: Dialogs need body scroll locking, backdrop click handling, escape key handling, focus trapping, and portal rendering.

**Design**:

```typescript
interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: 'small' | 'default' | 'large';
  children: React.ReactNode;
}

interface DialogHeaderProps {
  title: string;
  onClose?: () => void;
}

interface DialogBodyProps {
  children: React.ReactNode;
}

interface DialogFooterProps {
  children: React.ReactNode;
}
```

**Features**:

- Portal rendering to body
- Body scroll lock when open
- Escape key to close
- Backdrop click to close (optional)
- Focus trap inside dialog
- Size variants (small, default, large)
- Uses `theme.dialog.css` classes

---

### 3. **Drawer Component** (High Priority)

**File**: `frontend/src/components/Drawer/Drawer.tsx`

**Why Component**: Drawers need body scroll locking, overlay management, slide animations, and position variants.

**Design**:

```typescript
interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'default' | 'wide';
  children: React.ReactNode;
}

interface DrawerHeaderProps {
  title: string;
  onClose?: () => void;
}

interface DrawerBodyProps {
  children: React.ReactNode;
}

interface DrawerFooterProps {
  children: React.ReactNode;
}

interface DrawerItemProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
}
```

**Features**:

- Position variants (left, right, top, bottom)
- Body scroll lock
- Overlay click to close
- Smooth slide animations
- DrawerItem helper component for navigation items
- Uses `theme.drawer.css` classes

---

### 4. **Toast Component** (High Priority)

**File**: `frontend/src/components/Toast/Toast.tsx` + `ToastProvider.tsx`

**Why Component**: Toasts need auto-dismiss timers, queue management, and positioning system.

**Design**:

```typescript
interface ToastProps {
  id: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
  message: string;
  duration?: number;
  onClose?: () => void;
}

interface ToastProviderProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  children: React.ReactNode;
}

// Hook for triggering toasts
function useToast(): {
  toast: (props: Omit<ToastProps, 'id'>) => void;
}
```

**Features**:

- Toast provider context for global toast management
- Auto-dismiss with configurable duration
- Manual close button
- Position variants
- Queue management (multiple toasts)
- Uses `theme.toast.css` classes

---

### 5. **Notification Component** (High Priority)

**File**: `frontend/src/components/Notification/Notification.tsx`

**Why Component**: Notifications need animated countdown timer, auto-dismiss, and action buttons.

**Design**:

```typescript
interface NotificationProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
}
```

**Features**:

- Animated countdown timer (SVG circle animation)
- Auto-dismiss with visual feedback
- Optional action buttons
- Icon support (Lucide icons)
- Uses `theme.notification.css` classes

---

### 6. **Checkbox Component** (Medium Priority)

**File**: `frontend/src/components/Checkbox/Checkbox.tsx`

**Why Component**: Wraps checkbox with label, handles label click, provides consistent API.

**Design**:

```typescript
interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}
```

**Features**:

- Label click handling
- Controlled/uncontrolled modes
- Proper label association (accessibility)
- Uses `theme.checkbox.css` classes

**Argument Against**: Simple enough to use native checkbox + label. However, consistent API and label click handling justify component.

---

### 7. **Radio Component** (Medium Priority)

**File**: `frontend/src/components/Radio/Radio.tsx` + `RadioGroup.tsx`

**Why Component**: Radio buttons need group management, keyboard navigation, proper grouping.

**Design**:

```typescript
interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

interface RadioProps {
  value: string;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}
```

**Features**:

- Radio group context for value management
- Keyboard navigation (Arrow keys)
- Proper ARIA attributes
- Uses `theme.radio.css` classes

**Argument Against**: Native radio groups work fine. However, consistent styling and keyboard navigation justify component.

---

### 8. **Toggle Component** (Medium Priority)

**File**: `frontend/src/components/Toggle/Toggle.tsx`

**Why Component**: Similar to Checkbox - wraps toggle with label, handles label click.

**Design**:

```typescript
interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}
```

**Features**:

- Label click handling
- Controlled/uncontrolled modes
- Uses `theme.toggle.css` classes

---

### 9. **Progress Component** (Medium Priority)

**File**: `frontend/src/components/Progress/Progress.tsx`

**Why Component**: Can show percentage label, animate value changes smoothly, support variants.

**Design**:

```typescript
interface ProgressProps {
  value: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
}
```

**Features**:

- Animated value transitions
- Optional percentage label
- Color variants
- Striped/animated variants
- Uses `theme.progress.css` classes

**Argument Against**: Simple div with width style works. However, consistent API, animations, and variants justify component.

---

### 10. **Slider Component** (Medium Priority)

**File**: `frontend/src/components/Slider/Slider.tsx`

**Why Component**: Can show value display, format values, handle step increments, provide better UX.

**Design**:

```typescript
interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  label?: string;
  disabled?: boolean;
}
```

**Features**:

- Optional value display
- Custom value formatting
- Step increments
- Label support
- Uses `theme.slider.css` classes

**Argument Against**: Native range input works. However, value display and formatting justify component.

---

### 11. **Tag Component** (Low Priority)

**File**: `frontend/src/components/Tag/Tag.tsx`

**Why Component**: Provides consistent API for click handlers, active state, onRemove callback.

**Design**:

```typescript
interface TagProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'pink';
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
}
```

**Features**:

- Click handler
- Active state
- Remove button (optional)
- Color variants
- Uses `theme.tag.css` classes

**Argument Against**: Simple span with classes works. However, consistent API and remove button justify component.

---

### 12. **Badge Component** (Low Priority)

**File**: `frontend/src/components/Badge/Badge.tsx`

**Why Component**: Simple but ensures consistent usage and type safety.

**Design**:

```typescript
interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error';
}
```

**Features**:

- Type-safe variants
- Uses `theme.badge.css` classes

**Argument Against**: Very simple, just a span with classes. However, type safety and consistency justify minimal component.

---

### 13. **Button Component** (Low Priority)

**File**: `frontend/src/components/Button/Button.tsx`

**Why Component**: Can add loading state, icon support, consistent onClick handling.

**Design**:

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children: React.ReactNode;
}
```

**Features**:

- Loading state with spinner
- Icon support
- Type-safe variants
- Uses `theme.button.css` classes

**Argument Against**: Native button with classes works. However, loading state and icon support justify component.

---

### 14. **Input Component** (Low Priority)

**File**: `frontend/src/components/Input/Input.tsx` + `Textarea.tsx`

**Why Component**: Can add validation states, error messages, character count, icon support.

**Design**:

```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  maxLength?: number;
  showCount?: boolean;
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCount?: boolean;
}
```

**Features**:

- Error state styling
- Helper text support
- Character count
- Icon support
- Label association
- Uses `theme.input.css` classes

**Argument Against**: Native input works. However, validation states and error messages justify component.

---

## Components NOT to Build

### Simple Styling Only

- **Labels** - Just CSS classes (`.label`)
- **Typography** - Just CSS classes (`.lead`, `.text-sm`, etc.)
- **Panels** - Just CSS classes (`.panel`, `.panel-elevated`)
- **Select** - Native select works well, complex custom select would be overkill

---

## Implementation Notes

1. **Component Structure**: Each component gets its own directory:
   ```
   components/
     ComponentName/
       ComponentName.tsx
       ComponentName.css (if needed)
       index.ts
   ```

2. **Theme Integration**: All components use existing CSS classes from `theme.css` modules. No new CSS needed unless component-specific.

3. **Accessibility**: All components include proper ARIA attributes, keyboard navigation, and focus management.

4. **TypeScript**: Strict typing throughout, leveraging existing theme types where possible.

5. **Lucide Icons**: Use `lucide-react` package (already in use) for icons.

6. **Testing**: Unit tests for state management and interaction logic.

---

## Implementation Todos

### Phase 0: Library Setup & Migration

- [x] setup-mother-theme-structure: Create `mother-theme/` directory with `src/styles/` and `src/components/` folders
- [x] migrate-theme-css: Move all `theme.*.css` files from `frontend/src/styles/` to `mother-theme/src/styles/`
- [x] create-package-json: Set up `mother-theme/package.json` with proper metadata, dependencies (React, TypeScript, lucide-react)
- [x] create-tsconfig: Set up `mother-theme/tsconfig.json` for TypeScript compilation
- [x] create-main-exports: Create `mother-theme/src/index.ts` to export all components and styles
- [x] update-frontend-imports: Update `frontend/` to import from `mother-theme/` (relative path or package)
- [x] create-readme: Create `mother-theme/README.md` with usage instructions and component documentation

### Phase 1: Essential Components

- [x] build-tabs-component: Create Tabs component with state management, keyboard navigation, smooth animations
- [x] build-dialog-component: Create Dialog component with portal, body scroll lock, focus trap, escape key handling
- [x] build-drawer-component: Create Drawer component with position variants, overlay, animations, DrawerItem helper
- [x] build-toast-component: Create Toast component with ToastProvider context, auto-dismiss, queue management, positioning
- [x] build-notification-component: Create Notification component with animated countdown timer, auto-dismiss, action buttons

### Phase 2: Form Controls

- [x] build-checkbox-component: Create Checkbox component with label wrapping, controlled/uncontrolled modes
- [x] build-radio-component: Create Radio and RadioGroup components with group management, keyboard navigation
- [x] build-toggle-component: Create Toggle component with label wrapping, controlled/uncontrolled modes
- [x] build-progress-component: Create Progress component with animated transitions, percentage labels, variants
- [x] build-slider-component: Create Slider component with value display, formatting, step increments

### Phase 3: Enhancement Components

- [ ] build-tag-component: Create Tag component with click handlers, active state, remove button, variants
- [ ] build-badge-component: Create Badge component with type-safe variants
- [ ] build-button-component: Create Button component with loading state, icon support, variants
- [ ] build-input-component: Create Input and Textarea components with validation states, error messages, character count

---

## Priority Order

1. **Phase 0** (Foundation): Library setup, theme migration
2. **Phase 1** (Essential): Tabs, Dialog, Drawer, Toast, Notification
3. **Phase 2** (Form Controls): Checkbox, Radio, Toggle, Progress, Slider
4. **Phase 3** (Enhancement): Tag, Badge, Button, Input