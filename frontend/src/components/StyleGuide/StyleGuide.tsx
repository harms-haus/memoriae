import { useState } from 'react';
import {
  Button,
  Badge,
  Tag,
  Input,
  Textarea,
  Checkbox,
  RadioGroup,
  Radio,
  Toggle,
  Slider,
  Progress,
  Tabs,
  Tab,
  TabPanel,
  Dialog,
  DialogHeader,
  DialogBody,
  DialogFooter,
  Drawer,
  DrawerHeader,
  DrawerBody,
  DrawerFooter,
  DrawerItem,
  Notification,
  ToastProvider,
  useToast,
  PointerPanel,
} from '../../../../mother-theme/src';
import {
  FileText,
  Clock,
  FolderTree,
  Tags as TagsIcon,
  Settings,
  Plus,
  Search,
  Filter,
  Share2,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react';
import './StyleGuide.css';

function StyleGuideContent() {
  const toast = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogSmallOpen, setDialogSmallOpen] = useState(false);
  const [dialogLargeOpen, setDialogLargeOpen] = useState(false);
  const [drawerLeftOpen, setDrawerLeftOpen] = useState(false);
  const [drawerRightOpen, setDrawerRightOpen] = useState(false);
  const [drawerBottomOpen, setDrawerBottomOpen] = useState(false);
  const [notificationVisible, setNotificationVisible] = useState(true);
  const [notificationWarningVisible, setNotificationWarningVisible] = useState(true);
  const [notificationErrorVisible, setNotificationErrorVisible] = useState(true);
  const [sliderValue, setSliderValue] = useState(50);
  const [radioValue, setRadioValue] = useState('option1');
  const [checkbox1, setCheckbox1] = useState(true);
  const [checkbox2, setCheckbox2] = useState(false);
  const [toggle1, setToggle1] = useState(true);
  const [toggle2, setToggle2] = useState(false);

  const showToast = (variant: 'success' | 'info' | 'warning' | 'error') => {
    const messages = {
      success: 'Changes saved successfully',
      info: 'New message received',
      warning: 'Connection unstable',
      error: 'Failed to delete item',
    };
    toast.toast({ variant, message: messages[variant] });
  };

  return (
    <div className="style-guide-container">
      <header className="style-guide-header">
        <h1>Memoriae Style Guide</h1>
        <p className="lead">Complete showcase of design system components, colors, typography, and interactive elements</p>
      </header>

      {/* Colors Section */}
      <section id="colors" className="showcase-section">
        <h2>Colors</h2>

        <div className="panel">
          <h3>Background Colors</h3>
          <div className="color-grid">
            {[
              { name: 'bg-primary', value: '#0a0a0a', var: '--bg-primary' },
              { name: 'bg-secondary', value: '#141414', var: '--bg-secondary' },
              { name: 'bg-tertiary', value: '#1a1a1a', var: '--bg-tertiary' },
              { name: 'bg-elevated', value: '#222222', var: '--bg-elevated' },
              { name: 'bg-accent-light', value: '#f5f5f5', var: '--bg-accent-light' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Text Colors</h3>
          <div className="color-grid">
            {[
              { name: 'text-primary', value: '#f0f0f0', var: '--text-primary' },
              { name: 'text-secondary', value: '#d0d0d0', var: '--text-secondary' },
              { name: 'text-tertiary', value: '#b0b0b0', var: '--text-tertiary' },
              { name: 'text-inverse', value: '#0a0a0a', var: '--text-inverse' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Accent Colors</h3>
          <div className="color-grid">
            {[
              { name: 'accent-yellow', value: '#ccaa2f', var: '--accent-yellow' },
              { name: 'accent-blue', value: '#3f9cc6', var: '--accent-blue' },
              { name: 'accent-green', value: '#529954', var: '--accent-green' },
              { name: 'accent-purple', value: '#893895', var: '--accent-purple' },
              { name: 'accent-pink', value: '#bd3362', var: '--accent-pink' },
              { name: 'accent-orange', value: '#cc7a00', var: '--accent-orange' },
              { name: 'accent-red', value: '#c74240', var: '--accent-red' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Status Colors</h3>
          <div className="color-grid">
            {[
              { name: 'success', value: '#529954', var: '--success' },
              { name: 'warning', value: '#cc7a00', var: '--warning' },
              { name: 'error', value: '#c74240', var: '--error' },
              { name: 'info', value: '#3f9cc6', var: '--info' },
            ].map((color) => (
              <div key={color.name} className="color-swatch">
                <div
                  className="color-box"
                  style={{
                    background: `var(${color.var})`,
                    border: 'var(--border-thick) solid var(--border-primary)',
                  }}
                />
                <div className="color-info">
                  <div className="color-name">{color.name}</div>
                  <div className="color-value">{color.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section id="typography" className="showcase-section">
        <h2>Typography</h2>

        <div className="panel">
          <h3>Headings</h3>
          <div className="typography-examples">
            <h1>Heading 1 - Extra Large</h1>
            <h2>Heading 2 - Large</h2>
            <h3>Heading 3 - Medium</h3>
            <h4>Heading 4 - Small with Light Background</h4>
            <h5>Heading 5 - Extra Small Uppercase</h5>
          </div>
        </div>

        <div className="panel">
          <h3>Body Text</h3>
          <div className="typography-examples">
            <p>This is regular paragraph text. It has a comfortable line height and readable size for body content.</p>
            <p className="lead">This is lead text - slightly larger and with more spacing for emphasis.</p>
            <p className="text-sm">This is small text for secondary information.</p>
            <small>This is even smaller text for fine print.</small>
          </div>
        </div>

        <div className="panel">
          <h3>Labels & Tags</h3>
          <div className="typography-examples">
            <div className="label">Label Text</div>
            <div className="tag">Tag Text</div>
          </div>
        </div>

        <div className="panel">
          <h3>Font Weights</h3>
          <div className="typography-examples">
            {[
              { weight: 'Light (300)', var: '--weight-light' },
              { weight: 'Regular (400)', var: '--weight-regular' },
              { weight: 'Medium (500)', var: '--weight-medium' },
              { weight: 'Semibold (600)', var: '--weight-semibold' },
              { weight: 'Bold (700)', var: '--weight-bold' },
              { weight: 'Extrabold (800)', var: '--weight-extrabold' },
            ].map((item) => (
              <p key={item.var} style={{ fontWeight: `var(${item.var})` }}>
                {item.weight}
              </p>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Font Sizes</h3>
          <div className="typography-examples">
            {[
              { size: 'Extra Small (12px)', var: '--text-xs' },
              { size: 'Small (14px)', var: '--text-sm' },
              { size: 'Base (16px)', var: '--text-base' },
              { size: 'Large (18px)', var: '--text-lg' },
              { size: 'Extra Large (20px)', var: '--text-xl' },
              { size: '2XL (24px)', var: '--text-2xl' },
              { size: '3XL (30px)', var: '--text-3xl' },
              { size: '4XL (36px)', var: '--text-4xl' },
            ].map((item) => (
              <p key={item.var} style={{ fontSize: `var(${item.var})` }}>
                {item.size}
              </p>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Monospace Font</h3>
          <div className="typography-examples">
            <p style={{ fontFamily: 'var(--font-mono)' }}>Code: const example = "monospace font";</p>
          </div>
        </div>
      </section>

      {/* Layered Panels Section */}
      <section id="panels" className="showcase-section">
        <h2>Layered Panels</h2>

        <div className="panel">
          <h3>Level 1 - Base Panel</h3>
          <p>This is the base panel with secondary background.</p>
          <div className="panel-elevated" style={{ marginTop: 'var(--space-4)' }}>
            <h3>Level 2 - Elevated Panel</h3>
            <p>This is an elevated panel with tertiary background and stronger shadow.</p>
            <div className="panel panel-accent" style={{ marginTop: 'var(--space-4)' }}>
              <h3>Level 3 - Accent Panel</h3>
              <p>This is a panel with yellow accent border, nested three levels deep.</p>
            </div>
          </div>
        </div>

        <div className="panel-elevated">
          <h3>Alternate Layering</h3>
          <p>Elevated panel as level 1.</p>
          <div className="panel" style={{ marginTop: 'var(--space-4)' }}>
            <div className="panel-header-light">
              <h4>Light Header Panel</h4>
            </div>
            <p style={{ marginTop: 'var(--space-4)' }}>Content below the light header.</p>
          </div>
        </div>
      </section>

      {/* Pointer Panels Section */}
      <section id="pointer-panels" className="showcase-section">
        <h2>Pointer Panels</h2>

        <div className="panel">
          <h3>Pointing Panels</h3>
          <p className="text-sm">Panels with arrow pointers that extend from the panel body. Positioned by the anchor point at the tip of the arrow. Perfect for timelines, tooltips, and popovers.</p>
          
          <div style={{ position: 'relative', minHeight: '400px', padding: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
            {/* Top-left */}
            <PointerPanel
              position="top-left"
              style={{ left: '0', top: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Top-left pointing left</div>
            </PointerPanel>

            {/* Top-right */}
            <PointerPanel
              position="top-right"
              style={{ right: '0', top: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Top-right pointing right</div>
            </PointerPanel>

            {/* Center-left */}
            <PointerPanel
              position="center-left"
              style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Center-left pointing left</div>
            </PointerPanel>

            {/* Center-right */}
            <PointerPanel
              position="center-right"
              style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Center-right pointing right</div>
            </PointerPanel>

            {/* Bottom-left */}
            <PointerPanel
              position="bottom-left"
              style={{ left: '0', bottom: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Bottom-left pointing left</div>
            </PointerPanel>

            {/* Bottom-right */}
            <PointerPanel
              position="bottom-right"
              style={{ right: '0', bottom: '0' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Bottom-right pointing right</div>
            </PointerPanel>
          </div>
        </div>

        <div className="panel">
          <h3>Customizable Arrow Size</h3>
          <p className="text-sm">The arrow size can be customized using the arrowSize prop.</p>
          
          <div style={{ position: 'relative', minHeight: '200px', padding: 'var(--space-8)', marginTop: 'var(--space-6)' }}>
            <PointerPanel
              position="center-left"
              arrowSize={12}
              style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Small arrow (12px)</div>
            </PointerPanel>

            <PointerPanel
              position="center-right"
              arrowSize={24}
              style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
            >
              <div style={{ fontSize: 'var(--text-sm)' }}>Large arrow (24px)</div>
            </PointerPanel>
          </div>
        </div>
      </section>

      {/* Buttons Section */}
      <section id="buttons" className="showcase-section">
        <h2>Buttons</h2>

        <div className="panel">
          <h3>Button Variants</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary">Primary Button</Button>
            <Button variant="secondary">Secondary Button</Button>
            <Button variant="ghost">Ghost Button</Button>
          </div>
        </div>

        <div className="panel">
          <h3>Button States</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary">Normal</Button>
            <Button variant="primary" disabled>Disabled</Button>
            <Button variant="secondary">Normal</Button>
            <Button variant="secondary" disabled>Disabled</Button>
            <Button variant="ghost">Normal</Button>
            <Button variant="ghost" disabled>Disabled</Button>
          </div>
        </div>

        <div className="panel">
          <h3>Buttons with Icons</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary" icon={CheckCircle}>Save</Button>
            <Button variant="secondary" icon={X} iconPosition="right">Cancel</Button>
            <Button variant="ghost" icon={Settings}>Settings</Button>
          </div>
        </div>

        <div className="panel">
          <h3>Loading Buttons</h3>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary" loading>Loading...</Button>
            <Button variant="secondary" loading>Processing</Button>
          </div>
        </div>
      </section>

      {/* Form Controls Section */}
      <section id="forms" className="showcase-section">
        <h2>Form Controls</h2>

        <div className="panel">
          <h3>Input Fields</h3>
          <div className="flex flex-col gap-4">
            <Input label="Text Input" placeholder="Enter text here..." />
            <Input label="Input with Icon" icon={Search} placeholder="Search..." />
            <Input label="Disabled Input" placeholder="Disabled input" disabled />
            <Input label="Input with Error" placeholder="Invalid input" error="This field is required" />
            <Input label="Input with Helper Text" helperText="Helper text goes here" placeholder="Enter value" />
            <Input label="Input with Character Count" maxLength={100} showCount placeholder="Type here..." />
            <Textarea label="Textarea" placeholder="Enter multiple lines of text..." />
            <Textarea label="Disabled Textarea" placeholder="Disabled textarea" disabled />
          </div>
        </div>

        <div className="panel">
          <h3>Select Dropdown</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Select Option</label>
              <select className="select">
                <option>Choose an option...</option>
                <option>Option 1</option>
                <option>Option 2</option>
                <option>Option 3</option>
              </select>
            </div>
            <div>
              <label className="label">Disabled Select</label>
              <select className="select" disabled>
                <option>Disabled select</option>
              </select>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Checkboxes</h3>
          <div className="flex flex-col gap-3">
            <Checkbox checked={checkbox1} onCheckedChange={setCheckbox1}>
              Checked checkbox
            </Checkbox>
            <Checkbox checked={checkbox2} onCheckedChange={setCheckbox2}>
              Unchecked checkbox
            </Checkbox>
            <Checkbox checked={false} disabled>
              Disabled checkbox
            </Checkbox>
          </div>
        </div>

        <div className="panel">
          <h3>Radio Buttons</h3>
          <RadioGroup value={radioValue} onValueChange={setRadioValue}>
            <Radio value="option1">Selected radio</Radio>
            <Radio value="option2">Unselected radio</Radio>
            <Radio value="option3" disabled>Disabled radio</Radio>
          </RadioGroup>
        </div>

        <div className="panel">
          <h3>Toggle Switches</h3>
          <div className="flex flex-col gap-3">
            <Toggle checked={toggle1} onCheckedChange={setToggle1}>Toggle ON</Toggle>
            <Toggle checked={toggle2} onCheckedChange={setToggle2}>Toggle OFF</Toggle>
            <Toggle checked={false} disabled>Disabled Toggle</Toggle>
          </div>
        </div>

        <div className="panel">
          <h3>Sliders</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Range Slider ({sliderValue})</label>
              <Slider value={sliderValue} onValueChange={setSliderValue} min={0} max={100} />
            </div>
            <div>
              <label className="label">Slider at 75%</label>
              <Slider value={75} min={0} max={100} disabled />
            </div>
          </div>
        </div>
      </section>

      {/* Progress Bars Section */}
      <section id="progress" className="showcase-section">
        <h2>Progress Bars</h2>

        <div className="panel">
          <h3>Progress Bar Variants</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Progress 25%</label>
              <Progress value={25} />
            </div>
            <div>
              <label className="label">Progress 50%</label>
              <Progress value={50} />
            </div>
            <div>
              <label className="label">Progress 75%</label>
              <Progress value={75} />
            </div>
            <div>
              <label className="label">Progress 100%</label>
              <Progress value={100} />
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Colored Progress Bars</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Success (Green)</label>
              <Progress value={60} variant="success" />
            </div>
            <div>
              <label className="label">Warning (Orange)</label>
              <Progress value={40} variant="warning" />
            </div>
            <div>
              <label className="label">Error (Red)</label>
              <Progress value={30} variant="error" />
            </div>
          </div>
        </div>
      </section>

      {/* Tabs Section */}
      <section id="tabs" className="showcase-section">
        <h2>Tabs</h2>

        <div className="panel">
          <h3>Tab Navigation</h3>
          <Tabs defaultValue="tab1">
            <Tab value="tab1">Tab 1</Tab>
            <Tab value="tab2">Tab 2</Tab>
            <Tab value="tab3">Tab 3</Tab>
            <Tab value="tab4" disabled>Tab 4 (Disabled)</Tab>
            <TabPanel value="tab1">
              <p>Content for Tab 1. Click tabs to see the underline smoothly animate.</p>
            </TabPanel>
            <TabPanel value="tab2">
              <p>Content for Tab 2. This demonstrates the tab switching functionality.</p>
            </TabPanel>
            <TabPanel value="tab3">
              <p>Content for Tab 3. The tabs are fully keyboard accessible.</p>
            </TabPanel>
            <TabPanel value="tab4">
              <p>This tab is disabled.</p>
            </TabPanel>
          </Tabs>
        </div>
      </section>

      {/* Tags Section */}
      <section id="tags" className="showcase-section">
        <h2>Tags</h2>

        <div className="panel">
          <h3>Tag Variants</h3>
          <div className="tag-list">
            <Tag>Default Tag</Tag>
            <Tag variant="blue">Blue Tag</Tag>
            <Tag variant="green">Green Tag</Tag>
            <Tag variant="purple">Purple Tag</Tag>
            <Tag variant="pink">Pink Tag</Tag>
            <Tag active>Active Tag</Tag>
          </div>
        </div>

        <div className="panel">
          <h3>Interactive Tags</h3>
          <div className="tag-list">
            <Tag onRemove={() => alert('Tag removed')}>Removable Tag</Tag>
            <Tag variant="blue" onRemove={() => alert('Blue tag removed')}>Removable Blue</Tag>
          </div>
        </div>
      </section>

      {/* Badges Section */}
      <section id="badges" className="showcase-section">
        <h2>Badges</h2>

        <div className="panel">
          <h3>Badge Variants</h3>
          <div className="flex gap-4 flex-wrap items-center">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="error">Error</Badge>
          </div>
        </div>
      </section>

      {/* Notifications & Toasts Section */}
      <section id="notifications" className="showcase-section">
        <h2>Notifications & Toasts</h2>

        <div className="panel">
          <h3>Message Notifications</h3>
          <p className="text-sm">Informational messages with auto-dismiss timer.</p>
          <div className="flex flex-col gap-4">
            {notificationVisible && (
              <Notification
                variant="info"
                title="Information"
                message="This is an informational message. It will automatically dismiss after a few seconds."
                duration={5000}
                onClose={() => setNotificationVisible(false)}
              />
            )}
            {!notificationVisible && (
              <Button variant="secondary" onClick={() => setNotificationVisible(true)}>
                Show Info Notification
              </Button>
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Warning Notifications</h3>
          <div className="flex flex-col gap-4">
            {notificationWarningVisible && (
              <Notification
                variant="warning"
                title="Warning"
                message="This action cannot be undone. Please review your changes before proceeding."
                duration={5000}
                onClose={() => setNotificationWarningVisible(false)}
              />
            )}
            {!notificationWarningVisible && (
              <Button variant="secondary" onClick={() => setNotificationWarningVisible(true)}>
                Show Warning Notification
              </Button>
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Error Notifications</h3>
          <div className="flex flex-col gap-4">
            {notificationErrorVisible && (
              <Notification
                variant="error"
                title="Error"
                message="Failed to save changes. Please check your connection and try again."
                duration={5000}
                onClose={() => setNotificationErrorVisible(false)}
              />
            )}
            {!notificationErrorVisible && (
              <Button variant="secondary" onClick={() => setNotificationErrorVisible(true)}>
                Show Error Notification
              </Button>
            )}
          </div>
        </div>

        <div className="panel">
          <h3>Toast Variants</h3>
          <p className="text-sm">Compact notification boxes optimized for mobile devices.</p>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary" onClick={() => showToast('success')}>
              Show Success Toast
            </Button>
            <Button variant="primary" onClick={() => showToast('info')}>
              Show Info Toast
            </Button>
            <Button variant="primary" onClick={() => showToast('warning')}>
              Show Warning Toast
            </Button>
            <Button variant="primary" onClick={() => showToast('error')}>
              Show Error Toast
            </Button>
          </div>
        </div>
      </section>

      {/* Dialog Pop-overs Section */}
      <section id="dialogs" className="showcase-section">
        <h2>Dialog Pop-overs</h2>

        <div className="panel">
          <h3>Dialog Modals</h3>
          <p className="text-sm">Modal dialogs that overlay the content, requiring user interaction before continuing.</p>
          <div className="flex gap-4 flex-wrap">
            <Button variant="primary" onClick={() => setDialogOpen(true)}>
              Open Default Dialog
            </Button>
            <Button variant="primary" onClick={() => setDialogSmallOpen(true)}>
              Open Small Dialog
            </Button>
            <Button variant="primary" onClick={() => setDialogLargeOpen(true)}>
              Open Large Dialog
            </Button>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogHeader title="Confirm Action" onClose={() => setDialogOpen(false)} />
          <DialogBody>
            <p>Are you sure you want to proceed with this action? This cannot be undone.</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogOpen(false)}>
              Confirm
            </Button>
          </DialogFooter>
        </Dialog>

        <Dialog open={dialogSmallOpen} onOpenChange={setDialogSmallOpen} size="small">
          <DialogHeader title="Delete Item" onClose={() => setDialogSmallOpen(false)} />
          <DialogBody>
            <p>This item will be permanently deleted. Are you sure?</p>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogSmallOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogSmallOpen(false)}>
              Delete
            </Button>
          </DialogFooter>
        </Dialog>

        <Dialog open={dialogLargeOpen} onOpenChange={setDialogLargeOpen} size="large">
          <DialogHeader title="Edit Details" onClose={() => setDialogLargeOpen(false)} />
          <DialogBody>
            <p>Edit the details below. Make sure all required fields are filled.</p>
            <div className="flex flex-col gap-4" style={{ marginTop: 'var(--space-4)' }}>
              <Input label="Name" placeholder="Enter name" />
              <Textarea label="Description" placeholder="Enter description" />
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDialogLargeOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => setDialogLargeOpen(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </Dialog>
      </section>

      {/* Drawers Section */}
      <section id="drawers" className="showcase-section">
        <h2>Drawers (Mobile Side Panels)</h2>

        <div className="panel">
          <h3>Left Drawer</h3>
          <p className="text-sm">Slide-out panel from the left side, commonly used for navigation menus on mobile devices.</p>
          <Button variant="primary" onClick={() => setDrawerLeftOpen(true)}>
            Open Left Drawer
          </Button>
        </div>

        <div className="panel">
          <h3>Right Drawer</h3>
          <p className="text-sm">Slide-out panel from the right side, commonly used for filters or additional options.</p>
          <Button variant="primary" onClick={() => setDrawerRightOpen(true)}>
            Open Right Drawer
          </Button>
        </div>

        <div className="panel">
          <h3>Bottom Drawer</h3>
          <p className="text-sm">Slide-up panel from the bottom, optimized for mobile devices.</p>
          <Button variant="primary" onClick={() => setDrawerBottomOpen(true)}>
            Open Bottom Drawer
          </Button>
        </div>

        <Drawer open={drawerLeftOpen} onOpenChange={setDrawerLeftOpen} position="left">
          <DrawerHeader title="Navigation" onClose={() => setDrawerLeftOpen(false)} />
          <DrawerBody>
            <DrawerItem icon={FileText} title="Seeds" description="View all your memories" />
            <DrawerItem icon={Clock} title="Timeline" description="Browse by time" />
            <DrawerItem icon={FolderTree} title="Categories" description="Organize by category" />
            <DrawerItem icon={TagsIcon} title="Tags" description="Filter by tags" />
          </DrawerBody>
          <DrawerFooter>
            <Button variant="primary" style={{ width: '100%' }} onClick={() => setDrawerLeftOpen(false)}>
              Settings
            </Button>
            <Button variant="secondary" style={{ width: '100%' }} onClick={() => setDrawerLeftOpen(false)}>
              Help
            </Button>
          </DrawerFooter>
        </Drawer>

        <Drawer open={drawerRightOpen} onOpenChange={setDrawerRightOpen} position="right">
          <DrawerHeader title="Filter Options" onClose={() => setDrawerRightOpen(false)} />
          <DrawerBody>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="label">Sort By</label>
              <select className="select">
                <option>Date (Newest)</option>
                <option>Date (Oldest)</option>
                <option>Title (A-Z)</option>
                <option>Title (Z-A)</option>
              </select>
            </div>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <label className="label">Category</label>
              <div className="flex flex-col gap-3">
                <Checkbox checked={true}>All Categories</Checkbox>
                <Checkbox checked={false}>Work</Checkbox>
                <Checkbox checked={false}>Personal</Checkbox>
              </div>
            </div>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="primary" style={{ width: '100%' }} onClick={() => setDrawerRightOpen(false)}>
              Apply Filters
            </Button>
            <Button variant="secondary" style={{ width: '100%' }} onClick={() => setDrawerRightOpen(false)}>
              Reset
            </Button>
          </DrawerFooter>
        </Drawer>

        <Drawer open={drawerBottomOpen} onOpenChange={setDrawerBottomOpen} position="bottom">
          <DrawerHeader title="Quick Actions" onClose={() => setDrawerBottomOpen(false)} />
          <DrawerBody>
            <DrawerItem icon={Plus} title="Create New Seed" description="Start a new memory" />
            <DrawerItem icon={Search} title="Search" description="Find memories by keyword" />
            <DrawerItem icon={Filter} title="Filter" description="Filter by category or tag" />
            <DrawerItem icon={Share2} title="Share" description="Share this memory" />
          </DrawerBody>
          <DrawerFooter>
            <Button variant="primary" style={{ width: '100%' }} onClick={() => setDrawerBottomOpen(false)}>
              Done
            </Button>
          </DrawerFooter>
        </Drawer>
      </section>

      {/* Shadows and Glows Section */}
      <section id="shadows" className="showcase-section">
        <h2>Shadows and Glows</h2>

        <div className="panel">
          <h3>Sharp Shadows & Elevation</h3>
          <p className="text-sm">The main way to show shadows and elevation in the design system.</p>
          <div className="shadow-demo-grid">
            {[
              { name: 'Small Shadow', var: '--shadow-sm' },
              { name: 'Medium Shadow', var: '--shadow-md' },
              { name: 'Large Shadow', var: '--shadow-lg' },
              { name: 'Extra Large Shadow', var: '--shadow-xl' },
            ].map((shadow) => (
              <div key={shadow.var} className="shadow-demo" style={{ boxShadow: `var(${shadow.var})` }}>
                <div className="shadow-label">{shadow.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Soft Shadows</h3>
          <p className="text-sm">Extremely subtle blurred shadows for rare decorative use.</p>
          <div className="shadow-demo-grid">
            {[
              { name: 'Soft Small', var: '--shadow-soft-sm' },
              { name: 'Soft Medium', var: '--shadow-soft-md' },
              { name: 'Soft Large', var: '--shadow-soft-lg' },
            ].map((shadow) => (
              <div key={shadow.var} className="shadow-demo" style={{ boxShadow: `var(${shadow.var})` }}>
                <div className="shadow-label">{shadow.name}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Glows</h3>
          <p className="text-sm">Subtle glow effects with white or accent colors at 0.2 opacity.</p>
          <div className="shadow-demo-grid">
            {[
              { name: 'White Glow', var: '--glow-white' },
              { name: 'Yellow Glow', var: '--glow-yellow' },
              { name: 'Blue Glow', var: '--glow-blue' },
              { name: 'Green Glow', var: '--glow-green' },
              { name: 'Purple Glow', var: '--glow-purple' },
              { name: 'Pink Glow', var: '--glow-pink' },
              { name: 'Orange Glow', var: '--glow-orange' },
              { name: 'Red Glow', var: '--glow-red' },
            ].map((glow) => (
              <div
                key={glow.var}
                className="shadow-demo"
                style={{
                  boxShadow: `var(${glow.var})`,
                  background: 'var(--bg-tertiary)',
                }}
              >
                <div className="shadow-label">{glow.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animations Section */}
      <section id="animations" className="showcase-section">
        <h2>Animations</h2>

        <div className="panel">
          <h3>Beat Animations</h3>
          <p className="text-sm">Gentle animations that repeat with 1 beat animation (1000ms) followed by 3 beats pause (3000ms).</p>
          <div className="flex gap-4 flex-wrap">
            <div className="animation-demo shake">
              <div className="demo-box">Shake</div>
            </div>
            <div className="animation-demo bounce-subtle">
              <div className="demo-box">Bounce</div>
            </div>
            <div className="animation-demo grow">
              <div className="demo-box">Grow</div>
            </div>
            <div className="animation-demo pulse-glow">
              <div className="demo-box">Pulse Glow</div>
            </div>
          </div>

          <h3>Continuous Animations</h3>
          <p className="text-sm">Animations that repeat continuously without pause.</p>
          <div className="flex gap-4 flex-wrap">
            <div className="animation-demo shake-continuous">
              <div className="demo-box">Shake</div>
            </div>
            <div className="animation-demo bounce-subtle-continuous">
              <div className="demo-box">Bounce</div>
            </div>
            <div className="animation-demo grow-continuous">
              <div className="demo-box">Grow</div>
            </div>
            <div className="animation-demo pulse-glow-continuous">
              <div className="demo-box">Pulse Glow</div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>Hover Animations</h3>
          <p className="text-sm">Animations that activate on hover.</p>
          <div className="flex gap-4 flex-wrap">
            <div className="animation-demo raise-hover">
              <div className="demo-box">Raise (hover)</div>
            </div>
            <div className="animation-demo grow-hover">
              <div className="demo-box">Grow (hover)</div>
            </div>
          </div>
        </div>
      </section>

      {/* Spacing Section */}
      <section id="spacing" className="showcase-section">
        <h2>Spacing System</h2>

        <div className="panel">
          <h3>Spacing Scale</h3>
          <div className="flex flex-col gap-4">
            {[
              { name: 'space-1 (4px)', var: '--space-1' },
              { name: 'space-2 (8px)', var: '--space-2' },
              { name: 'space-4 (16px)', var: '--space-4' },
              { name: 'space-6 (24px)', var: '--space-6' },
              { name: 'space-8 (32px)', var: '--space-8' },
              { name: 'space-12 (48px)', var: '--space-12' },
            ].map((spacing) => (
              <div key={spacing.var} className="flex items-center gap-4">
                <div className="spacing-demo-bar" style={{ width: `var(${spacing.var})` }} />
                <span className="label">{spacing.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Borders Section */}
      <section id="borders" className="showcase-section">
        <h2>Borders</h2>

        <div className="panel">
          <h3>Border Widths</h3>
          <div className="flex flex-col gap-4">
            {[
              { name: 'Thin Border (1px)', var: '--border-thin' },
              { name: 'Medium Border (2px)', var: '--border-medium' },
              { name: 'Thick Border (3px)', var: '--border-thick' },
              { name: 'Extra Thick Border (4px)', var: '--border-extra-thick' },
            ].map((border) => (
              <div
                key={border.var}
                className="border-demo"
                style={{ borderWidth: `var(${border.var})` }}
              >
                {border.name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Iconography Section */}
      <section id="iconography" className="showcase-section">
        <h2>Iconography</h2>

        <div className="panel">
          <h3>Icon Sizes</h3>
          <p className="text-sm">Line-based icons from Lucide (same library used in React components: lucide-react).</p>
          <div className="flex flex-col gap-4">
            {[
              { name: 'XS (12px)', size: 12 },
              { name: 'SM (16px)', size: 16 },
              { name: 'MD (24px)', size: 24 },
              { name: 'LG (32px)', size: 32 },
              { name: 'XL (40px)', size: 40 },
              { name: '2XL (48px)', size: 48 },
            ].map((icon) => (
              <div key={icon.size} className="flex items-center gap-4">
                <span className="label">{icon.name}</span>
                <Clock size={icon.size} />
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Common Icons</h3>
          <p className="text-sm">Icons used in the Memoriae application from Lucide icon library.</p>
          <div className="icon-grid">
            {[
              { icon: FileText, name: 'FileText' },
              { icon: Clock, name: 'Clock' },
              { icon: FolderTree, name: 'FolderTree' },
              { icon: TagsIcon, name: 'Tags' },
              { icon: Settings, name: 'Settings' },
              { icon: Search, name: 'Search' },
              { icon: Plus, name: 'Plus' },
              { icon: X, name: 'X' },
              { icon: CheckCircle, name: 'CheckCircle' },
              { icon: AlertTriangle, name: 'AlertTriangle' },
              { icon: XCircle, name: 'XCircle' },
              { icon: Info, name: 'Info' },
            ].map((item) => (
              <div key={item.name} className="icon-showcase">
                <item.icon size={24} />
                <span className="icon-label">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="style-guide-footer">
        <p className="text-sm">Memoriae Style Guide - Complete Design System Showcase</p>
      </footer>
    </div>
  );
}

export function StyleGuide() {
  return (
    <ToastProvider>
      <StyleGuideContent />
    </ToastProvider>
  );
}
