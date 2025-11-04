import { useEffect, useState, useRef } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, type LucideIcon } from 'lucide-react';
import './Notification.css';

export interface NotificationProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  onClose?: () => void;
  actions?: Array<{
    label: string;
    onClick: () => void;
  }>;
  icon?: LucideIcon;
}

export function Notification({
  variant = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  actions,
  icon: CustomIcon,
}: NotificationProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<number | null>(null);
  const progressRef = useRef<number | null>(null);

  useEffect(() => {
    if (duration === 0) return; // 0 means don't auto-dismiss

    const startTime = Date.now();
    const interval = 100; // Update progress every 100ms

    progressRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        setIsVisible(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Wait for animation
      }
    }, interval);

    timerRef.current = window.setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onClose?.();
      }, 300);
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (progressRef.current) clearInterval(progressRef.current);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const variantClasses = {
    success: 'notification-success',
    info: 'notification-info',
    warning: 'notification-warning',
    error: 'notification-error',
  };

  const defaultIcons = {
    success: CheckCircle,
    info: Info,
    warning: AlertTriangle,
    error: AlertCircle,
  };

  const Icon = CustomIcon || defaultIcons[variant];

  // Calculate stroke-dashoffset for SVG circle (circumference = 2 * π * r, r = 11, so ≈ 69.1)
  const circumference = 2 * Math.PI * 11;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={`notification ${variantClasses[variant]} ${isVisible ? '' : 'notification-exiting'}`}>
      <div className="notification-icon">
        <Icon size={24} />
      </div>
      <div className="notification-content">
        <div className="notification-title">{title}</div>
        <div className="notification-text">{message}</div>
        {actions && actions.length > 0 && (
          <div className="notification-actions">
            {actions.map((action, index) => (
              <button
                key={index}
                type="button"
                className="btn-secondary btn-ghost"
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {duration > 0 && (
        <div className="notification-timer">
          <svg className="notification-timer-circle" viewBox="0 0 24 24">
            <circle
              className="notification-timer-circle-bg"
              cx="12"
              cy="12"
              r="11"
            />
            <circle
              className="notification-timer-circle-progress"
              cx="12"
              cy="12"
              r="11"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{
                transition: 'stroke-dashoffset 0.1s linear',
              }}
            />
          </svg>
        </div>
      )}
      <button
        type="button"
        className="notification-close"
        onClick={handleClose}
        aria-label="Close notification"
      >
        <X size={18} />
      </button>
    </div>
  );
}

