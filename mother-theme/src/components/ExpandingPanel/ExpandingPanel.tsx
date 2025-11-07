import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import './ExpandingPanel.css';

export interface ExpandingPanelProps {
  title: React.ReactNode;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  variant?: 'default' | 'elevated' | 'accent';
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  onExpandedChange?: (expanded: boolean) => void;
}

export function ExpandingPanel({
  title,
  children,
  defaultExpanded = false,
  variant = 'default',
  className = '',
  headerClassName = '',
  contentClassName = '',
  onExpandedChange,
}: ExpandingPanelProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const contentRef = useRef<HTMLDivElement>(null);
  const contentInnerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Measure content height and set as CSS variable for smooth animation
  useEffect(() => {
    const updateHeight = () => {
      if (contentInnerRef.current && contentRef.current && panelRef.current) {
        // Save current inline styles
        const originalMaxHeight = contentRef.current.style.maxHeight;
        const originalOpacity = contentRef.current.style.opacity;
        
        // Temporarily remove height constraint to measure actual content height
        // This happens synchronously so no visual flicker occurs
        contentRef.current.style.maxHeight = '9999px';
        contentRef.current.style.opacity = '1';
        
        // Force reflow to ensure measurement is accurate
        void contentInnerRef.current.offsetHeight;
        
        // Measure the actual content height
        const height = contentInnerRef.current.scrollHeight;
        panelRef.current.style.setProperty('--content-height', `${height}px`);
        
        // Restore original styles immediately (synchronously to avoid flicker)
        contentRef.current.style.maxHeight = originalMaxHeight;
        contentRef.current.style.opacity = originalOpacity;
      }
    };

    // Use requestAnimationFrame to ensure DOM is ready
    const rafId = requestAnimationFrame(() => {
      updateHeight();
    });

    // Use ResizeObserver to handle dynamic content changes
    const resizeObserver = new ResizeObserver(() => {
      // Debounce measurements to avoid excessive calculations
      requestAnimationFrame(updateHeight);
    });

    if (contentInnerRef.current) {
      resizeObserver.observe(contentInnerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [children, expanded]);

  const handleToggle = () => {
    const newExpanded = !expanded;
    setExpanded(newExpanded);
    onExpandedChange?.(newExpanded);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  const panelClasses = [
    'expanding-panel',
    `expanding-panel-${variant}`,
    expanded ? 'expanding-panel-expanded' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const headerClasses = [
    'expanding-panel-header',
    headerClassName,
  ]
    .filter(Boolean)
    .join(' ');

  const contentClasses = [
    'expanding-panel-content',
    contentClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div ref={panelRef} className={panelClasses}>
      <div
        className={headerClasses}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        aria-label={expanded ? 'Collapse panel' : 'Expand panel'}
      >
        <div className="expanding-panel-header-content">
          <ChevronRight size={20} className="expanding-panel-chevron" />
          <div className="expanding-panel-title">{title}</div>
        </div>
      </div>
      <div ref={contentRef} className={contentClasses}>
        <div ref={contentInnerRef} className="expanding-panel-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

