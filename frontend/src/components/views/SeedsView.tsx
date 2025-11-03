import './Views.css'

interface SeedsViewProps {
  onSeedSelect?: (seedId: string) => void
}

export function SeedsView({ onSeedSelect }: SeedsViewProps) {
  // TODO: Implement seed list with clickable items
  // For now, this is a placeholder that will be enhanced later
  return (
    <div className="view-container">
      <h2>Seeds</h2>
      <p className="lead">Your memories will appear here.</p>
      {onSeedSelect && (
        <p className="text-secondary" style={{ fontSize: 'var(--text-sm)' }}>
          Click on a seed to view its detail and timeline.
        </p>
      )}
    </div>
  )
}

