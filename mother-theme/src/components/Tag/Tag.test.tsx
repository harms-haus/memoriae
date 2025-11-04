import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Tag } from './Tag';
import { createUserEvent } from '../../test/utils';

describe('Tag', () => {
  describe('Rendering', () => {
    it('should render tag with children', () => {
      render(<Tag>Test Tag</Tag>);
      
      expect(screen.getByText('Test Tag')).toBeInTheDocument();
    });

    it('should apply default variant class', () => {
      const { container } = render(<Tag>Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-item');
      expect(tag).not.toHaveClass('tag-blue');
    });

    it('should apply variant classes', () => {
      const { container, rerender } = render(<Tag variant="blue">Test</Tag>);
      
      let tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-blue');

      rerender(<Tag variant="green">Test</Tag>);
      tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-green');

      rerender(<Tag variant="purple">Test</Tag>);
      tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-purple');

      rerender(<Tag variant="pink">Test</Tag>);
      tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-pink');
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
      
      render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = screen.getByText('Test');
      await user.click(tag);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Tag onClick={handleClick} disabled>Test</Tag>);
      
      const tag = screen.getByText('Test');
      await user.click(tag);
      
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when onClick is not provided', async () => {
      const user = createUserEvent();
      
      render(<Tag>Test</Tag>);
      
      const tag = screen.getByText('Test');
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
      
      render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = screen.getByText('Test');
      tag.focus();
      await user.keyboard('{Enter}');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should call onClick on Space key', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = screen.getByText('Test');
      tag.focus();
      await user.keyboard(' ');
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should have tabIndex when onClick is provided', () => {
      render(<Tag onClick={() => {}}>Test</Tag>);
      
      const tag = screen.getByText('Test');
      expect(tag).toHaveAttribute('tabIndex', '0');
    });

    it('should not have tabIndex when onClick is not provided', () => {
      render(<Tag>Test</Tag>);
      
      const tag = screen.getByText('Test');
      expect(tag).not.toHaveAttribute('tabIndex');
    });
  });

  describe('Variant Classes', () => {
    it('should explicitly apply default variant (no variant class)', () => {
      const { container } = render(<Tag variant="default">Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-item');
      expect(tag).not.toHaveClass('tag-blue');
      expect(tag).not.toHaveClass('tag-green');
      expect(tag).not.toHaveClass('tag-purple');
      expect(tag).not.toHaveClass('tag-pink');
    });

    it('should explicitly apply blue variant class', () => {
      const { container } = render(<Tag variant="blue">Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-blue');
    });

    it('should explicitly apply green variant class', () => {
      const { container } = render(<Tag variant="green">Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-green');
    });

    it('should explicitly apply purple variant class', () => {
      const { container } = render(<Tag variant="purple">Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-purple');
    });

    it('should explicitly apply pink variant class', () => {
      const { container } = render(<Tag variant="pink">Test</Tag>);
      
      const tag = container.querySelector('.tag-item');
      expect(tag).toHaveClass('tag-pink');
    });
  });

  describe('Edge Cases', () => {
    it('should handle onClick without onRemove', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      
      render(<Tag onClick={handleClick}>Test</Tag>);
      
      const tag = screen.getByText('Test');
      await user.click(tag);
      
      expect(handleClick).toHaveBeenCalledTimes(1);
      expect(screen.queryByLabelText('Remove tag')).not.toBeInTheDocument();
    });

    it('should handle onRemove without onClick', async () => {
      const user = createUserEvent();
      const handleRemove = vi.fn();
      
      render(<Tag onRemove={handleRemove}>Test</Tag>);
      
      const removeButton = screen.getByLabelText('Remove tag');
      await user.click(removeButton);
      
      expect(handleRemove).toHaveBeenCalledTimes(1);
      // Should not have button role when no onClick
      expect(screen.getByText('Test')).not.toHaveAttribute('role', 'button');
    });

    it('should handle both onClick and onRemove', async () => {
      const user = createUserEvent();
      const handleClick = vi.fn();
      const handleRemove = vi.fn();
      
      render(<Tag onClick={handleClick} onRemove={handleRemove}>Test</Tag>);
      
      // Click tag
      await user.click(screen.getByText('Test'));
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

