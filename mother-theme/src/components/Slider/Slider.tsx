import React, { useId, useState, useRef } from 'react';

export interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number) => void;
  showValue?: boolean;
  formatValue?: (value: number) => string;
  label?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Slider({
  value: controlledValue,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  showValue = false,
  formatValue,
  label,
  disabled = false,
  className = '',
  id: providedId,
}: SliderProps) {
  const internalId = useId();
  const sliderId = providedId || `slider-${internalId}`;
  const labelId = label ? `label-${sliderId}` : undefined;
  
  const [internalValue, setInternalValue] = useState(defaultValue);
  const sliderRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  // Clamp value to min/max range
  const clampedValue = Math.max(min, Math.min(max, currentValue));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    
    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    onValueChange?.(newValue);
  };

  // Format value for display
  const formatDisplayValue = (val: number): string => {
    if (formatValue) {
      return formatValue(val);
    }
    return val.toString();
  };

  return (
    <div className={`slider-wrapper ${className}`}>
      {label && (
        <label id={labelId} htmlFor={sliderId} className="label">
          {label}
        </label>
      )}
      <div className="slider-container">
        <input
          ref={sliderRef}
          type="range"
          id={sliderId}
          className="slider"
          min={min}
          max={max}
          step={step}
          value={clampedValue}
          disabled={disabled}
          onChange={handleChange}
          aria-valuenow={clampedValue}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-labelledby={labelId}
          aria-label={!label ? `Slider: ${formatDisplayValue(clampedValue)}` : undefined}
        />
        {showValue && (
          <span className="slider-value" aria-hidden="true">
            {formatDisplayValue(clampedValue)}
          </span>
        )}
      </div>
    </div>
  );
}

