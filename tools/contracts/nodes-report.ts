/**
 * Step 6: Missing nodes report.
 *
 * Scans SSOT condition sources:
 * - `src/content/experience/profiles/*.json` (video_stack + audio_stack.chain)
 * - `src/content/experience/dimension-to-signal-mapping.json` (video_motifs + audio_motifs)
 *
 * Compares referenced nodes against implemented engine factories:
 * - video: `src/runtime/visual/graph/graphBuilder.ts` NODE_FACTORY keys
 * - audio: `src/runtime/audio/audioGraphBuilder.ts` FX_FACTORY keys
 */

import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { IMPLEMENTED_VIDEO_NODES, IMPLEMENTED_AUDIO_NODES } from '../../src/runtime/capabilities'
import type { DimensionToSignalMappingFile, Profile } from '../../src/domain/experience/schema'
import { loadRepoJson } from '../docs/repoJson'

const ROOT = process.cwd()

function norm(s: unknown) {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

function uniqSorted(xs: string[]) {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function collectProfileNodes(referencedVideo: string[], referencedAudio: string[]) {
  const profilesDir = join(ROOT, 'src/content/experience/profiles')
  for (const file of readdirSync(profilesDir).filter((candidate) => candidate.endsWith('.json'))) {
    const profile = loadRepoJson<Profile>(ROOT, `src/content/experience/profiles/${file}`)
    for (const node of profile.video_stack ?? []) referencedVideo.push(norm(node.node))
    for (const node of profile.audio_stack?.chain ?? []) referencedAudio.push(norm(node.node))
  }
}

function collectMappingNodes(referencedVideo: string[], referencedAudio: string[]) {
  const mapping = loadRepoJson<DimensionToSignalMappingFile>(
    ROOT,
    'src/content/experience/dimension-to-signal-mapping.json',
  )
  for (const entry of Object.values(mapping.mapping ?? {}))
    collectMotifNodes(entry, referencedVideo, referencedAudio)
}

function collectMotifNodes(
  entry: DimensionToSignalMappingFile['mapping'][string],
  referencedVideo: string[],
  referencedAudio: string[],
) {
  for (const motif of entry.video_motifs ?? []) referencedVideo.push(norm(motif.node))
  for (const motif of entry.audio_motifs ?? []) referencedAudio.push(norm(motif.node))
}

function logNodeReport(
  implementedVideo: string[],
  implementedAudio: string[],
  referencedVideo: string[],
  referencedAudio: string[],
  missingVideo: string[],
  missingAudio: string[],
) {
  console.log('[nodes-report] Implemented video nodes:', implementedVideo.join(', ') || '(none)')
  console.log('[nodes-report] Implemented audio nodes:', implementedAudio.join(', ') || '(none)')
  console.log('[nodes-report] Referenced video nodes:', referencedVideo.join(', ') || '(none)')
  console.log('[nodes-report] Referenced audio nodes:', referencedAudio.join(', ') || '(none)')
  console.log('---')
  console.log('[nodes-report] Missing video nodes:', missingVideo.join(', ') || '(none)')
  console.log('[nodes-report] Missing audio nodes:', missingAudio.join(', ') || '(none)')
}

function main() {
  const implementedVideo = uniqSorted(Array.from(IMPLEMENTED_VIDEO_NODES))
  const implementedAudio = uniqSorted(Array.from(IMPLEMENTED_AUDIO_NODES))

  const referencedVideo: string[] = []
  const referencedAudio: string[] = []

  collectProfileNodes(referencedVideo, referencedAudio)
  collectMappingNodes(referencedVideo, referencedAudio)

  const refV = uniqSorted(referencedVideo)
  const refA = uniqSorted(referencedAudio)

  const missingVideo = refV.filter((n) => n && !implementedVideo.includes(n))
  const missingAudio = refA.filter((n) => n && !implementedAudio.includes(n))

  logNodeReport(implementedVideo, implementedAudio, refV, refA, missingVideo, missingAudio)

  if (missingVideo.length || missingAudio.length) process.exit(1)
}

main()
