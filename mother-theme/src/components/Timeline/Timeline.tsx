import React, { type ReactNode } from 'react';
import { PointerPanel } from '../PointerPanel';
import './Timeline.css';

export interface TimelineItem {
  id: string;
  // Dot position along timeline (0-100% or pixel value)
  position: number;
  // Optional dot visual (used if renderDot not provided)
  dot?: ReactNode;
}

export interface TimelineProps {
  items: TimelineItem[];
  // Timeline alignment mode
  mode: 'left' | 'center' | 'right';
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
}

export function Timeline({
  items,
  mode,
  renderPanel,
  createPanel,
  renderOpposite,
  renderDot,
  maxPanelWidth = 400,
  panelSpacing = 16,
  className = '',
}: TimelineProps) {
  if (items.length === 0) {
    return null;
  }

  const getPanelSide = (index: number): 'left' | 'right' => {
    if (mode === 'left') return 'right';
    if (mode === 'right') return 'left';
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
    <div className={`timeline timeline-mode-${mode} ${className}`}>
      {items.map((item, index) => {
        const isTop = index === 0;
        const isBottom = index === items.length - 1;
        const side = getPanelSide(index);
        const showTail = mode === 'center' && renderOpposite;

        return (
          <div
            key={item.id}
            className={`timeline-item timeline-item-${side}`}
            style={{
              '--timeline-position': `${item.position}%`,
            } as React.CSSProperties}
          >
            {/* Content column */}
            <div className="timeline-content">
              {renderPanelContent(index, side, item.position)}
            </div>

            {/* Timeline column */}
            <div className="timeline-column">
              {!isTop && <div className="timeline-line timeline-line-top" />}
              <div className="timeline-dot-container">
                {renderDefaultDot(index, item.position)}
              </div>
              {!isBottom && <div className="timeline-line timeline-line-bottom" />}
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

