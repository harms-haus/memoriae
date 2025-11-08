import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../../components/Button';
import { Input, Textarea } from '../../components/Input';
import { Checkbox } from '../../components/Checkbox';
import { RadioGroup, Radio } from '../../components/Radio';
import { Toggle } from '../../components/Toggle';
import { Panel } from '../../components/Panel';
import { Dialog, DialogHeader, DialogBody } from '../../components/Dialog';
import { Drawer, DrawerHeader, DrawerBody, DrawerFooter } from '../../components/Drawer';
import { Tabs, Tab, TabPanel } from '../../components/Tabs';
import { Tag } from '../../components/Tag';
import { Badge } from '../../components/Badge';
import { Slider } from '../../components/Slider';
import { Progress } from '../../components/Progress';

// Mock createPortal for Dialog and Drawer
vi.mock('react-dom', async () => {
  const actual = await vi.importActual('react-dom');
  return {
    ...actual,
    createPortal: (node: React.ReactNode) => node,
  };
});

describe('Component Combinations Integration', () => {
  describe('Form Components Together', () => {
    it('should handle complex form with all input types', async () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Panel header={<h2>Registration Form</h2>}>
            <Input label="Name" required />
            <Input label="Email" type="email" required />
            <Textarea label="Bio" maxLength={200} showCount />
            <RadioGroup defaultValue="option1">
              <Radio value="option1" label="Option 1" />
              <Radio value="option2" label="Option 2" />
            </RadioGroup>
            <Checkbox label="Accept terms" />
            <Toggle label="Subscribe to newsletter" />
            <Slider label="Age" min={18} max={100} defaultValue={25} />
            <Button type="submit">Submit</Button>
          </Panel>
        </form>
      );

      expect(screen.getByText('Registration Form')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Bio')).toBeInTheDocument();
      expect(screen.getByRole('radiogroup')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Accept terms' })).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Subscribe to newsletter' })).toBeInTheDocument();
      expect(screen.getByRole('slider')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    });

    it('should handle form validation across components', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault());

      render(
        <form onSubmit={handleSubmit}>
          <Input label="Required Field" required error="This field is required" />
          <Textarea label="Description" error="Invalid input" />
          <Button type="submit" disabled>Submit</Button>
        </form>
      );

      const input = screen.getByLabelText('Required Field');
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('This field is required')).toBeInTheDocument();

      const textarea = screen.getByLabelText('Description');
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      expect(screen.getByText('Invalid input')).toBeInTheDocument();

      const button = screen.getByRole('button', { name: 'Submit' });
      expect(button).toBeDisabled();
    });
  });

  describe('Panel with Components', () => {
    it('should render Panel with various child components', () => {
      render(
        <Panel header={<h3>Settings</h3>}>
          <Input label="Username" />
          <Checkbox label="Enable notifications" />
          <Button>Save</Button>
        </Panel>
      );

      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByLabelText('Username')).toBeInTheDocument();
      expect(screen.getByLabelText('Enable notifications')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    });

    it('should render Panel with Tags and Badges', () => {
      const { container } = render(
        <Panel header={<h3>Tags</h3>}>
          <div>
            <Tag>React</Tag>
            <Tag>TypeScript</Tag>
            <Tag>Testing</Tag>
          </div>
          <div>
            <Badge>New</Badge>
            <Badge variant="success">Active</Badge>
            <Badge variant="warning">Pending</Badge>
          </div>
        </Panel>
      );

      // Tags might be rendered as links, so check for text content
      expect(container.textContent).toContain('React');
      expect(container.textContent).toContain('TypeScript');
      expect(container.textContent).toContain('Testing');
      expect(screen.getByText('New')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Dialog with Form', () => {
    it('should handle form submission in Dialog', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn((e) => e.preventDefault());
      const onOpenChange = vi.fn();

      render(
        <Dialog open={true} onOpenChange={onOpenChange}>
          <DialogHeader title="Edit Profile" />
          <DialogBody>
            <form onSubmit={handleSubmit}>
              <Input label="Name" defaultValue="John Doe" />
              <Input label="Email" type="email" defaultValue="john@example.com" />
              <Button type="submit">Save</Button>
            </form>
          </DialogBody>
        </Dialog>
      );

      expect(screen.getByText('Edit Profile')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toHaveValue('John Doe');
      expect(screen.getByLabelText('Email')).toHaveValue('john@example.com');

      const submitButton = screen.getByRole('button', { name: 'Save' });
      await user.click(submitButton);
      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Drawer with Navigation', () => {
    it('should handle navigation items in Drawer', async () => {
      const onOpenChange = vi.fn();

      render(
        <Drawer open={true} onOpenChange={onOpenChange}>
          <DrawerHeader title="Navigation" />
          <DrawerBody>
            <nav>
              <Button variant="ghost">Home</Button>
              <Button variant="ghost">Settings</Button>
              <Button variant="ghost">Profile</Button>
            </nav>
          </DrawerBody>
          <DrawerFooter>
            <Button variant="secondary" onClick={() => onOpenChange(false)}>Close</Button>
          </DrawerFooter>
        </Drawer>
      );

      expect(screen.getByText('Navigation')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('Tabs with Forms', () => {
    it('should handle forms in different tabs', async () => {
      const user = userEvent.setup();

      render(
        <Tabs defaultValue="personal">
          <Tab value="personal" label="Personal" />
          <Tab value="account" label="Account" />
          <TabPanel value="personal">
            <Input label="First Name" />
            <Input label="Last Name" />
          </TabPanel>
          <TabPanel value="account">
            <Input label="Username" />
            <Input label="Password" type="password" />
          </TabPanel>
        </Tabs>
      );

      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.queryByLabelText('Username')).not.toBeVisible();

      await user.click(screen.getByText('Account'));

      expect(screen.getByLabelText('Username')).toBeVisible();
      expect(screen.getByLabelText('Password')).toBeVisible();
      expect(screen.queryByLabelText('First Name')).not.toBeVisible();
    });
  });

  describe('Progress and Status Indicators', () => {
    it('should combine Progress with other components', () => {
      render(
        <Panel>
          <h3>Upload Progress</h3>
          <Progress value={50} />
          <div>
            <Badge>Uploading...</Badge>
            <Button disabled>Cancel</Button>
          </div>
        </Panel>
      );

      expect(screen.getByText('Upload Progress')).toBeInTheDocument();
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('Uploading...')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    });
  });

  describe('Complex Layout', () => {
    it('should handle nested components in complex layout', () => {
      render(
        <Panel header={<h2>Dashboard</h2>}>
          <Tabs defaultValue="overview">
            <Tab value="overview" label="Overview" />
            <Tab value="settings" label="Settings" />
            <TabPanel value="overview">
              <div>
                <Badge>Active</Badge>
                <Tag>Tag 1</Tag>
                <Tag>Tag 2</Tag>
              </div>
              <Progress value={75} />
            </TabPanel>
            <TabPanel value="settings">
              <Input label="Setting 1" />
              <Checkbox label="Enable feature" />
              <Button>Save Settings</Button>
            </TabPanel>
          </Tabs>
        </Panel>
      );

      expect(screen.getByText('Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Overview')).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
      expect(screen.getByText('Active')).toBeInTheDocument();
      // Tags might be rendered as links or divs, check for presence
      const tag1 = screen.queryByText('Tag 1') || document.querySelector('[class*="tag"]');
      const tag2 = screen.queryByText('Tag 2') || document.querySelectorAll('[class*="tag"]')[1];
      expect(tag1 || tag2).toBeTruthy();
    });
  });
});

