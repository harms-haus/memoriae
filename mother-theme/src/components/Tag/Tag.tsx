import React from 'react';
import { X } from 'lucide-react';

export interface TagProps {
  children: React.ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'purple' | 'pink';
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
}

export function Tag({
  children,
  variant = 'default',
  active = false,
  onClick,
  onRemove,
  disabled = false,
  className = '',
}: TagProps) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    e.stopPropagation();
    onClick();
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !onRemove) return;
    e.stopPropagation();
    onRemove();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled || !onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  const classes = [
    'tag-item',
    variant !== 'default' ? `tag-${variant}` : '',
    active ? 'active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const tabIndex = onClick && !disabled ? 0 : undefined;
  
  const cursorClass = disabled 
    ? 'cursor-not-allowed' 
    : onClick 
      ? 'cursor-pointer' 
      : '';

  return (
    <div
      className={`${classes} ${cursorClass}`}
      role={onClick ? 'button' : undefined}
      tabIndex={tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className={`tag-remove flex-center ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          onClick={handleRemove}
          disabled={disabled}
          aria-label="Remove tag"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

