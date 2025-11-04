import React, { useId, useRef, useState } from 'react';

export interface ToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
  id?: string;
}

export function Toggle({
  checked: controlledChecked,
  defaultChecked = false,
  onCheckedChange,
  label,
  disabled = false,
  children,
  className = '',
  id: providedId,
}: ToggleProps) {
  const internalId = useId();
  const toggleId = providedId || `toggle-${internalId}`;
  const labelId = `label-${toggleId}`;
  
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  const toggleRef = useRef<HTMLInputElement>(null);

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
    if (!disabled && toggleRef.current) {
      // Prevent default to avoid double-triggering if htmlFor works
      e.preventDefault();
      // Toggle the switch state
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
    <div className={`toggle-wrapper ${className}`}>
      <input
        ref={toggleRef}
        type="checkbox"
        id={toggleId}
        className="toggle"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={handleChange}
        aria-checked={checked}
        aria-labelledby={labelContent ? labelId : undefined}
      />
      {labelContent && (
        <label
          id={labelId}
          htmlFor={toggleId}
          onClick={handleLabelClick}
          className={`label ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {labelContent}
        </label>
      )}
    </div>
  );
}

