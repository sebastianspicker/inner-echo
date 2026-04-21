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

function loadJson<T>(pathFromRoot: string): T {
  return parseFirstJsonObject(readFileSync(join(ROOT, pathFromRoot), 'utf-8'))
}

function norm(s: unknown): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
}

function uniqSorted(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function main(): void {
  const implementedVideo = uniqSorted(Array.from(IMPLEMENTED_VIDEO_NODES))
  const implementedAudio = uniqSorted(Array.from(IMPLEMENTED_AUDIO_NODES))

  const referencedVideo: string[] = []
  const referencedAudio: string[] = []

  // Profiles
  const profilesDir = join(ROOT, 'src/conditions/profiles')
  const profiles = readdirSync(profilesDir).filter((f) => f.endsWith('.json'))
  for (const f of profiles) {
    const p = loadJson<Profile>(`src/conditions/profiles/${f}`)
    for (const n of p.video_stack ?? []) referencedVideo.push(norm(n.node))
    for (const n of p.audio_stack?.chain ?? []) referencedAudio.push(norm(n.node))
  }

  // Dimension mapping motifs
  const mapping = loadJson<DimensionToSignalMappingFile>(
    'src/conditions/dimension-to-signal-mapping.json',
  )
  for (const entry of Object.values(mapping.mapping ?? {})) {
    for (const m of entry.video_motifs ?? []) referencedVideo.push(norm(m.node))
    for (const m of entry.audio_motifs ?? []) referencedAudio.push(norm(m.node))
  }

  const refV = uniqSorted(referencedVideo)
  const refA = uniqSorted(referencedAudio)

  const missingVideo = refV.filter((n) => n && !implementedVideo.includes(n))
  const missingAudio = refA.filter((n) => n && !implementedAudio.includes(n))

  console.log('[nodes-report] Implemented video nodes:', implementedVideo.join(', ') || '(none)')
  console.log('[nodes-report] Implemented audio nodes:', implementedAudio.join(', ') || '(none)')
  console.log('[nodes-report] Referenced video nodes:', refV.join(', ') || '(none)')
  console.log('[nodes-report] Referenced audio nodes:', refA.join(', ') || '(none)')
  console.log('---')
  console.log('[nodes-report] Missing video nodes:', missingVideo.join(', ') || '(none)')
  console.log('[nodes-report] Missing audio nodes:', missingAudio.join(', ') || '(none)')

  if (missingVideo.length || missingAudio.length) process.exit(1)
}

main()
