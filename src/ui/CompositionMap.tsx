import {
  getExperienceDimensions,
  type ComposerMode,
  type SelectedDimension,
  type SelectedPreset,
} from '../composer'

interface CompositionMapProps {
  mode: ComposerMode
  conditionId: string
  dimensions: SelectedDimension[]
  presets: SelectedPreset[]
}

interface CompositionPoint {
  id: string
  label: string
  weight: number
}

const NODE_POSITION_CLASSES = [
  'composition-map__node--position-1',
  'composition-map__node--position-2',
  'composition-map__node--position-3',
] as const

function nodeStrengthClass(weight: number): string {
  const safeWeight = Number.isFinite(weight) ? weight : 0.2
  const clampedWeight = Math.min(1, Math.max(0.2, safeWeight))
  const bucket = Math.round(clampedWeight * 20) * 5
  return `composition-map__node--strength-${bucket}`
}

function selectedPoints({
  mode,
  conditionId,
  dimensions,
  presets,
}: CompositionMapProps): CompositionPoint[] {
  if (mode === 'symptom') {
    const labels = new Map(
      getExperienceDimensions().map((dimension) => [dimension.id, dimension.label]),
    )
    return dimensions.slice(0, 3).map((dimension) => ({
      id: dimension.dimensionId,
      label: labels.get(dimension.dimensionId) ?? dimension.dimensionId,
      weight: dimension.weight,
    }))
  }

  if (mode === 'multimorbid') {
    return presets.slice(0, 3).map((preset) => ({
      id: preset.profileId,
      label: preset.profileId.replace(/_/g, ' '),
      weight: preset.weight,
    }))
  }

  if (!conditionId || conditionId === 'none') return []
  return [{ id: conditionId, label: conditionId.replace(/_/g, ' '), weight: 1 }]
}

export function CompositionMap(props: CompositionMapProps) {
  const points = selectedPoints(props)

  return (
    <section className="composition-map" aria-label="Composition preview">
      <header className="composition-map__header">
        <span>Composition</span>
        <span>{points.length} selected</span>
      </header>

      <div className="composition-map__field">
        <div className="composition-map__rings" aria-hidden="true" />
        {points.length === 0 ? (
          <div className="composition-map__empty">
            <span className="composition-map__emptyMark" aria-hidden="true" />
            <strong>Begin with a pattern</strong>
            <span>Selections appear here before any media starts.</span>
          </div>
        ) : (
          <>
            <svg
              className="composition-map__connections"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {points.length > 1 && <line x1="24" y1="31" x2="70" y2="43" />}
              {points.length > 2 && (
                <>
                  <line x1="70" y1="43" x2="48" y2="72" />
                  <line x1="48" y1="72" x2="24" y2="31" />
                </>
              )}
            </svg>
            {points.map((point, index) => (
              <div
                key={point.id}
                className={`composition-map__node ${NODE_POSITION_CLASSES[index]} ${nodeStrengthClass(point.weight)}`}
              >
                <span className="composition-map__contours" aria-hidden="true" />
                <span className="composition-map__label">{point.label}</span>
                <span className="composition-map__value">{Math.round(point.weight * 100)}%</span>
              </div>
            ))}
          </>
        )}
      </div>

      <footer className="composition-map__footer">
        <span className="composition-map__localDot" aria-hidden="true" />
        Local preview
        <span aria-hidden="true">/</span>
        No media active
      </footer>
    </section>
  )
}
