import { PointerPanel } from './PointerPanel';

export default {
  title: 'Components/PointerPanel',
  component: PointerPanel,
};

export const AllPositions = () => (
  <div style={{ position: 'relative', minHeight: '500px', padding: '2rem', background: 'var(--bg-primary)' }}>
    <PointerPanel position="top-left" style={{ left: '0', top: '0' }}>
      Top-left pointing left
    </PointerPanel>

    <PointerPanel position="top-right" style={{ right: '0', top: '0' }}>
      Top-right pointing right
    </PointerPanel>

    <PointerPanel 
      position="center-left" 
      style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
    >
      Center-left pointing left
    </PointerPanel>

    <PointerPanel 
      position="center-right" 
      style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
    >
      Center-right pointing right
    </PointerPanel>

    <PointerPanel position="bottom-left" style={{ left: '0', bottom: '0' }}>
      Bottom-left pointing left
    </PointerPanel>

    <PointerPanel position="bottom-right" style={{ right: '0', bottom: '0' }}>
      Bottom-right pointing right
    </PointerPanel>
  </div>
);

export const ArrowSizes = () => (
  <div style={{ position: 'relative', minHeight: '300px', padding: '2rem', background: 'var(--bg-primary)' }}>
    <PointerPanel 
      position="center-left" 
      arrowSize={12}
      style={{ left: '0', top: '20%', transform: 'translateY(-50%)' }}
    >
      Small arrow (12px)
    </PointerPanel>

    <PointerPanel 
      position="center-left" 
      arrowSize={16}
      style={{ left: '0', top: '50%', transform: 'translateY(-50%)' }}
    >
      Default arrow (16px)
    </PointerPanel>

    <PointerPanel 
      position="center-left" 
      arrowSize={24}
      style={{ left: '0', top: '80%', transform: 'translateY(-50%)' }}
    >
      Large arrow (24px)
    </PointerPanel>
  </div>
);

export const WithContent = () => (
  <div style={{ position: 'relative', minHeight: '200px', padding: '2rem', background: 'var(--bg-primary)' }}>
    <PointerPanel 
      position="center-right" 
      style={{ right: '0', top: '50%', transform: 'translateY(-50%)' }}
    >
      <div>
        <h3 style={{ margin: '0 0 0.5rem 0', fontSize: 'var(--text-lg)' }}>Timeline Event</h3>
        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
          This is a detailed description of the event that occurred at this point in time.
        </p>
        <button style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}>View Details</button>
      </div>
    </PointerPanel>
  </div>
);

export const CustomPositioning = () => (
  <div style={{ position: 'relative', minHeight: '400px', padding: '2rem', background: 'var(--bg-primary)' }}>
    <PointerPanel 
      position="center-left" 
      style={{ 
        left: '50%', 
        top: '50%', 
        transform: 'translate(-50%, -50%)',
        marginLeft: '100px'
      }}
    >
      Centered with offset
    </PointerPanel>

    <PointerPanel 
      position="top-right" 
      style={{ 
        right: '20px', 
        top: '20px'
      }}
    >
      Top-right with margins
    </PointerPanel>
  </div>
);

