/**
 * Step 6: Missing nodes report.
 *
 * Scans SSOT condition sources:
 * - `src/conditions/profiles/*.json` (video_stack + audio_stack.chain)
 * - `src/conditions/dimension-to-signal-mapping.json` (video_motifs + audio_motifs)
 *
 * Compares referenced nodes against implemented engine factories:
 * - video: `src/conditions/graphBuilder.ts` NODE_FACTORY keys
 * - audio: `src/engine/audio/audioGraphBuilder.ts` FX_FACTORY keys
 */

import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { parseFirstJsonObject } from '../src/utils/jsonObjectParser'
import { IMPLEMENTED_VIDEO_NODES, IMPLEMENTED_AUDIO_NODES } from '../src/engine/nodeTypes'
import type { DimensionToSignalMappingFile, Profile } from '../src/conditions/schema'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const norm = (s: unknown): string => {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

const uniqSorted = (xs: string[]): string[] => {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

const collectProfileNodes = (): { video: string[]; audio: string[] } => {
  const video: string[] = []
  const audio: string[] = []
  const profilesDir = join(ROOT, 'src/conditions/profiles')
  for (const file of readdirSync(profilesDir).filter((entry) => entry.endsWith('.json'))) {
    const profile = loadJson<Profile>(`src/conditions/profiles/${file}`)
    for (const node of profile.video_stack ?? []) video.push(norm(node.node))
    for (const node of profile.audio_stack?.chain ?? []) audio.push(norm(node.node))
  }
  return { video, audio }
}

const collectMappedNodes = (): { video: string[]; audio: string[] } => {
  const mapping = loadJson<DimensionToSignalMappingFile>(
    'src/conditions/dimension-to-signal-mapping.json',
  )
  const video: string[] = []
  const audio: string[] = []
  for (const entry of Object.values(mapping.mapping ?? {})) {
    for (const motif of entry.video_motifs ?? []) video.push(norm(motif.node))
    for (const motif of entry.audio_motifs ?? []) audio.push(norm(motif.node))
  }
  return { video, audio }
}

const logNodeList = (label: string, nodes: string[]): void => {
  console.log('[nodes-report] %s: %s', label, nodes.join(', ') || '(none)')
}

const main = (): void => {
  const implementedVideo = uniqSorted(Array.from(IMPLEMENTED_VIDEO_NODES))
  const implementedAudio = uniqSorted(Array.from(IMPLEMENTED_AUDIO_NODES))
  const profileNodes = collectProfileNodes()
  const mappedNodes = collectMappedNodes()
  const refV = uniqSorted([...profileNodes.video, ...mappedNodes.video])
  const refA = uniqSorted([...profileNodes.audio, ...mappedNodes.audio])

  const missingVideo = refV.filter((n) => n && !implementedVideo.includes(n))
  const missingAudio = refA.filter((n) => n && !implementedAudio.includes(n))

  logNodeList('Implemented video nodes', implementedVideo)
  logNodeList('Implemented audio nodes', implementedAudio)
  logNodeList('Referenced video nodes', refV)
  logNodeList('Referenced audio nodes', refA)
  console.log('---')
  logNodeList('Missing video nodes', missingVideo)
  logNodeList('Missing audio nodes', missingAudio)

  if (missingVideo.length || missingAudio.length) process.exit(1)
}

const loadJson = <T>(pathFromRoot: string): T => {
  return parseFirstJsonObject(readFileSync(join(ROOT, pathFromRoot), 'utf-8'))
}

main()
