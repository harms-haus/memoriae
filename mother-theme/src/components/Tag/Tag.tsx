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

  return (
    <div
      className={classes}
      role={onClick ? 'button' : undefined}
      tabIndex={tabIndex}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled}
      style={{ cursor: disabled ? 'not-allowed' : onClick ? 'pointer' : 'default' }}
    >
      {children}
      {onRemove && (
        <button
          type="button"
          className="tag-remove"
          onClick={handleRemove}
          disabled={disabled}
          aria-label="Remove tag"
          style={{
            marginLeft: '0.5rem',
            background: 'none',
            border: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            padding: '0',
            color: 'inherit',
          }}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

