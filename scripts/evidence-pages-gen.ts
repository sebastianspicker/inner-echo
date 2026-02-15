/**
 * Generate evidence pages from SSOT JSON (read-only) into docs/references.
 *
 * Goals:
 * - Keep docs navigable and non-diagnostic.
 * - Avoid adding new external claims; cite only in-repo corpus pages.
 * - Ensure every dimension and condition has an evidence page.
 *
 * IMPORTANT: Do NOT modify `src/conditions/**` files (read-only contract).
 */

import fs from 'node:fs'
import path from 'node:path'

type EvidenceStrength = 'high' | 'medium' | 'low' | 'hypothesis' | string

type ExperienceDimensionDef = {
  id: string
  label: string
  description: string
  safety?: string[]
  evidence_strength?: EvidenceStrength
  rationale_doc?: string
  motif_summary?: { video_nodes?: string[]; audio_nodes?: string[] }
}

type ExperienceDimensionsFile = {
  version?: string
  note?: string
  dimensions: ExperienceDimensionDef[]
}

type Profile = {
  id: string
  label: string
  summary?: string
  experience_dimensions?: Array<{ id: string; weight: number }>
  safety?: { warnings?: string[] }
}

function parseFirstJsonObject(text: string): unknown {
  const start = text.indexOf('{')
  if (start < 0) throw new Error('No JSON object start found')
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (inString) {
      if (escape) escape = false
      else if (ch === '\\') escape = true
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
      if (depth === 0) return JSON.parse(text.slice(start, i + 1))
    }
  }
  throw new Error('Unterminated JSON object')
}

function readJsonFirstObject<T>(filePath: string): T {
  const text = fs.readFileSync(filePath, 'utf-8')
  return parseFirstJsonObject(text) as T
}

function ensureDir(dir: string): void {
  fs.mkdirSync(dir, { recursive: true })
}

function writeFileIfChanged(filePath: string, contents: string): void {
  const prev = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null
  if (prev === contents) return
  fs.writeFileSync(filePath, contents, 'utf-8')
}

function strengthLabel(s?: string): string {
  const x = String(s ?? '').toLowerCase()
  if (x === 'high') return 'High'
  if (x === 'medium') return 'Medium'
  if (x === 'low') return 'Low'
  if (x === 'hypothesis') return 'Hypothesis (evidence gap)'
  return s ? String(s) : 'Unrated'
}

function normalizeStrength(s?: string): 'high' | 'medium' | 'low' | 'hypothesis' | 'unrated' {
  const x = String(s ?? '').toLowerCase()
  if (x === 'high') return 'high'
  if (x === 'medium') return 'medium'
  if (x === 'low') return 'low'
  if (x === 'hypothesis') return 'hypothesis'
  return 'unrated'
}

function dimPage(dim: ExperienceDimensionDef): string {
  const video = dim.motif_summary?.video_nodes ?? []
  const audio = dim.motif_summary?.audio_nodes ?? []
  const strength = strengthLabel(dim.evidence_strength)
  const safety = dim.safety ?? []
  const rationale = dim.rationale_doc ?? `docs/references/dimensions/${dim.id}.md`

  return `# ${dim.label}

> **Non-diagnostic, metaphor framing:** This page supports design rationale for audiovisual metaphors. It does not diagnose or simulate a disorder.

## Summary

- **Dimension**: \`${dim.id}\`
- **Definition (repo)**: ${dim.description}
- **Evidence strength (communication label)**: **${strength}**

## What the product maps (default motifs)

These are the conservative *default-enabled* motifs used by the composer when this dimension is selected:

- **Video nodes**: ${video.length ? video.map((v) => `\`${v}\``).join(', ') : '_none_'}
- **Audio nodes**: ${audio.length ? audio.map((a) => `\`${a}\``).join(', ') : '_none_'}

## Evidence links (in-repo)

