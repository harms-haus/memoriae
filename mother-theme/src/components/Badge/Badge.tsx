import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
}

export function Badge({
  children,
  variant = 'primary',
  className = '',
}: BadgeProps) {
  const classes = [
    'badge',
    `badge-${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes}>
      {children}
    </span>
  );
}

