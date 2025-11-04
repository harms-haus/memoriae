/**
 * AI-Friendly Component Catalogue
 * 
 * This file contains structured data about all components in the mother-theme library.
 * Designed to be easily parseable by AI systems for understanding component usage,
 * configurations, and examples.
 */

export interface ComponentProp {
  name: string;
  type: string;
  required: boolean;
  default?: string;
  description: string;
  options?: string[];
}

export interface ComponentExample {
  title: string;
  description: string;
  code: string;
}

export interface ComponentInfo {
  name: string;
  description: string;
  importPath: string;
  props: ComponentProp[];
  examples: ComponentExample[];
  relatedComponents?: string[];
  cssClasses?: string[];
}

export const componentCatalogue: ComponentInfo[] = [
  {
    name: 'Button',
    description: 'Interactive button component with variants, icons, and loading states',
    importPath: "import { Button } from 'mother-theme/src';",
    props: [
      {
        name: 'variant',
        type: "'primary' | 'secondary' | 'ghost'",
        required: false,
        default: "'primary'",
        description: 'Button style variant',
      },
      {
        name: 'icon',
        type: 'LucideIcon',
        required: false,
        description: 'Icon component from lucide-react',
      },
      {
        name: 'iconPosition',
        type: "'left' | 'right'",
        required: false,
        default: "'left'",
        description: 'Position of icon relative to text',
      },
      {
        name: 'loading',
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Show loading spinner',
      },
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Disable button interaction',
      },
      {
        name: 'children',
        type: 'ReactNode',
        required: false,
        description: 'Button label text',
      },
    ],
    examples: [
      {
        title: 'Basic Button',
        description: 'Simple button with text',
        code: `<Button variant="primary">Click Me</Button>`,
      },
      {
        title: 'Button with Icon',
        description: 'Button with icon on the left',
        code: `<Button variant="primary" icon={CheckCircle}>Save</Button>`,
      },
      {
        title: 'Loading Button',
        description: 'Button showing loading state',
        code: `<Button variant="primary" loading>Loading...</Button>`,
      },
      {
        title: 'Disabled Button',
        description: 'Non-interactive button',
        code: `<Button variant="primary" disabled>Disabled</Button>`,
      },
    ],
    cssClasses: ['btn-primary', 'btn-secondary', 'btn-ghost'],
  },
  {
    name: 'Input',
    description: 'Text input field with label, validation, and helper text',
    importPath: "import { Input } from 'mother-theme/src';",
    props: [
      {
        name: 'label',
        type: 'string',
        required: false,
        description: 'Input label text',
      },
      {
        name: 'error',
        type: 'string',
        required: false,
        description: 'Error message to display',
      },
      {
        name: 'helperText',
        type: 'string',
        required: false,
        description: 'Helper text below input',
      },
      {
        name: 'icon',
        type: 'LucideIcon',
        required: false,
        description: 'Icon to display in input',
      },
      {
        name: 'showCount',
        type: 'boolean',
        required: false,
        description: 'Show character count',
      },
      {
        name: 'maxLength',
        type: 'number',
        required: false,
        description: 'Maximum character length',
      },
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        description: 'Disable input',
      },
    ],
    examples: [
      {
        title: 'Basic Input',
        description: 'Simple text input with label',
        code: `<Input label="Username" placeholder="Enter username" />`,
      },
      {
        title: 'Input with Icon',
        description: 'Input with search icon',
        code: `<Input label="Search" icon={Search} placeholder="Search..." />`,
      },
      {
        title: 'Input with Error',
        description: 'Input showing validation error',
        code: `<Input label="Email" error="Invalid email address" />`,
      },
      {
        title: 'Input with Character Count',
        description: 'Input showing character count',
        code: `<Input label="Description" maxLength={100} showCount />`,
      },
    ],
    relatedComponents: ['Textarea'],
  },
  {
    name: 'Dialog',
    description: 'Modal dialog overlay for confirmations and forms',
    importPath: "import { Dialog, DialogHeader, DialogBody, DialogFooter } from 'mother-theme/src';",
    props: [
      {
        name: 'open',
        type: 'boolean',
        required: true,
        description: 'Control dialog visibility',
      },
      {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        required: true,
        description: 'Callback when dialog state changes',
      },
      {
        name: 'size',
        type: "'small' | 'default' | 'large'",
        required: false,
        default: "'default'",
        description: 'Dialog size variant',
      },
      {
        name: 'closeOnBackdropClick',
        type: 'boolean',
        required: false,
        default: 'true',
        description: 'Close dialog when clicking backdrop',
      },
    ],
    examples: [
      {
        title: 'Basic Dialog',
        description: 'Simple confirmation dialog',
        code: `<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogHeader title="Confirm Action" onClose={() => setIsOpen(false)} />
  <DialogBody>
    <p>Are you sure?</p>
  </DialogBody>
  <DialogFooter>
    <Button variant="secondary" onClick={() => setIsOpen(false)}>Cancel</Button>
    <Button variant="primary" onClick={() => setIsOpen(false)}>Confirm</Button>
  </DialogFooter>
</Dialog>`,
      },
      {
        title: 'Small Dialog',
        description: 'Compact dialog for simple actions',
        code: `<Dialog open={isOpen} onOpenChange={setIsOpen} size="small">
  <DialogHeader title="Delete Item" />
  <DialogBody>This will be permanently deleted.</DialogBody>
</Dialog>`,
      },
    ],
    relatedComponents: ['Drawer', 'Button'],
  },
  {
    name: 'Drawer',
    description: 'Slide-out panel from screen edges, optimized for mobile',
    importPath: "import { Drawer, DrawerHeader, DrawerBody, DrawerFooter, DrawerItem } from 'mother-theme/src';",
    props: [
      {
        name: 'open',
        type: 'boolean',
        required: true,
        description: 'Control drawer visibility',
      },
      {
        name: 'onOpenChange',
        type: '(open: boolean) => void',
        required: true,
        description: 'Callback when drawer state changes',
      },
      {
        name: 'position',
        type: "'left' | 'right' | 'top' | 'bottom'",
        required: false,
        default: "'left'",
        description: 'Drawer slide direction',
      },
      {
        name: 'size',
        type: "'default' | 'wide'",
        required: false,
        default: "'default'",
        description: 'Drawer width/height',
      },
    ],
    examples: [
      {
        title: 'Left Drawer',
        description: 'Navigation drawer from left side',
        code: `<Drawer open={isOpen} onOpenChange={setIsOpen} position="left">
  <DrawerHeader title="Navigation" />
  <DrawerBody>
    <DrawerItem icon={Home} title="Home" />
    <DrawerItem icon={Settings} title="Settings" />
  </DrawerBody>
</Drawer>`,
      },
      {
        title: 'Bottom Drawer',
        description: 'Mobile-optimized bottom drawer',
        code: `<Drawer open={isOpen} onOpenChange={setIsOpen} position="bottom">
  <DrawerHeader title="Actions" />
  <DrawerBody>
    <Button variant="primary">Action 1</Button>
  </DrawerBody>
</Drawer>`,
      },
    ],
    relatedComponents: ['Dialog'],
  },
  {
    name: 'Checkbox',
    description: 'Checkbox input with label wrapping',
    importPath: "import { Checkbox } from 'mother-theme/src';",
    props: [
      {
        name: 'checked',
        type: 'boolean',
        required: false,
        description: 'Controlled checked state',
      },
      {
        name: 'defaultChecked',
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Uncontrolled default checked state',
      },
      {
        name: 'onCheckedChange',
        type: '(checked: boolean) => void',
        required: false,
        description: 'Callback when checked state changes',
      },
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        description: 'Disable checkbox',
      },
      {
        name: 'children',
        type: 'ReactNode',
        required: false,
        description: 'Label text',
      },
    ],
    examples: [
      {
        title: 'Basic Checkbox',
        description: 'Simple checkbox with label',
        code: `<Checkbox checked={isChecked} onCheckedChange={setIsChecked}>
  Accept terms
</Checkbox>`,
      },
      {
        title: 'Uncontrolled Checkbox',
        description: 'Checkbox with default state',
        code: `<Checkbox defaultChecked={true}>
  Remember me
</Checkbox>`,
      },
    ],
    relatedComponents: ['Radio', 'Toggle'],
  },
  {
    name: 'Tag',
    description: 'Tag component with variants and remove functionality',
    importPath: "import { Tag } from 'mother-theme/src';",
    props: [
      {
        name: 'variant',
        type: "'default' | 'blue' | 'green' | 'purple' | 'pink'",
        required: false,
        default: "'default'",
        description: 'Tag color variant',
      },
      {
        name: 'active',
        type: 'boolean',
        required: false,
        default: 'false',
        description: 'Active/selected state',
      },
      {
        name: 'onClick',
        type: '() => void',
        required: false,
        description: 'Click handler',
      },
      {
        name: 'onRemove',
        type: '() => void',
        required: false,
        description: 'Remove button handler',
      },
      {
        name: 'disabled',
        type: 'boolean',
        required: false,
        description: 'Disable tag interaction',
      },
    ],
    examples: [
      {
        title: 'Basic Tag',
        description: 'Simple tag',
        code: `<Tag>JavaScript</Tag>`,
      },
      {
        title: 'Tag with Variant',
        description: 'Colored tag variant',
        code: `<Tag variant="blue">React</Tag>`,
      },
      {
        title: 'Removable Tag',
        description: 'Tag with remove button',
        code: `<Tag onRemove={() => handleRemove(id)}>Remove me</Tag>`,
      },
      {
        title: 'Active Tag',
        description: 'Selected tag state',
        code: `<Tag active>Selected</Tag>`,
      },
    ],
    relatedComponents: ['Badge'],
  },
  {
    name: 'Progress',
    description: 'Progress bar showing completion percentage',
    importPath: "import { Progress } from 'mother-theme/src';",
    props: [
      {
        name: 'value',
        type: 'number',
        required: true,
        description: 'Progress value (0-100)',
      },
      {
        name: 'variant',
        type: "'default' | 'success' | 'warning' | 'error'",
        required: false,
        default: "'default'",
        description: 'Progress color variant',
      },
    ],
    examples: [
      {
        title: 'Basic Progress',
        description: 'Simple progress bar',
        code: `<Progress value={50} />`,
      },
      {
        title: 'Success Progress',
        description: 'Green progress for success state',
        code: `<Progress value={75} variant="success" />`,
      },
    ],
  },
  {
    name: 'Tabs',
    description: 'Tab navigation with smooth animations',
    importPath: "import { Tabs, Tab, TabPanel } from 'mother-theme/src';",
    props: [
      {
        name: 'defaultValue',
        type: 'string',
        required: false,
        description: 'Uncontrolled default active tab',
      },
      {
        name: 'value',
        type: 'string',
        required: false,
        description: 'Controlled active tab',
      },
      {
        name: 'onValueChange',
        type: '(value: string) => void',
        required: false,
        description: 'Callback when tab changes',
      },
    ],
    examples: [
      {
        title: 'Basic Tabs',
        description: 'Simple tab navigation',
        code: `<Tabs defaultValue="tab1">
  <Tab value="tab1">Tab 1</Tab>
  <Tab value="tab2">Tab 2</Tab>
  <TabPanel value="tab1">Content 1</TabPanel>
  <TabPanel value="tab2">Content 2</TabPanel>
</Tabs>`,
      },
    ],
  },
  {
    name: 'Timeline',
    description: 'Vertical timeline with customizable panels and positions',
    importPath: "import { Timeline } from 'mother-theme/src';",
    props: [
      {
        name: 'items',
        type: 'TimelineItem[]',
        required: true,
        description: 'Array of timeline items with id and position (0-100)',
      },
      {
        name: 'mode',
        type: "'center' | 'left' | 'right'",
        required: true,
        description: 'Timeline alignment mode',
      },
      {
        name: 'renderPanel',
        type: '(index: number, width: number) => ReactNode',
        required: true,
        description: 'Render function for panel content',
      },
      {
        name: 'renderOpposite',
        type: '(index: number, width: number, panelSide: string) => ReactNode',
        required: false,
        description: 'Render function for opposite side content',
      },
      {
        name: 'renderDot',
        type: '(index: number, position: number, isTop: boolean, isBottom: boolean) => ReactNode',
        required: false,
        description: 'Render function for timeline dot',
      },
    ],
    examples: [
      {
        title: 'Center Timeline',
        description: 'Timeline with alternating panels',
        code: `<Timeline
  items={[
    { id: '1', position: 0 },
    { id: '2', position: 50 },
    { id: '3', position: 100 },
  ]}
  mode="center"
  renderPanel={(index) => <div>Item {index + 1}</div>}
/>`,
      },
    ],
    relatedComponents: ['PointerPanel'],
  },
  {
    name: 'PointerPanel',
    description: 'Panel with arrow pointer for tooltips and popovers',
    importPath: "import { PointerPanel } from 'mother-theme/src';",
    props: [
      {
        name: 'position',
        type: "'top-left' | 'top-right' | 'center-left' | 'center-right' | 'bottom-left' | 'bottom-right'",
        required: true,
        description: 'Arrow position and direction',
      },
      {
        name: 'arrowSize',
        type: 'number',
        required: false,
        default: '16',
        description: 'Size of arrow in pixels',
      },
      {
        name: 'children',
        type: 'ReactNode',
        required: true,
        description: 'Panel content',
      },
    ],
    examples: [
      {
        title: 'Basic Pointer Panel',
        description: 'Panel pointing left',
        code: `<PointerPanel position="center-left">
  <div>Panel content</div>
</PointerPanel>`,
      },
      {
        title: 'Custom Arrow Size',
        description: 'Panel with larger arrow',
        code: `<PointerPanel position="top-right" arrowSize={24}>
  <div>Large arrow</div>
</PointerPanel>`,
      },
    ],
    relatedComponents: ['Timeline'],
  },
  {
    name: 'Notification',
    description: 'Dismissible notification message with variants',
    importPath: "import { Notification } from 'mother-theme/src';",
    props: [
      {
        name: 'variant',
        type: "'info' | 'success' | 'warning' | 'error'",
        required: false,
        default: "'info'",
        description: 'Notification type',
      },
      {
        name: 'title',
        type: 'string',
        required: true,
        description: 'Notification title',
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Notification message',
      },
      {
        name: 'duration',
        type: 'number',
        required: false,
        default: '5000',
        description: 'Auto-dismiss duration in milliseconds',
      },
      {
        name: 'onClose',
        type: '() => void',
        required: false,
        description: 'Close handler',
      },
    ],
    examples: [
      {
        title: 'Info Notification',
        description: 'Informational message',
        code: `<Notification
  variant="info"
  title="Information"
  message="This is an info message"
  onClose={() => setVisible(false)}
/>`,
      },
    ],
    relatedComponents: ['Toast'],
  },
  {
    name: 'Toast',
    description: 'Compact notification optimized for mobile',
    importPath: "import { ToastProvider, useToast } from 'mother-theme/src';",
    props: [
      {
        name: 'variant',
        type: "'success' | 'info' | 'warning' | 'error'",
        required: false,
        default: "'info'",
        description: 'Toast type',
      },
      {
        name: 'message',
        type: 'string',
        required: true,
        description: 'Toast message',
      },
      {
        name: 'duration',
        type: 'number',
        required: false,
        default: '5000',
        description: 'Display duration',
      },
    ],
    examples: [
      {
        title: 'Using Toast Hook',
        description: 'Show toast using hook',
        code: `function MyComponent() {
  const toast = useToast();
  
  const handleSave = () => {
    toast.toast({ variant: 'success', message: 'Saved!' });
  };
  
  return <Button onClick={handleSave}>Save</Button>;
}`,
      },
      {
        title: 'Toast Provider',
        description: 'Wrap app with ToastProvider',
        code: `<ToastProvider>
  <App />
</ToastProvider>`,
      },
    ],
    relatedComponents: ['Notification'],
  },
];

