import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import './Toast.css';

export interface ToastProps {
  id: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ id, variant = 'info', message, duration = 5000, onClose }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);
  const { removeToast } = useToastContext();

  useEffect(() => {
    if (duration === 0) return; // 0 means don't auto-dismiss

    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        removeToast(id);
        onClose?.();
      }, 300); // Wait for animation to complete
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, id, removeToast, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      removeToast(id);
      onClose?.();
    }, 300);
  };

  const variantClasses = {
    success: 'toast-success',
    info: 'toast-info',
    warning: 'toast-warning',
    error: 'toast-error',
  };

  const icons = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const Icon = icons[variant];

  return (
    <div className={`toast ${variantClasses[variant]} ${isVisible ? '' : 'toast-exiting'}`}>
      <div className="toast-icon">
        <Icon size={20} />
      </div>
      <div className="toast-content">
        <div className="toast-message">{message}</div>
      </div>
      <button
        type="button"
        className="toast-close"
        onClick={handleClose}
        aria-label="Close toast"
      >
        <X size={18} />
      </button>
    </div>
  );
}

interface ToastContextValue {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function useToastContext() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('Toast components must be used within ToastProvider');
  }
  return context;
}

export interface ToastData {
  id: string;
  variant?: 'success' | 'info' | 'warning' | 'error';
  message: string;
  duration?: number;
  onClose?: () => void;
}

export interface ToastProviderProps {
  position?: 'top-right' | 'top-left' | 'top-middle' | 'bottom-right' | 'bottom-left';
  children: React.ReactNode;
}

export function ToastProvider({ position = 'top-middle', children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const positionClasses = {
    'top-right': 'toast-container-top-right',
    'top-left': 'toast-container-top-left',
    'top-middle': 'toast-container-top-middle',
    'bottom-right': 'toast-container-bottom-right',
    'bottom-left': 'toast-container-bottom-left',
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      {toasts.length > 0 &&
        createPortal(
          <div className={`toast-container ${positionClasses[position]}`}>
            {toasts.map((toast) => (
              <Toast key={toast.id} {...toast} />
            ))}
          </div>,
          document.body
        )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const { addToast } = useToastContext();
  return {
    toast: addToast,
  };
}

