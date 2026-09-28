import type { CatalogEntry } from '../../../domain/experience/schema'
import { clamp01 } from '../../../shared/numbers'
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

export type PlateCaptionStatus = 'idle' | 'loading' | 'ready' | 'error'

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
    return selection.dimensions
      .map((dim) => ({
        id: dim.dimensionId,
        label: labels.get(dim.dimensionId) ?? dim.dimensionId,
        weight: clamp01(dim.weight),
      }))
      .filter((entry) => entry.weight > 0)
  }
  if (selection.composerMode === 'multimorbid') {
    return selection.presets
      .map((preset) => ({
        id: preset.profileId,
        label: catalogLabel(catalog, preset.profileId),
        weight: clamp01(preset.weight),
      }))
      .filter((entry) => entry.weight > 0)
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
  profileStatus: PlateCaptionStatus
  id?: string
}

/**
 * The plate's caption: what the preview is composed of, and what it is not. Pending and failed
 * profile loads are named explicitly so the selection is never presented as an applied overlay.
 */
export function PlateCaption({ selection, catalog, profileStatus, id }: PlateCaptionProps) {
  const entries = captionEntries(selection, catalog)
  const caption =
    profileStatus === 'loading'
      ? 'Preparing the selected interpretation…'
      : profileStatus === 'error'
        ? 'Clean fallback: no overlay is applied.'
        : entries.length === 0
          ? emptyCaption(selection.composerMode)
          : entries.map((entry, index) => (
              <span key={entry.id}>
                {entry.label}
                {entry.weight !== null && (
                  <span className="ie-captionWeight"> {Math.round(entry.weight * 100)}%</span>
                )}
                {index < entries.length - 1 ? ', ' : '.'}
              </span>
            ))
  const note =
    profileStatus === 'loading'
      ? 'The preview changes only when this is ready.'
      : profileStatus === 'error'
        ? 'The selected interpretation could not be applied.'
        : 'An interpretation, not a reproduction.'

  return (
    <figcaption className="ie-caption" id={id}>
      <p className="ie-gloss">{caption}</p>
      <p className="ie-caption__note">{note}</p>
    </figcaption>
  )
}
