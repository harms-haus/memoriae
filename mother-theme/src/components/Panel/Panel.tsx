import React from 'react';

export interface PanelProps {
  variant?: 'default' | 'elevated' | 'accent';
  header?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Panel({
  variant = 'default',
  header,
  children,
  className = '',
}: PanelProps) {
  const classes = [
    'panel',
    variant === 'elevated' ? 'panel-elevated' : '',
    variant === 'accent' ? 'panel-accent' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes}>
      {header && (
        <div className="panel-header-light">
          {header}
        </div>
      )}
      {children}
    </div>
  );
}



