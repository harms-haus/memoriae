import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tag } from './Tag';
import { createUserEvent } from '../../test/utils';

describe('Tag', () => {
  describe('Rendering', () => {
    it('should render tag with children', () => {
      const { container } = render(<Tag>Test Tag</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toBeInTheDocument();
      expect(tag?.textContent).toContain('Test Tag');
    });

    it('should apply default color', () => {
      const { container } = render(<Tag>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag).toHaveClass('tag-item');
      expect(tag.style.color).toBe('var(--text-primary)');
    });

    it('should apply color prop', () => {
      const { container, rerender } = render(<Tag color="var(--accent-blue)">Test</Tag>);
      
      let tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-blue)');

      rerender(<Tag color="var(--accent-green)">Test</Tag>);
      tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-green)');

      rerender(<Tag color="var(--accent-purple)">Test</Tag>);
      tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-purple)');

      rerender(<Tag color="var(--accent-pink)">Test</Tag>);
      tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-pink)');
    });

    it('should apply active class when active', () => {
      const { container } = render(<Tag active>Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('active');
    });
  });

  describe('Click Handling', () => {
    it('should call onClick when clicked', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      const { container } = render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      await user.click(tag);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      const { container } = render(<Tag onClick={handleClick} disabled>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      await user.click(tag);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when onClick is not provided', async () => {
      const user = createUserEvent();
      
      const { container } = render(<Tag>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      await user.click(tag);
      
      // Should not throw or error
      expect(tag).toBeInTheDocument();
    });
  });

  describe('Remove Button', () => {
    it('should show remove button when onRemove is provided', () => {
      const handleRemove = vi.fn();
      render(<Tag onRemove={handleRemove}>Test</Tag>);
      
      const removeButton = screen.getByLabelText('Remove tag');
      expect(removeButton).toBeInTheDocument();
    });

    it('should not show remove button when onRemove is not provided', () => {
      render(<Tag>Test</Tag>);
      
      const removeButton = screen.queryByLabelText('Remove tag');
      expect(removeButton).not.toBeInTheDocument();
    });

    it('should call onRemove when remove button is clicked', async () => {
      const user = createUserEvent();
      const handleRemove = vi.fn();
      
      render(<Tag onRemove={handleRemove}>Test</Tag>);
      
      const removeButton = screen.getByLabelText('Remove tag');
      await user.click(removeButton);
      
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });

    it('should not call onRemove when disabled', async () => {
      const user = createUserEvent();
      const handleRemove = vi.fn();
      
      render(<Tag onRemove={handleRemove} disabled>Test</Tag>);
      
      const removeButton = screen.getByLabelText('Remove tag');
      await user.click(removeButton);
      
      expect(handleRemove).not.toHaveBeenCalled();
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onClick on Enter key', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      const { container } = render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      tag.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick on Space key', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      const { container } = render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      tag.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have tabIndex when onClick is provided', () => {
      const { container } = render(<Tag onClick={() => {}}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag).toHaveAttribute('tabIndex', '0');
    });

    it('should not have tabIndex when onClick is not provided', () => {
      const { container } = render(<Tag>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Color Prop', () => {
    it('should apply default color when no color prop provided', () => {
      const { container } = render(<Tag>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag).toHaveClass('tag-item');
      expect(tag.style.color).toBe('var(--text-primary)');
    });

    it('should apply blue color', () => {
      const { container } = render(<Tag color="var(--accent-blue)">Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-blue)');
    });

    it('should apply green color', () => {
      const { container } = render(<Tag color="var(--accent-green)">Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-green)');
    });

    it('should apply purple color', () => {
      const { container } = render(<Tag color="var(--accent-purple)">Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-purple)');
    });

    it('should apply pink color', () => {
      const { container } = render(<Tag color="var(--accent-pink)">Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag.style.color).toBe('var(--accent-pink)');
    });
  });

  describe('Edge Cases', () => {
    it('should handle onClick without onRemove', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      const { container } = render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      await user.click(tag);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText('Remove tag')).not.toBeInTheDocument();
    });

    it('should handle onRemove without onClick', async () => {
      const user = createUserEvent();
      const handleRemove = vi.fn();
      
      const { container } = render(<Tag onRemove={handleRemove}>Test</Tag>);
      
      const removeButton = screen.getByLabelText('Remove tag');
      await user.click(removeButton);
      
      expect(handleRemove).toHaveBeenCalledTimes(1);
      // Should not have button role when no onClick
      const tag = container.querySelector('.tag-item') as HTMLElement;
      expect(tag).not.toHaveAttribute('role', 'button');
    });

    it('should handle both onClick and onRemove', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      const handleRemove = vi.fn();
      
      const { container } = render(<Tag onClick={handleClick} onRemove={handleRemove}>Test</Tag>);
      
      // Click tag
      const tag = container.querySelector('.tag-item') as HTMLElement;
      await user.click(tag);
      expect(handleClick).toHaveBeenCalledTimes(1);
      
      // Click remove button
      const removeButton = screen.getByLabelText('Remove tag');
      await user.click(removeButton);
      expect(handleRemove).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('should have role="button" when onClick is provided', () => {
      render(<Tag onClick={() => {}}>Test</Tag>);
      
      const tag = screen.getByRole('button');
      expect(tag).toBeInTheDocument();
    });

    it('should have aria-disabled when disabled', () => {
      render(<Tag disabled onClick={() => {}}>Test</Tag>);
      
      const tag = screen.getByRole('button');
      expect(tag).toHaveAttribute('aria-disabled', 'true');
    });

    it('should have proper cursor style', () => {
      const { container } = render(<Tag onClick={() => {}}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      // Should have cursor-pointer class when clickable
      expect(tag.classList.contains('cursor-pointer')).toBe(true);
    });

    it('should have not-allowed cursor when disabled', () => {
      const { container } = render(<Tag disabled onClick={() => {}}>Test</Tag>);
      
      const tag = container.querySelector('.tag-item') as HTMLElement;
      // Should have cursor-not-allowed class when disabled
      expect(tag.classList.contains('cursor-not-allowed')).toBe(true);
    });
  });
});

