import type { AudioStackConfig, VideoStackNodeDef } from '../schema'
import {
  AUDIO_ORDER_GROUP,
  deduplicateStackIds,
  mergeNumericWeighted,
  mergeParams,
  sortStackKeys,
  VIDEO_ORDER_GROUP,
} from './composeBlend'
import type { CollectedAudioContributions, CollectedStackEntry } from './stackContributions'
import { clamp01, type ComposerSettings } from './types'

function finalizeEntries(
  entries: Map<string, CollectedStackEntry>,
  orderGroups: Record<string, number>,
): Array<{ id: string; node: string; params: Record<string, unknown> }> {
  const items = Array.from(entries.entries()).map(([key, value]) => ({
    key,
    node: value.node,
    id: value.id,
    minIndex: value.minIndex,
    minOrderGroup: orderGroups[value.node] ?? 1000,
    params: mergeParams(value.contribs),
  }))
  sortStackKeys(items)
  return items.map(({ id, node, params }) => ({ id, node, params }))
}

export function finalizeVideoStack(entries: Map<string, CollectedStackEntry>): VideoStackNodeDef[] {
  return deduplicateStackIds(finalizeEntries(entries, VIDEO_ORDER_GROUP))
}

export function finalizeAudioStack(
  collected: CollectedAudioContributions,
  settings: ComposerSettings,
): AudioStackConfig {
  const chain = deduplicateStackIds(
    finalizeEntries(collected.entries, AUDIO_ORDER_GROUP).map(({ node, params }) => ({
      id: node,
      node,
      params,
    })),
  )
  const enabled = settings.audioEnabled && collected.anyAudioDeclared
  const baseMaster = enabled ? mergeNumericWeighted(collected.masterVolumes) : 0
  return {
    enabled,
    input: 'synth',
    master: { volume: clamp01(baseMaster || 0.2) },
    chain,
  }
}
