import React, { useId } from 'react';
import { LucideIcon } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: LucideIcon;
  maxLength?: number;
  showCount?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  icon: Icon,
  maxLength,
  showCount,
  className = '',
  id: providedId,
  value,
  defaultValue,
  ...props
}: InputProps) {
  const internalId = useId();
  const inputId = providedId || `input-${internalId}`;
  const labelId = label ? `label-${inputId}` : undefined;
  const helperId = helperText || error ? `helper-${inputId}` : undefined;
  const errorId = error ? `error-${inputId}` : undefined;

  const inputValue = value !== undefined ? String(value) : (defaultValue !== undefined ? String(defaultValue) : '');
  const currentLength = inputValue.length;
  const showCharacterCount = showCount && maxLength !== undefined;

  const classes = [
    'input',
    error ? 'input-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaDescribedBy = [
    helperId,
    errorId,
    showCharacterCount ? `count-${inputId}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="input-wrapper">
      {label && (
        <label id={labelId} htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="input-container flex-center">
        {Icon && (
          <span className="input-icon">
            <Icon size={16} />
          </span>
        )}
        <input
          id={inputId}
          className={`${classes} ${Icon ? 'input-with-icon' : ''}`}
          value={value}
          defaultValue={defaultValue}
          maxLength={maxLength}
          aria-label={!label ? props['aria-label'] : undefined}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={ariaDescribedBy || undefined}
          aria-invalid={error ? 'true' : undefined}
          {...props}
        />
      </div>
      {(helperText || error || showCharacterCount) && (
        <div className="input-footer flex-between">
          <div>
            {error && (
              <span id={errorId} className="input-error-text" style={{ color: 'var(--error)', fontSize: 'var(--text-sm)' }}>
                {error}
              </span>
            )}
            {!error && helperText && (
              <span id={helperId} className="input-helper-text" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                {helperText}
              </span>
            )}
          </div>
          {showCharacterCount && (
            <span id={`count-${inputId}`} className="input-count" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

