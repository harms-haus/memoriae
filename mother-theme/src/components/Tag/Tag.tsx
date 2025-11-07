import React from 'react';
import { X } from 'lucide-react';

export interface TagProps {
  children: React.ReactNode;
  color?: string; // CSS color value (hex, rgb, or CSS variable)
  active?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
  className?: string;
  href?: string; // Optional href for link navigation
}

export function Tag({
  children,
  color,
  active = false,
  onClick,
  onRemove,
  disabled = false,
  className = '',
  href,
}: TagProps) {
  // Extract tag name from children (could be string or ReactNode)
  const tagName = typeof children === 'string' ? children : String(children);
  // Default href is tag route, unless onClick is provided (then it's a button-like element)
  const tagHref = href || (onClick ? undefined : `/seeds/tag/${encodeURIComponent(tagName)}`);

  // Use ref to set color with !important to override CSS rules
  const elementRef = React.useRef<HTMLAnchorElement | HTMLDivElement>(null);
  const tagColor = color || 'var(--text-primary)';

  React.useEffect(() => {
    if (elementRef.current) {
      elementRef.current.style.setProperty('color', tagColor, 'important');
    }
  }, [tagColor]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
    }
    // If no onClick, let the link navigate naturally
  };

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || !onRemove) return;
    e.preventDefault();
    e.stopPropagation();
    onRemove();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement | HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      if (onClick) {
        e.preventDefault();
        onClick();
      }
    }
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
    e.currentTarget.style.textDecoration = 'underline';
    e.currentTarget.style.setProperty('color', tagColor, 'important');
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLAnchorElement | HTMLDivElement>) => {
    e.currentTarget.style.textDecoration = 'none';
    e.currentTarget.style.setProperty('color', tagColor, 'important');
  };

  const classes = [
    'tag-item',
    active ? 'active' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const style: React.CSSProperties = {
    textDecoration: 'none',
  };

  const content = (
    <>
      #{tagName}
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
    </>
  );

  // If href is provided or no onClick, render as link
  if (tagHref && !onClick) {
    return (
      <a
        ref={elementRef as React.RefObject<HTMLAnchorElement>}
        href={tagHref}
        className={`${classes} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        style={style}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-disabled={disabled}
      >
        {content}
      </a>
    );
  }

  // Otherwise render as div/button-like element
  return (
    <div
      ref={elementRef as React.RefObject<HTMLDivElement>}
      className={`${classes} ${disabled ? 'cursor-not-allowed' : onClick ? 'cursor-pointer' : ''}`}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-disabled={disabled}
      style={style}
    >
      {content}
    </div>
  );
}