- **Matrix row**: \`docs/references/EVIDENCE_MATRIX.md\`
- **Audit (what’s wired by default)**: \`docs/REFERENCES_AUDIT.md\`
- **Long-form corpus**:
  - \`docs/references/reports/deep-research-report.md\`
  - \`docs/references/reports/deep-research-report-2.md\`

> Note: this page intentionally avoids introducing new external citations beyond the in-repo corpus. Bibliographies live in the report documents above.

## Safety notes (must remain true in the product)

${safety.length ? safety.map((s) => `- ${s}`).join('\n') : '- Keep modulation smooth, bounded, and user-controlled.'}

## Claim labeling

- **Supported**: the corpus supports the phenomenon and a conservative mapping is plausible.
- **Mixed**: phenomenon is supported, but the specific motif choice is interpretive.
- **Hypothesis**: evidence gap; keep conservative / off-by-default.

## Rationale doc path (self-reference)

- \`${rationale}\`
`
}

function conditionPage(profile: Profile, dimsById: Map<string, ExperienceDimensionDef>): string {
  const dims = (profile.experience_dimensions ?? []).slice().sort((a, b) => a.id.localeCompare(b.id))
  const warnings = profile.safety?.warnings ?? []

  // Aggregate strength conservatively: hypothesis > low > medium > high.
  let agg: 'high' | 'medium' | 'low' | 'hypothesis' | 'unrated' = 'unrated'
  for (const d of dims) {
    const s = normalizeStrength(dimsById.get(d.id)?.evidence_strength)
    if (s === 'hypothesis') {
      agg = 'hypothesis'
      break
    }
    if (s === 'low' && agg !== 'hypothesis') agg = agg === 'unrated' ? 'low' : agg === 'high' ? 'low' : agg === 'medium' ? 'low' : agg
    if (s === 'medium' && (agg === 'unrated' || agg === 'high')) agg = 'medium'
    if (s === 'high' && agg === 'unrated') agg = 'high'
  }

  const aggLabel = strengthLabel(agg === 'unrated' ? undefined : agg)

  return `# ${profile.label} — evidence summary

> **Non-diagnostic, metaphor framing:** This summary explains which evidence-backed dimensions are used for this preset. It does not describe a diagnosis and does not claim clinical equivalence.

## Summary

- **Condition preset**: \`${profile.id}\`
- **Evidence summary (conservative)**: **${aggLabel}**
- **What this is**: a curated composition of experience dimensions and conservative AV motifs.
- **What this is not**: a diagnostic model, a therapy tool, or a statement about “what X looks like”.

## Included experience dimensions

${dims.length ? dims.map((d) => {
  const def = dimsById.get(d.id)
  const label = def?.label ?? d.id
  const strength = strengthLabel(def?.evidence_strength)
  const doc = def?.rationale_doc ?? `docs/references/dimensions/${d.id}.md`
  return `- **${label}** (\`${d.id}\`, weight ${Math.round(d.weight * 100)}%) — Evidence: **${strength}** — \`${doc}\``
}).join('\n') : '_No dimensions listed in profile._'}

## Evidence links (in-repo)

- \`docs/references/README.md\` (Evidence & Method)
- \`docs/references/EVIDENCE_MATRIX.md\` (matrix)
- \`docs/REFERENCES_AUDIT.md\` (audit)

## Safety notes / warnings shown in product

${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- Use Safe Mode or stop at any time.'}
`
}

function main(): void {
  const root = process.cwd()

  const dimsFile = readJsonFirstObject<ExperienceDimensionsFile>(path.join(root, 'src/conditions/experience-dimensions.json'))
  const dims = (dimsFile.dimensions ?? []).slice()
  const dimsById = new Map(dims.map((d) => [d.id, d]))

  const outDimsDir = path.join(root, 'docs/references/dimensions')
  ensureDir(outDimsDir)

  for (const dim of dims) {
    const filePath = path.join(outDimsDir, `${dim.id}.md`)
    writeFileIfChanged(filePath, dimPage(dim))
  }

  const profilesDir = path.join(root, 'src/conditions/profiles')
  const profileFiles = fs.readdirSync(profilesDir).filter((f) => f.endsWith('.json'))

  const outConditionsDir = path.join(root, 'docs/references/conditions')
  ensureDir(outConditionsDir)

  for (const file of profileFiles) {
    const prof = readJsonFirstObject<Profile>(path.join(profilesDir, file))
    const filePath = path.join(outConditionsDir, `${prof.id}.md`)
    writeFileIfChanged(filePath, conditionPage(prof, dimsById))
  }

  console.log(`[evidence-pages-gen] Wrote ${dims.length} dimension page(s) and ${profileFiles.length} condition page(s).`)
}

main()

