import React, { type ReactNode } from 'react';
import { PointerPanel } from '../PointerPanel';
import './Timeline.css';

export interface TimelineItem {
  id: string;
  // Dot position along timeline (0-100% or pixel value)
  position?: number;
  // Content to display (for compatibility mode)
  content?: ReactNode;
  // Time label (for compatibility mode)
  time?: ReactNode;
  // Optional dot visual (used if renderDot not provided)
  dot?: ReactNode;
  // Disabled state (for compatibility mode)
  disabled?: boolean;
  // Click handler (for compatibility mode)
  onClick?: () => void;
}

export interface TimelineProps {
  items: TimelineItem[];
  // Timeline alignment mode (or 'align' for RSuite compatibility)
  mode?: 'left' | 'center' | 'right';
  align?: 'left' | 'alternate'; // RSuite compatibility mode
  // Render panel content (default: uses PointerPanel)
  renderPanel?: (index: number, width: number) => ReactNode;
  // Custom panel creation (overrides default PointerPanel)
  createPanel?: (
    direction: 'left' | 'right',
    pos: { x: number; y: number },
    index: number,
    width: number,
    styles?: React.CSSProperties
  ) => ReactNode;
  // Render content on opposite side (center mode only)
  // Called when panel is on one side, allows rendering on the other side
  renderOpposite?: (
    index: number,
    width: number,
    panelSide: 'left' | 'right' // Which side the panel is on
  ) => ReactNode;
  // Render custom dot (overrides default dot rendering)
  renderDot?: (
    index: number,
    position: number, // Dot position along timeline
    isTop: boolean,
    isBottom: boolean
  ) => ReactNode;
  // Maximum panel width
  maxPanelWidth?: number;
  // Panel spacing from timeline
  panelSpacing?: number;
  className?: string;
  // Compatibility mode: use RSuite-style API
  compatibilityMode?: boolean;
}

export function Timeline({
  items,
  mode,
  align,
  renderPanel,
  createPanel,
  renderOpposite,
  renderDot,
  maxPanelWidth = 400,
  panelSpacing = 16,
  className = '',
  compatibilityMode = false,
}: TimelineProps) {
  if (items.length === 0) {
    return null;
  }

  // Determine mode from align prop (RSuite compatibility) or use provided mode
  const resolvedMode: 'left' | 'center' | 'right' = 
    align === 'alternate' ? 'center' : 
    align === 'left' ? 'left' : 
    mode || 'left';

  // Compatibility mode: use simple vertical timeline with RSuite-like structure
  if (compatibilityMode || align !== undefined) {
    return (
      <div className={`timeline-compat timeline-compat-${resolvedMode} ${className}`}>
        {items.map((item, index) => {
          const isTop = index === 0;
          const isBottom = index === items.length - 1;
          const side = resolvedMode === 'center' ? (index % 2 === 0 ? 'right' : 'left') : 'right';
          
          return (
            <div
              key={item.id}
              className={`timeline-item-compat timeline-item-compat-${side} ${item.disabled ? 'timeline-item-disabled' : ''}`}
            >
              <div className="timeline-column-compat">
                <div className={`timeline-line-compat timeline-line-top-compat ${isTop ? 'timeline-line-top-invisible' : ''}`} />
                <div className="timeline-dot-container-compat">
                  {item.dot || <div className="timeline-dot-default" />}
                </div>
                <div className={`timeline-line-compat timeline-line-bottom-compat ${isBottom ? 'timeline-line-bottom-invisible' : ''}`} />
              </div>
              <div className="timeline-content-compat">
                {item.time && (
                  <div className="timeline-time-compat">{item.time}</div>
                )}
                {item.onClick ? (
                  <div
                    className="timeline-item-clickable"
                    onClick={item.onClick}
                  >
                    {item.content}
                  </div>
                ) : (
                  item.content
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const getPanelSide = (index: number): 'left' | 'right' => {
    if (resolvedMode === 'left') return 'right';
    if (resolvedMode === 'right') return 'left';
    // Center mode: alternate
    return index % 2 === 0 ? 'right' : 'left';
  };

  const getPanelDirection = (side: 'left' | 'right'): 'left' | 'right' => {
    // Left side panels point right, right side panels point left
    return side === 'left' ? 'right' : 'left';
  };

  const getPointerPosition = (side: 'left' | 'right'): 'center-left' | 'center-right' => {
    // Left side panels point right, right side panels point left
    return side === 'left' ? 'center-right' : 'center-left';
  };

  const renderDefaultDot = (index: number, position: number): ReactNode => {
    const isTop = index === 0;
    const isBottom = index === items.length - 1;

    if (renderDot) {
      return renderDot(index, position, isTop, isBottom);
    }

    // Default dot rendering
    return (
      <div className="timeline-dot-default">
        {items[index]?.dot || null}
      </div>
    );
  };

  const renderPanelContent = (index: number, side: 'left' | 'right', dotY: number): ReactNode => {
    const direction = getPanelDirection(side);
    const pointerPos = getPointerPosition(side);

    if (createPanel) {
      // Use custom panel creation
      const pos = { x: 0, y: dotY };
      return createPanel(direction, pos, index, maxPanelWidth);
    }

    // Default: use PointerPanel with renderPanel content
    if (!renderPanel) {
      return null;
    }

    const content = renderPanel(index, maxPanelWidth);

    return (
      <PointerPanel
        position={pointerPos}
        arrowSize={panelSpacing}
        style={{
          maxWidth: maxPanelWidth,
          position: 'relative',
        }}
      >
        {content}
      </PointerPanel>
    );
  };

  return (
    <div className={`timeline timeline-mode-${resolvedMode} ${className}`}>
      {items.map((item, index) => {
        const isTop = index === 0;
        const isBottom = index === items.length - 1;
        const side = getPanelSide(index);
        const showTail = resolvedMode === 'center' && renderOpposite;
        const position = item.position ?? ((index / (items.length - 1 || 1)) * 100);

        return (
          <div
            key={item.id}
            className={`timeline-item timeline-item-${side}`}
            style={{
              '--timeline-position': `${position}%`,
            } as React.CSSProperties}
          >
            {/* Content column */}
            <div className="timeline-content">
              {renderPanelContent(index, side, position)}
            </div>

            {/* Timeline column */}
            <div className="timeline-column">
              <div className={`timeline-line timeline-line-top ${isTop ? 'timeline-line-top-invisible' : ''}`} />
              <div className="timeline-dot-container">
                {renderDefaultDot(index, position)}
              </div>
              <div className={`timeline-line timeline-line-bottom ${isBottom ? 'timeline-line-bottom-invisible' : ''}`} />
            </div>

            {/* Tail column (center mode only) */}
            {showTail && (
              <div className="timeline-tail">
                {renderOpposite(index, maxPanelWidth, side)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

