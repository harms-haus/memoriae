
export interface ProgressProps {
  value: number; // 0-100
  variant?: 'default' | 'success' | 'warning' | 'error';
  showLabel?: boolean;
  label?: string;
  striped?: boolean;
  animated?: boolean;
  className?: string;
  'aria-label'?: string;
}

export function Progress({
  value,
  variant = 'default',
  showLabel = false,
  label,
  striped = false,
  animated = false,
  className = '',
  'aria-label': ariaLabel,
}: ProgressProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.max(0, Math.min(100, value));
  const percentage = Math.round(clampedValue);

  // Build class names
  const classes = [
    'progress',
    variant !== 'default' ? `progress-${variant}` : '',
    striped ? 'progress-striped' : '',
    animated ? 'progress-animated' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Determine label text
  const labelText = label !== undefined ? label : (showLabel ? `${percentage}%` : '');

  // Determine aria-label
  const computedAriaLabel = ariaLabel || (labelText ? undefined : `Progress: ${percentage}%`);

  return (
    <div className={classes} role="progressbar" aria-valuenow={clampedValue} aria-valuemin={0} aria-valuemax={100} aria-label={computedAriaLabel}>
      <div className="progress-fill" style={{ width: `${clampedValue}%` }} />
      {labelText && <span className="progress-label">{labelText}</span>}
    </div>
  );
}

