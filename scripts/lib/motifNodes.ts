import type { DimensionToSignalMappingFile } from '../../src/conditions/schema'

export function motifNodes(
  entry: DimensionToSignalMappingFile['mapping'][string] | undefined,
  kind: 'video' | 'audio',
) {
  const motifs = kind === 'video' ? (entry?.video_motifs ?? []) : (entry?.audio_motifs ?? [])
  return Array.from(
    new Set(motifs.map((motif) => String(motif.node ?? '').trim()).filter(Boolean)),
  ).join(', ')
}
