import type { CatalogEntry } from '../../../domain/experience/schema'
import type { ExperienceSettings } from '../workspace/settings'
import { getExperienceDimensions } from '../../../content/experience/experienceDimensions'

type CaptionSelection = Pick<
  ExperienceSettings,
  'composerMode' | 'conditionId' | 'dimensions' | 'presets'
>

interface CaptionEntry {
  id: string
  label: string
  weight: number | null
}

function catalogLabel(catalog: CatalogEntry[], id: string): string {
  return catalog.find((entry) => entry.id === id)?.label ?? id.replace(/_/g, ' ')
}

/** The current selection in words, in the order the composer stores it. */
export function captionEntries(
  selection: CaptionSelection,
  catalog: CatalogEntry[],
): CaptionEntry[] {
  if (selection.composerMode === 'symptom') {
    const labels = new Map(getExperienceDimensions().map((dim) => [dim.id, dim.label ?? dim.id]))
    return selection.dimensions.map((dim) => ({
      id: dim.dimensionId,
      label: labels.get(dim.dimensionId) ?? dim.dimensionId,
      weight: dim.weight,
    }))
  }
  if (selection.composerMode === 'multimorbid') {
    return selection.presets.map((preset) => ({
      id: preset.profileId,
      label: catalogLabel(catalog, preset.profileId),
      weight: preset.weight,
    }))
  }
  if (!selection.conditionId || selection.conditionId === 'none') return []
  return [
    {
      id: selection.conditionId,
      label: catalogLabel(catalog, selection.conditionId),
      weight: null,
    },
  ]
}

function emptyCaption(mode: CaptionSelection['composerMode']): string {
  if (mode === 'symptom') return 'No dimensions chosen yet.'
  if (mode === 'multimorbid') return 'No collections combined yet.'
  return 'No overlay: the camera as it is.'
}

export interface PlateCaptionProps {
  selection: CaptionSelection
  catalog: CatalogEntry[]
  id?: string
}

/**
 * The plate's caption: what the preview is composed of, and what it is not.
 * It reads the real selection, so it stays true when presets load or selections change.
 */
export function PlateCaption({ selection, catalog, id }: PlateCaptionProps) {
  const entries = captionEntries(selection, catalog)
  return (
    <figcaption className="ie-plateCaption" id={id}>
      <p className="ie-plateCaption__subject">
        {entries.length === 0
          ? emptyCaption(selection.composerMode)
          : entries.map((entry, index) => (
              <span key={entry.id} className="ie-plateCaption__entry">
                {entry.label}
                {entry.weight !== null && (
                  <span className="ie-plateCaption__weight">
                    {' '}
                    {Math.round(entry.weight * 100)}%
                  </span>
                )}
                {index < entries.length - 1 ? ', ' : '.'}
              </span>
            ))}
      </p>
      <p className="ie-plateCaption__note">An interpretation, not a reproduction.</p>
    </figcaption>
  )
}
