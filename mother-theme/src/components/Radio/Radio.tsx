import React, { createContext, useContext, useId, useRef, useState, KeyboardEvent } from 'react';

interface RadioGroupContextValue {
  value: string | undefined;
  onValueChange: (value: string) => void;
  name: string;
  registerRadio: (value: string, element: HTMLElement | null) => void;
  radios: Map<string, HTMLElement>;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroupContext() {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error('Radio components must be used within RadioGroup component');
  }
  return context;
}

export interface RadioGroupProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
  name?: string;
}

export function RadioGroup({
  value: controlledValue,
  defaultValue,
  onValueChange,
  children,
  className = '',
  name: providedName,
}: RadioGroupProps) {
  const internalId = useId();
  const groupName = providedName || `radio-group-${internalId}`;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [radios, setRadios] = useState<Map<string, HTMLElement>>(new Map());

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const registerRadio = (radioValue: string, element: HTMLElement | null) => {
    if (element) {
      setRadios((prev) => {
        const next = new Map(prev);
        next.set(radioValue, element);
        return next;
      });
    } else {
      setRadios((prev) => {
        const next = new Map(prev);
        next.delete(radioValue);
        return next;
      });
    }
  };

  const contextValue: RadioGroupContextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    name: groupName,
    registerRadio,
    radios,
  };

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div className={`radio-group ${className}`} role="radiogroup">
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

export interface RadioProps {
  value: string;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
  id?: string;
}

export function Radio({ value, label, disabled = false, children, id: providedId }: RadioProps) {
  const { value: groupValue, onValueChange, name, registerRadio, radios } = useRadioGroupContext();
  const internalId = useId();
  const radioId = providedId || `radio-${internalId}`;
  const labelId = `label-${radioId}`;
  const radioRef = useRef<HTMLInputElement>(null);
  
  const isChecked = groupValue === value;

  React.useEffect(() => {
    if (radioRef.current) {
      registerRadio(value, radioRef.current);
      return () => registerRadio(value, null);
    }
    return undefined;
  }, [value, registerRadio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled && e.target.checked) {
      onValueChange(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    const radioValues = Array.from(radios.keys());
    const currentIndex = radioValues.indexOf(value);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < radioValues.length - 1) {
          const nextValue = radioValues[currentIndex + 1];
          if (nextValue) {
            onValueChange(nextValue);
            radios.get(nextValue)?.focus();
          }
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevValue = radioValues[currentIndex - 1];
          if (prevValue) {
            onValueChange(prevValue);
            radios.get(prevValue)?.focus();
          }
        }
        break;
    }
  };

  const labelContent = label || children;

  return (
    <div className="radio-wrapper">
      <input
        ref={radioRef}
        type="radio"
        id={radioId}
        name={name}
        value={value}
        className="radio"
        checked={isChecked}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        aria-checked={isChecked}
        aria-labelledby={labelContent ? labelId : undefined}
      />
      {labelContent && (
        <label
          id={labelId}
          htmlFor={radioId}
          className="label"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
        >
          {labelContent}
        </label>
      )}
    </div>
  );
}

