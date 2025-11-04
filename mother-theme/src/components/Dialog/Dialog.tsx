import React, { useEffect, useRef, MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  size?: 'small' | 'default' | 'large';
  children: React.ReactNode;
  className?: string;
  closeOnBackdropClick?: boolean;
}

export function Dialog({
  open,
  onOpenChange,
  size = 'default',
  children,
  className,
  closeOnBackdropClick = true,
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Body scroll lock
  useEffect(() => {
    if (open) {
      // Store the currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Lock body scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Focus the dialog
      dialogRef.current?.focus();

      return () => {
        document.body.style.overflow = originalOverflow;
        // Restore focus to previous element
        previousActiveElement.current?.focus();
      };
    }
    return undefined;
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open || !dialogRef.current) return;

    const dialog = dialogRef.current;
    const focusableElements = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKeyNative = (e: Event) => {
      const ke = e as KeyboardEvent;
      if (ke.key !== 'Tab') return;

      if (ke.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    dialog.addEventListener('keydown', handleTabKeyNative);
    return () => dialog.removeEventListener('keydown', handleTabKeyNative);
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

  if (!open) return null;

  const sizeClass = size === 'small' ? 'dialog-small' : size === 'large' ? 'dialog-large' : '';

  return createPortal(
    <div
      ref={overlayRef}
      className="dialog-overlay"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={dialogRef}
        className={`dialog ${sizeClass} ${className || ''}`}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}

export interface DialogHeaderProps {
  title: string;
  onClose?: () => void;
  showCloseButton?: boolean;
  children?: React.ReactNode;
}

export function DialogHeader({ title, onClose, showCloseButton = true, children }: DialogHeaderProps) {
  return (
    <div className="dialog-header">
      <h2 className="dialog-title">{title}</h2>
      {showCloseButton && onClose && (
        <button
          type="button"
          className="dialog-close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          <X size={20} />
        </button>
      )}
      {children}
    </div>
  );
}

export interface DialogBodyProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogBody({ children, className }: DialogBodyProps) {
  return <div className={`dialog-body ${className || ''}`}>{children}</div>;
}

export interface DialogFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function DialogFooter({ children, className }: DialogFooterProps) {
  return <div className={`dialog-footer ${className || ''}`}>{children}</div>;
}

