import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  children = null,
  className = '',
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const classes = [
    `btn-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const isDisabled = disabled || loading;

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isDisabled || !onClick) return;
    onClick(e);
  };

  const renderIcon = () => {
    if (loading) {
      return <Loader2 className="button-spinner animation-spin" size={16} />;
    }
    if (Icon) {
      return <Icon size={16} />;
    }
    return null;
  };

  const iconElement = renderIcon();
  const hasChildren = Boolean(children);
  const iconMarginClass = hasChildren ? 'button-icon-spaced' : '';

  return (
    <button
      type="button"
      className={classes}
      disabled={isDisabled}
      onClick={handleClick}
      aria-disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {iconElement && iconPosition === 'left' && (
        <span className={`flex-center button-icon-left ${iconMarginClass}`}>
          {iconElement}
        </span>
      )}
      {children}
      {iconElement && iconPosition === 'right' && (
        <span className={`flex-center button-icon-right ${iconMarginClass}`}>
          {iconElement}
        </span>
      )}
    </button>
  );
}

