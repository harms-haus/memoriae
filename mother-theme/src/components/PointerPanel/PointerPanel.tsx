import React from 'react';
import './PointerPanel.css';

export type PointerPosition = 
  | 'top-left' 
  | 'top-right' 
  | 'center-left' 
  | 'center-right' 
  | 'bottom-left' 
  | 'bottom-right';

export interface PointerPanelProps {
  position: PointerPosition;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  /**
   * Size of the arrow pointer in pixels (default: 16px)
   */
  arrowSize?: number;
}

export function PointerPanel({
  position,
  children,
  className = '',
  style,
  arrowSize = 16,
}: PointerPanelProps) {
  const positionClass = `pointer-panel-${position}`;
  
  return (
    <div
      className={`pointer-panel ${positionClass} ${className}`}
      style={{
        ...style,
        '--pointer-size': `${arrowSize}px`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

