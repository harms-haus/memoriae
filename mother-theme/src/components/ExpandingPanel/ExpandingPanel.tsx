import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
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
  const innerContentRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>(defaultExpanded ? 'auto' : 0);

  const measureContentHeight = (): number => {
    if (innerContentRef.current) {
      // Temporarily remove height constraint to measure natural height
      const currentHeight = contentRef.current?.style.height || '';
      if (contentRef.current) {
        contentRef.current.style.height = 'auto';
      }
      const naturalHeight = innerContentRef.current.scrollHeight;
      if (contentRef.current) {
        contentRef.current.style.height = currentHeight;
      }
      return naturalHeight;
    }
    return 0;
  };

  useEffect(() => {
    if (!contentRef.current || !innerContentRef.current) return;

    // Skip animation on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (defaultExpanded) {
        // Measure and set initial height
        const height = measureContentHeight();
        setContentHeight(height);
        // After a brief moment, set to auto to allow natural sizing
        setTimeout(() => {
          setContentHeight('auto');
        }, 50);
      }
      return;
    }

    if (expanded) {
      // Measure the natural height of the content
      const fullHeight = measureContentHeight();
      
      // Start from current height (0 when collapsed)
      const currentHeight = contentRef.current.offsetHeight || 0;
      setContentHeight(currentHeight);
      
      // Force reflow, then animate to full height
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setContentHeight(fullHeight);
        });
      });
    } else {
      // Measure current height before collapsing
      // If height is 'auto', we need to measure the actual rendered height
      let currentHeight: number;
      if (contentHeight === 'auto' && contentRef.current) {
        // Get the actual rendered height when in auto mode
        currentHeight = contentRef.current.offsetHeight;
      } else if (typeof contentHeight === 'number') {
        currentHeight = contentHeight;
      } else {
        currentHeight = measureContentHeight();
      }
      
      setContentHeight(currentHeight);
      
      // Force reflow, then collapse
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setContentHeight(0);
        });
      });
    }
  }, [expanded, defaultExpanded]);


  const handleTransitionEnd = () => {
    if (expanded) {
      setContentHeight('auto');
    }
  };

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
    <div className={panelClasses}>
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
          {expanded ? (
            <ChevronDown size={20} className="expanding-panel-chevron" />
          ) : (
            <ChevronRight size={20} className="expanding-panel-chevron" />
          )}
          <div className="expanding-panel-title">{title}</div>
        </div>
      </div>
      <div
        ref={contentRef}
        className={contentClasses}
        style={{
          height: typeof contentHeight === 'number' ? `${contentHeight}px` : contentHeight,
        }}
        onTransitionEnd={handleTransitionEnd}
      >
        <div ref={innerContentRef} className="expanding-panel-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
}

