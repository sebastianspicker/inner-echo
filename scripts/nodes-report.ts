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

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function loadJson(pathFromRoot: string): any {
  return parseFirstJsonObject(readFileSync(join(ROOT, pathFromRoot), 'utf-8'))
}

function norm(s: unknown): string {
  return String(s ?? '').trim().toLowerCase()
}

function uniqSorted(xs: string[]): string[] {
  return Array.from(new Set(xs.filter(Boolean))).sort((a, b) => a.localeCompare(b))
}

function extractObjectKeysFromFactorySource(text: string, constName: string): string[] {
  // Very small parser: find "const NAME: ... = { ... }" and extract top-level keys before ':'.
  const idx = text.indexOf(`const ${constName}`)
  if (idx < 0) return []
  const braceStart = text.indexOf('{', idx)
  if (braceStart < 0) return []
  let depth = 0
  let inString = false
  let escaped = false
  let end = -1
  for (let i = braceStart; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') {
      inString = true
      continue
    }
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end < 0) return []
  const body = text.slice(braceStart + 1, end)
  const keys: string[] = []

  // Track nested braces within the object literal so we only capture top-level keys.
  let braceDepth = 0
  let lineInString = false
  let lineEscape = false

  function updateDepthFromLine(line: string): void {
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (lineInString) {
        if (lineEscape) lineEscape = false
        else if (ch === '\\') lineEscape = true
        else if (ch === '"') lineInString = false
        continue
      }
      if (ch === '"') {
        lineInString = true
        continue
      }
      if (ch === '{') braceDepth++
      if (ch === '}') braceDepth = Math.max(0, braceDepth - 1)
    }
  }

  for (const line of body.split('\n')) {
    // Capture only when we're at the top level of the object literal.
    if (braceDepth === 0) {
      const m = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/)
      if (m?.[1]) keys.push(m[1])
    }
    updateDepthFromLine(line)
  }

  return uniqSorted(keys.map((k) => k.toLowerCase()))
}

function main(): void {
  const graphBuilderSrc = readFileSync(join(ROOT, 'src/conditions/graphBuilder.ts'), 'utf-8')
  const audioGraphBuilderSrc = readFileSync(join(ROOT, 'src/engine/audio/audioGraphBuilder.ts'), 'utf-8')

  const implementedVideo = extractObjectKeysFromFactorySource(graphBuilderSrc, 'NODE_FACTORY')
  const implementedAudio = extractObjectKeysFromFactorySource(audioGraphBuilderSrc, 'FX_FACTORY')

  const referencedVideo: string[] = []
  const referencedAudio: string[] = []

  // Profiles
  const profilesDir = join(ROOT, 'src/conditions/profiles')
  const profiles = readdirSync(profilesDir).filter((f) => f.endsWith('.json'))
  for (const f of profiles) {
    const p = loadJson(`src/conditions/profiles/${f}`)
    for (const n of p.video_stack ?? []) referencedVideo.push(norm(n.node))
    for (const n of p.audio_stack?.chain ?? []) referencedAudio.push(norm(n.node))
  }

  // Dimension mapping motifs
  const mapping = loadJson('src/conditions/dimension-to-signal-mapping.json')
  for (const entry of Object.values(mapping.mapping ?? {})) {
    const e: any = entry
    for (const m of e.video_motifs ?? []) referencedVideo.push(norm(m.node))
    for (const m of e.audio_motifs ?? []) referencedAudio.push(norm(m.node))
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
