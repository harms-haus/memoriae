import React, { createContext, useContext, useState, useRef, useEffect, KeyboardEvent } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  registerTab: (value: string, element: HTMLElement | null) => void;
  tabs: Map<string, HTMLElement>;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs component');
  }
  return context;
}

export interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [tabs, setTabs] = useState<Map<string, HTMLElement>>(new Map());
  const tabsRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleValueChange = (newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  const registerTab = (tabValue: string, element: HTMLElement | null) => {
    if (element) {
      setTabs((prev) => {
        const next = new Map(prev);
        next.set(tabValue, element);
        return next;
      });
    } else {
      setTabs((prev) => {
        const next = new Map(prev);
        next.delete(tabValue);
        return next;
      });
    }
  };

  const contextValue: TabsContextValue = {
    value: currentValue,
    onValueChange: handleValueChange,
    registerTab,
    tabs,
  };

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={`tabs ${className || ''}`} ref={tabsRef} role="tablist">
        {children}
      </div>
    </TabsContext.Provider>
  );
}

export interface TabProps {
  value: string;
  label?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

export function Tab({ value, label, disabled, children }: TabProps) {
  const { value: currentValue, onValueChange, registerTab, tabs } = useTabsContext();
  const tabRef = useRef<HTMLButtonElement>(null);
  const isActive = currentValue === value;

  useEffect(() => {
    if (tabRef.current) {
      registerTab(value, tabRef.current);
      return () => registerTab(value, null);
    }
    return undefined;
  }, [value, registerTab]);

  const handleClick = () => {
    if (!disabled) {
      onValueChange(value);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    const tabValues = Array.from(tabs.keys());
    const currentIndex = tabValues.indexOf(value);

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        if (currentIndex < tabValues.length - 1) {
          const nextValue = tabValues[currentIndex + 1];
          if (nextValue) {
            onValueChange(nextValue);
            tabs.get(nextValue)?.focus();
          }
        }
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        if (currentIndex > 0) {
          const prevValue = tabValues[currentIndex - 1];
          if (prevValue) {
            onValueChange(prevValue);
            tabs.get(prevValue)?.focus();
          }
        }
        break;
      case 'Home':
        e.preventDefault();
        if (tabValues.length > 0) {
          const firstValue = tabValues[0];
          if (firstValue) {
            onValueChange(firstValue);
            tabs.get(firstValue)?.focus();
          }
        }
        break;
      case 'End':
        e.preventDefault();
        if (tabValues.length > 0) {
          const lastValue = tabValues[tabValues.length - 1];
          if (lastValue) {
            onValueChange(lastValue);
            tabs.get(lastValue)?.focus();
          }
        }
        break;
    }
  };

  return (
    <button
      ref={tabRef}
      type="button"
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${value}`}
      id={`tab-${value}`}
      className={`tab ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled}
    >
      {label || children}
    </button>
  );
}

export interface TabPanelProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabPanel({ value, children, className }: TabPanelProps) {
  const { value: currentValue } = useTabsContext();
  const isActive = currentValue === value;

  return (
    <div
      role="tabpanel"
      id={`tabpanel-${value}`}
      aria-labelledby={`tab-${value}`}
      className={`tab-panel ${isActive ? 'active' : ''} ${className || ''}`}
      hidden={!isActive}
    >
      {children}
    </div>
  );
}

