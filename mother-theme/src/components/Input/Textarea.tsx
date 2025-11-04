import React, { useId } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCount?: boolean;
}

export function Textarea({
  label,
  error,
  helperText,
  maxLength,
  showCount,
  className = '',
  id: providedId,
  value,
  defaultValue,
  ...props
}: TextareaProps) {
  const internalId = useId();
  const textareaId = providedId || `textarea-${internalId}`;
  const labelId = label ? `label-${textareaId}` : undefined;
  const helperId = helperText || error ? `helper-${textareaId}` : undefined;
  const errorId = error ? `error-${textareaId}` : undefined;

  const textareaValue = value !== undefined ? String(value) : (defaultValue !== undefined ? String(defaultValue) : '');
  const currentLength = textareaValue.length;
  const showCharacterCount = showCount && maxLength !== undefined;

  const classes = [
    'textarea',
    error ? 'textarea-error' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaDescribedBy = [
    helperId,
    errorId,
    showCharacterCount ? `count-${textareaId}` : undefined,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="textarea-wrapper">
      {label && (
        <label id={labelId} htmlFor={textareaId} className="label">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={classes}
        value={value}
        defaultValue={defaultValue}
        maxLength={maxLength}
        aria-label={!label ? props['aria-label'] : undefined}
        aria-labelledby={label ? labelId : undefined}
        aria-describedby={ariaDescribedBy || undefined}
        aria-invalid={error ? 'true' : undefined}
        {...props}
      />
      {(helperText || error || showCharacterCount) && (
        <div className="textarea-footer flex-between">
          <div>
            {error && (
              <span id={errorId} className="textarea-error-text" style={{ color: 'var(--error)', fontSize: 'var(--text-sm)' }}>
                {error}
              </span>
            )}
            {!error && helperText && (
              <span id={helperId} className="textarea-helper-text" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                {helperText}
              </span>
            )}
          </div>
          {showCharacterCount && (
            <span id={`count-${textareaId}`} className="textarea-count" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
              {currentLength} / {maxLength}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

