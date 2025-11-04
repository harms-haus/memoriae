import React, { useId, useRef, useState } from 'react';

export interface CheckboxProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export function Checkbox({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  label,
  disabled = false,
  children,
  className = '',
  id: providedId,
}: CheckboxProps) {
  const internalId = useId();
  const checkboxId = providedId || `checkbox-${internalId}`;
  const labelId = `label-${checkboxId}`;
  
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const checkboxRef = useRef<HTMLInputElement>(null);

  const isControlled = controlledChecked !== undefined;
  const checked = isControlled ? controlledChecked : internalChecked;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = e.target.checked;
    
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    
    onCheckedChange?.(newChecked);
  };

  const handleLabelClick = (e: React.MouseEvent<HTMLLabelElement>) => {
    if (!disabled && checkboxRef.current) {
      // Prevent default to avoid double-triggering if htmlFor works
      e.preventDefault();
      // Toggle the checkbox state
      const newChecked = !checked;
      if (!isControlled) {
        setInternalChecked(newChecked);
      }
      // Trigger change event manually
      const syntheticEvent = {
        target: { checked: newChecked },
      } as React.ChangeEvent<HTMLInputElement>;
      handleChange(syntheticEvent);
    }
  };

  const labelContent = label || children;

  return (
    <div className={`checkbox-wrapper ${className}`}>
      <input
        ref={checkboxRef}
        type="checkbox"
        id={checkboxId}
        className="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        aria-checked={checked}
        aria-labelledby={labelContent ? labelId : undefined}
      />
      {labelContent && (
        <label
          id={labelId}
          htmlFor={checkboxId}
          onClick={handleLabelClick}
          className="label"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {labelContent}
        </label>
      )}
    </div>
  );
}

