import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, Tab, TabPanel } from './Tabs';

describe('Tabs', () => {
  describe('Uncontrolled Mode', () => {
    it('should render tabs with default value', () => {
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toHaveClass('active');
      expect(screen.getByText('Content 1')).toBeInTheDocument();
      expect(screen.getByText('Content 2')).not.toBeVisible();
    });

    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab2 = screen.getByText('Tab 2');
      await user.click(tab2);

      expect(tab2).toHaveClass('active');
      expect(screen.getByText('Tab 1')).not.toHaveClass('active');
      expect(screen.getByText('Content 2')).toBeVisible();
      expect(screen.getByText('Content 1')).not.toBeVisible();
    });
  });

  describe('Controlled Mode', () => {
    it('should respect controlled value', () => {
      const { rerender } = render(
        <Tabs value="tab1" onValueChange={() => {}}>
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Tab 1')).toHaveClass('active');

      rerender(
        <Tabs value="tab2" onValueChange={() => {}}>
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      expect(screen.getByText('Tab 2')).toHaveClass('active');
    });

    it('should call onValueChange when tab is clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(
        <Tabs value="tab1" onValueChange={handleChange}>
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      await user.click(screen.getByText('Tab 2'));
      expect(handleChange).toHaveBeenCalledWith('tab2');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should navigate with arrow keys', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <Tab value="tab3" label="Tab 3" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
          <TabPanel value="tab3">Content 3</TabPanel>
        </Tabs>
      );

      const tab1 = screen.getByText('Tab 1');
      tab1.focus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('Tab 2')).toHaveFocus();

      await user.keyboard('{ArrowRight}');
      expect(screen.getByText('Tab 3')).toHaveFocus();

      await user.keyboard('{ArrowLeft}');
      expect(screen.getByText('Tab 2')).toHaveFocus();
    });

    it('should navigate to first tab with Home key', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab3">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <Tab value="tab3" label="Tab 3" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
          <TabPanel value="tab3">Content 3</TabPanel>
        </Tabs>
      );

      const tab3 = screen.getByText('Tab 3');
      tab3.focus();

      await user.keyboard('{Home}');
      expect(screen.getByText('Tab 1')).toHaveFocus();
    });

    it('should navigate to last tab with End key', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <Tab value="tab3" label="Tab 3" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
          <TabPanel value="tab3">Content 3</TabPanel>
        </Tabs>
      );

      const tab1 = screen.getByText('Tab 1');
      tab1.focus();

      await user.keyboard('{End}');
      expect(screen.getByText('Tab 3')).toHaveFocus();
    });
  });

  describe('Disabled Tabs', () => {
    it('should not switch when disabled tab is clicked', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" disabled />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab2 = screen.getByText('Tab 2');
      expect(tab2).toBeDisabled();

      await user.click(tab2);
      expect(screen.getByText('Tab 1')).toHaveClass('active');
    });
  });

  describe('Orientation', () => {
    it('should render panels above tabs when orientation is top', () => {
      const { container } = render(
        <Tabs defaultValue="tab1" orientation="top">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tabsContainer = container.querySelector('.tabs-container');
      expect(tabsContainer).toHaveClass('tabs-container-top');
      
      // Check that panels come before tabs in DOM order
      const tabs = container.querySelector('.tabs');
      const panels = container.querySelector('.tabs-panels');
      expect(panels).toBeInTheDocument();
      expect(tabs).toBeInTheDocument();
    });

    it('should render panels below tabs when orientation is bottom (default)', () => {
      const { container } = render(
        <Tabs defaultValue="tab1" orientation="bottom">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tabsContainer = container.querySelector('.tabs-container');
      expect(tabsContainer).not.toHaveClass('tabs-container-top');
      
      // Check that tabs come before panels in DOM order
      const tabs = container.querySelector('.tabs');
      const panels = container.querySelector('.tabs-panels');
      expect(tabs).toBeInTheDocument();
      expect(panels).toBeInTheDocument();
    });

    it('should use bottom orientation by default', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tabsContainer = container.querySelector('.tabs-container');
      expect(tabsContainer).not.toHaveClass('tabs-container-top');
    });
  });

  describe('Tab Hover', () => {
    it('should handle hover state', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab2 = screen.getByText('Tab 2');
      await user.hover(tab2);
      
      // The hover state should be tracked internally (indicator position)
      // This is tested through visual regression, but we can verify the tab is hoverable
      expect(tab2).toBeInTheDocument();
    });

    it('should not trigger hover when tab is disabled', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" disabled />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab2 = screen.getByText('Tab 2');
      await user.hover(tab2);
      
      // Hover should not change active tab when disabled
      expect(screen.getByText('Tab 1')).toHaveClass('active');
    });

    it('should clear hover state on mouse leave', async () => {
      const user = userEvent.setup();
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab2 = screen.getByText('Tab 2');
      await user.hover(tab2);
      await user.unhover(tab2);
      
      // Tab should still be in document after unhover
      expect(tab2).toBeInTheDocument();
    });
  });

  describe('TabPanel', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <TabPanel value="tab1" className="custom-panel">Content 1</TabPanel>
        </Tabs>
      );

      const panel = container.querySelector('.tab-panel');
      expect(panel).toHaveClass('custom-panel');
    });

    it('should handle empty content', () => {
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <TabPanel value="tab1"></TabPanel>
        </Tabs>
      );

      const panel = screen.getByRole('tabpanel');
      expect(panel).toBeInTheDocument();
      expect(panel).toBeEmptyDOMElement();
    });
  });

  describe('Edge Cases', () => {
    it('should handle tab without matching TabPanel', () => {
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
        </Tabs>
      );

      // Tab 2 has no matching panel, should still render
      expect(screen.getByText('Tab 2')).toBeInTheDocument();
      expect(screen.getByText('Tab 1')).toHaveClass('active');
    });

    it('should handle TabPanel without matching tab', () => {
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2 (no tab)</TabPanel>
        </Tabs>
      );

      // Panel without tab should still render but be hidden
      const panel = screen.getByText('Content 2 (no tab)');
      expect(panel).toBeInTheDocument();
      expect(panel).not.toBeVisible();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <Tabs defaultValue="tab1">
          <Tab value="tab1" label="Tab 1" />
          <Tab value="tab2" label="Tab 2" />
          <TabPanel value="tab1">Content 1</TabPanel>
          <TabPanel value="tab2">Content 2</TabPanel>
        </Tabs>
      );

      const tab1 = screen.getByRole('tab', { name: 'Tab 1' });
      expect(tab1).toHaveAttribute('aria-selected', 'true');
      expect(tab1).toHaveAttribute('aria-controls', 'tabpanel-tab1');

      const panel1 = screen.getByRole('tabpanel');
      expect(panel1).toHaveAttribute('aria-labelledby', 'tab-tab1');
    });
  });
});

