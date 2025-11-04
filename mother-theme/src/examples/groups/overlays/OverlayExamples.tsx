import { useState } from 'react';
import '../../../styles/theme.css';
import {
  Button,
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
  Input,
  Textarea,
  Checkbox,
} from '../../../components';
import { FileText, Clock, FolderTree, Tags as TagsIcon, Plus, Search, Filter, Share2 } from 'lucide-react';
import { ExampleSection } from '../../shared/ExampleSection';
import './OverlayExamples.css';

function OverlayExamplesContent() {
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
    <div className="examples-container">
      <header className="examples-header">
        <h1>Overlays</h1>
        <p className="lead">Modal dialogs, drawers, notifications, and toasts</p>
      </header>

      {/* Notifications & Toasts Section */}
      <ExampleSection id="notifications" title="Notifications & Toasts">
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
      </ExampleSection>

      {/* Dialog Pop-overs Section */}
      <ExampleSection id="dialogs" title="Dialog Pop-overs">
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
      </ExampleSection>

      {/* Drawers Section */}
      <ExampleSection id="drawers" title="Drawers (Mobile Side Panels)">
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
      </ExampleSection>
    </div>
  );
}

export function OverlayExamples() {
  return (
    <ToastProvider>
      <OverlayExamplesContent />
    </ToastProvider>
  );
}

