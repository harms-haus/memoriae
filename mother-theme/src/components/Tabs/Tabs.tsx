import React, { createContext, useContext, useState, useRef, useEffect, useCallback, useMemo, KeyboardEvent, ReactElement } from 'react';

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
  registerTab: (value: string, element: HTMLElement | null) => void;
  tabs: Map<string, HTMLElement>;
  orientation: 'top' | 'bottom';
  onTabHover: (value: string | null) => void;
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
  orientation?: 'top' | 'bottom';
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className, orientation = 'bottom' }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue || '');
  const [tabs, setTabs] = useState<Map<string, HTMLElement>>(new Map());
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledValue !== undefined;
  const currentValue = isControlled ? controlledValue : internalValue;

  const handleValueChange = useCallback((newValue: string) => {
    if (!isControlled) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  }, [isControlled, onValueChange]);

  const registerTab = useCallback((tabValue: string, element: HTMLElement | null) => {
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
  }, []);

  // Animate indicator and background position with hover "cheat"
  useEffect(() => {
    if (!indicatorRef.current || !backgroundRef.current || !tabsRef.current || !currentValue) return;

    const activeTab = tabs.get(currentValue);
    if (!activeTab) return;

    const updateIndicator = () => {
      const tabsContainer = tabsRef.current;
      const indicator = indicatorRef.current;
      const background = backgroundRef.current;
      if (!tabsContainer || !indicator || !background) return;

      const containerRect = tabsContainer.getBoundingClientRect();
      const activeTabRect = activeTab.getBoundingClientRect();
      
      let targetLeft = activeTabRect.left - containerRect.left;
      let targetWidth = activeTabRect.width;

      // If hovering over a different tab, "cheat" the indicator towards it by a fixed amount
      if (hoveredTab && hoveredTab !== currentValue) {
        const hoveredTabElement = tabs.get(hoveredTab);
        if (hoveredTabElement) {
          const hoveredTabRect = hoveredTabElement.getBoundingClientRect();
          const hoveredLeft = hoveredTabRect.left - containerRect.left;
          
          // Fixed cheat distance: 6px
          const cheatDistance = 6;
          
          // Determine direction: move left (negative) or right (positive)
          if (hoveredLeft < targetLeft) {
            // Hovered tab is to the left, move indicator left
            targetLeft = Math.max(targetLeft - cheatDistance, hoveredLeft);
          } else {
            // Hovered tab is to the right, move indicator right
            targetLeft = Math.min(targetLeft + cheatDistance, hoveredLeft);
          }
        }
      }

      indicator.style.transform = `translateX(${targetLeft}px)`;
      indicator.style.width = `${targetWidth}px`;
      
      background.style.transform = `translateX(${targetLeft}px)`;
      background.style.width = `${targetWidth}px`;
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      updateIndicator();
    });

    // Update on resize
    const handleResize = () => {
      updateIndicator();
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [currentValue, tabs, hoveredTab]);

  const handleTabHover = useCallback((value: string | null) => {
    setHoveredTab(value);
  }, []);

  const contextValue: TabsContextValue = useMemo(() => ({
    value: currentValue,
    onValueChange: handleValueChange,
    registerTab,
    tabs,
    orientation,
    onTabHover: handleTabHover,
  }), [currentValue, handleValueChange, registerTab, tabs, orientation, handleTabHover]);

  // Separate Tab children from TabPanel children
  const tabChildren: ReactElement[] = [];
  const panelChildren: ReactElement[] = [];

  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child)) {
      const componentType = child.type as any;
      if (componentType?.displayName === 'TabPanel') {
        panelChildren.push(child);
      } else if (componentType?.displayName === 'Tab' || (child.props as any)?.value) {
        // If it has a value prop and isn't a TabPanel, it's likely a Tab
        if (componentType?.displayName !== 'TabPanel') {
          tabChildren.push(child);
        }
      }
    }
  });

  return (
    <TabsContext.Provider value={contextValue}>
      <div className={`tabs-container ${orientation === 'top' ? 'tabs-container-top' : ''} ${className || ''}`}>
        {orientation === 'top' && (
          <div className="tabs-panels">
            {panelChildren}
          </div>
        )}
        <div className="tabs-wrapper" ref={tabsRef}>
          <div className="tabs" role="tablist">
            <div 
              ref={backgroundRef}
              className="tab-background"
              aria-hidden="true"
            />
            {tabChildren}
            <div 
              ref={indicatorRef}
              className={`tab-indicator ${orientation === 'top' ? 'tab-indicator-top' : 'tab-indicator-bottom'}`}
              aria-hidden="true"
            />
          </div>
        </div>
        {orientation === 'bottom' && (
          <div className="tabs-panels">
            {panelChildren}
          </div>
        )}
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
  const { value: currentValue, onValueChange, registerTab, tabs, onTabHover } = useTabsContext();
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

  const handleMouseEnter = () => {
    if (!disabled) {
      onTabHover(value);
    }
  };

  const handleMouseLeave = () => {
    onTabHover(null);
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
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      disabled={disabled}
    >
      {label || children}
    </button>
  );
}
Tab.displayName = 'Tab';

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
TabPanel.displayName = 'TabPanel';

