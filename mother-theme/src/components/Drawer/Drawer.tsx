import React, { useEffect, useRef, useState, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, type LucideIcon } from 'lucide-react';

export interface DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  position?: 'left' | 'right' | 'top' | 'bottom';
  size?: 'default' | 'wide';
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

export function Drawer({
  open,
  onOpenChange,
  position = 'left',
  size = 'default',
  children,
  className,
  closeOnBackdropClick = true,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);

  // Handle opening/closing state
  useEffect(() => {
    if (open) {
      setIsClosing(false);
      setShouldRender(true);
      return undefined;
    } else if (shouldRender) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
        setIsClosing(false);
      }, 300); // Match --drawer-animation-duration
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [open, shouldRender]);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      return () => {
        document.body.style.overflow = originalOverflow;
        previousActiveElement.current?.focus();
      };
    }
    return undefined;
  }, [open]);

  // Escape key handling
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === overlayRef.current) {
      onOpenChange(false);
    }
  };

  if (!shouldRender) return null;

  const positionClass = `drawer-${position}`;
  const sizeClass = size === 'wide' ? 'drawer-wide' : '';
  const closingClass = isClosing ? 'drawer-closing' : '';

  return createPortal(
    <>
      <div
        ref={overlayRef}
        className={`drawer-overlay ${closingClass}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        ref={drawerRef}
        className={`drawer ${positionClass} ${sizeClass} ${closingClass} ${className || ''}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export interface DrawerHeaderProps {
  title: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export function DrawerHeader({ title, onClose, showCloseButton = true, children }: DrawerHeaderProps) {
  return (
    <div className="drawer-header">
      <h2 className="drawer-title">{title}</h2>
      {showCloseButton && onClose && (
        <button
          type="button"
          className="drawer-close"
          onClick={onClose}
          aria-label="Close drawer"
        >
          <X size={20} />
        </button>
      )}
      {children}
    </div>
  );
}

export interface DrawerBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerBody({ children, className }: DrawerBodyProps) {
  return <div className={`drawer-body ${className || ''}`}>{children}</div>;
}

export interface DrawerFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DrawerFooter({ children, className }: DrawerFooterProps) {
  return <div className={`drawer-footer ${className || ''}`}>{children}</div>;
}

export interface DrawerItemProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  onClick?: () => void;
  className?: string;
}

export function DrawerItem({ icon: Icon, title, description, onClick, className }: DrawerItemProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.();
    }
  };

  return (
    <div
      className={`drawer-item ${className || ''}`}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
    >
      {Icon && (
        <div className="drawer-item-icon">
          <Icon size={24} />
        </div>
      )}
      <div className="drawer-item-content">
        <div className="drawer-item-title">{title}</div>
        {description && <div className="drawer-item-description">{description}</div>}
      </div>
      <div className="drawer-item-arrow">
        <ChevronRight size={20} />
      </div>
    </div>
  );
}

