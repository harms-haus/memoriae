import React from 'react';
import { Loader2, LucideIcon } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  children,
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
      return <Loader2 className="button-spinner" size={16} style={{ animation: 'spin 1s linear infinite' }} />;
    }
    if (Icon) {
      return <Icon size={16} />;
    }
    return null;
  };

  const iconElement = renderIcon();

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
        <span style={{ marginRight: children ? '0.5rem' : '0', display: 'inline-flex', alignItems: 'center' }}>
          {iconElement}
        </span>
      )}
      {children}
      {iconElement && iconPosition === 'right' && (
        <span style={{ marginLeft: children ? '0.5rem' : '0', display: 'inline-flex', alignItems: 'center' }}>
          {iconElement}
        </span>
      )}
    </button>
  );
}

