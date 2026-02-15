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

type EvidenceMatrixRow = {
  dimensionId: string
  corpusLink?: string
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

function nodeSimulationSummary(node: string): string {
  const n = node.toLowerCase()
  // Keep this strictly technical (what it does), not psychological claims.
  const map: Record<string, string> = {
    grain: 'Adds fine noise texture (clamped).',
    vignette: 'Darkens edges to narrow the frame (static or gently modulated).',
    edge_sharpen: 'Subtle edge enhancement (non-flickering).',
    chroma_aberration: 'Minor RGB channel offset near edges (very low).',
    chromatic_aberration: 'Minor RGB channel offset near edges (very low).',
    temporal_smear: 'Blends previous frames for persistence/smear (feedback clamped).',
    color_grade: 'Adjusts saturation/contrast/tonal balance (clamped).',
    haze: 'Adds soft fog/veil (clamped).',
    soft_blur: 'Applies mild blur to reduce sharp detail (clamped).',
    pulse: 'Slow, bounded envelope modulation (no strobe).',
    interference: 'Adds gentle distortion artifacts (clamped; no strobe).',
    focus_jitter: 'Small, smoothed focal instability (bounded).',
    feedback_loop: 'Low-feedback image recurrence (bounded; reduced-motion disables).',
    grid_hint: 'Subtle grid overlay hint (very low contrast).',

    compressor_limiter: 'Reduces peaks and smooths dynamics (safety-first).',
    lowpass: 'Attenuates high frequencies above cutoff (clamped).',
    highpass: 'Attenuates low frequencies below cutoff (clamped).',
    tremolo: 'Slow amplitude modulation (rate/depth clamped).',
    delay: 'Short echo with low feedback/mix (clamped).',
    flutter: 'Low-depth pitch/phase wobble (clamped).',
    reverb: 'Adds gentle space/decay (clamped).',
    noise_bed: 'Adds quiet broadband noise floor (clamped).',
    pulse_tone: 'Adds a soft tone pulse (level clamped).',
  }
  return map[n] ?? 'Simulation node (see engine implementation).'
}

function parseEvidenceMatrix(root: string): Map<string, EvidenceMatrixRow> {
  const filePath = path.join(root, 'docs/references/EVIDENCE_MATRIX.md')
  if (!fs.existsSync(filePath)) return new Map()
  const text = fs.readFileSync(filePath, 'utf-8')
  const lines = text.split('\n')
  const out = new Map<string, EvidenceMatrixRow>()
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    // Expect something like:
    // | **hyperarousal** | ... | `docs/references/reports/deep-research-report.md` | **High** |
    const cols = line.split('|').map((c) => c.trim())
    if (cols.length < 6) continue
    const dimCol = cols[1] ?? ''
    const corpusCol = cols[5] ?? ''
    const m = dimCol.match(/\*\*([a-z0-9_]+)\*\*/i)
    if (!m?.[1]) continue
    const dimensionId = m[1]
    const corpus = corpusCol.match(/`([^`]+)`/)?.[1]
    out.set(dimensionId, { dimensionId, corpusLink: corpus })
  }
  return out
}

function motifIndexPage(motifs: string[]): string {
  const items = motifs
    .slice()
    .sort((a, b) => a.localeCompare(b))
    .map((m) => `- [\`${m}\`](./${m}.md) — ${nodeSimulationSummary(m)}`)
    .join('\n')

  return `# Motif / node index

This index lists **simulation motifs** (video/audio nodes) and links to their evidence pages.

> **Important:** evidence in this project primarily supports **experience dimensions and reported phenomena**. A specific node is an **artistic/engineering implementation** of a metaphor, and must be interpreted cautiously.

## Motifs

${items}
`
}

function motifPage(
  motif: string,
  usedByDims: Array<{ id: string; label: string; strength: string; doc: string }>,
  usedByConditions: Array<{ id: string; label: string; doc: string }>,
  matrixByDim: Map<string, EvidenceMatrixRow>
): string {
  const dimsList = usedByDims
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => {
      const corpus = matrixByDim.get(d.id)?.corpusLink
      const corpusPart = corpus ? ` — corpus: \`${corpus}\`` : ''
      return `- **${d.label}** (\`${d.id}\`) — Evidence (dimension): **${d.strength}** — \`${d.doc}\`${corpusPart}`
    })
    .join('\n')

  const condList = usedByConditions
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((c) => `- **${c.label}** (\`${c.id}\`) — \`${c.doc}\``)
    .join('\n')

  return `# \`${motif}\` — motif evidence

> **Non-diagnostic, metaphor framing:** This page documents how a simulation motif is used as a design metaphor. It does not diagnose, and it does not claim clinical equivalence.

## Short simulation summary

${nodeSimulationSummary(motif)}

## Evidence vs artistic implementation (make this explicit)

- **Evidence-backed** in this project refers to *reported phenomena* in the evidence corpus (see dimension pages and the matrix).
- This node is an **artistic/engineering implementation** used to represent those phenomena metaphorically.
- Therefore, the correct claim level for a node is usually **Mixed**: phenomenon supported, motif choice interpretive, implementation details artistic.

## Where this motif is used (traceability)

### Used by dimensions

${dimsList || '_Not currently referenced by any dimension._'}

### Used by condition presets

${condList || '_Not currently referenced by any condition preset._'}

## Sources (in-repo)

- \`docs/references/EVIDENCE_MATRIX.md\`
- \`docs/REFERENCES_AUDIT.md\`
- \`docs/references/reports/deep-research-report.md\`
- \`docs/references/reports/deep-research-report-2.md\`
`
}

function dimPage(dim: ExperienceDimensionDef): string {
  const video = dim.motif_summary?.video_nodes ?? []
  const audio = dim.motif_summary?.audio_nodes ?? []
  const strength = strengthLabel(dim.evidence_strength)
  const safety = dim.safety ?? []
  const rationale = dim.rationale_doc ?? `docs/references/dimensions/${dim.id}.md`

  const motifs = [...video.map((v) => ({ kind: 'video', node: v })), ...audio.map((a) => ({ kind: 'audio', node: a }))]

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

## Motif-by-motif traceability (evidence vs likelihood vs artistic)

Each motif below includes:

- a **short technical summary** (what the simulation does)
- a **claim label** (Supported / Mixed / Hypothesis / Artistic)
- **sources** (in-repo) so readers can verify

| Motif (node) | What it does in the simulation | Claim label | Likelihood label | Sources |
|---|---|---|---|---|
${motifs.length ? motifs.map((m) => {
  const claim = String(dim.evidence_strength ?? '').toLowerCase() === 'hypothesis' ? 'Hypothesis' : 'Mixed'
  const likelihood = strengthLabel(dim.evidence_strength)
  const motifDoc = `docs/references/motifs/${m.node}.md`
  return `| \`${m.node}\` | ${nodeSimulationSummary(m.node)} | **${claim}** | **${likelihood}** | \`${rationale}\`, \`docs/references/EVIDENCE_MATRIX.md\`, \`${motifDoc}\` |`
}).join('\n') : '| _none_ | _n/a_ | _n/a_ | _n/a_ | _n/a_ |'}

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

  // Collect motifs from included dimensions (for quick scanning).
  const motifSet = new Set<string>()
  for (const d of dims) {
    const def = dimsById.get(d.id)
    for (const n of def?.motif_summary?.video_nodes ?? []) motifSet.add(n)
    for (const n of def?.motif_summary?.audio_nodes ?? []) motifSet.add(n)
  }
  const motifs = Array.from(motifSet).sort((a, b) => a.localeCompare(b))

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

## Motifs used in this preset (quick traceability)

These motifs are used by the included dimensions. Each motif is an **artistic/engineering implementation** of a metaphor; the evidence applies primarily to the dimension phenomena.

${motifs.length ? motifs.map((m) => `- \`${m}\` — ${nodeSimulationSummary(m)} — \`docs/references/motifs/${m}.md\``).join('\n') : '_No motifs listed._'}

## Safety notes / warnings shown in product

${warnings.length ? warnings.map((w) => `- ${w}`).join('\n') : '- Use Safe Mode or stop at any time.'}
`
}

function main(): void {
  const root = process.cwd()

  const dimsFile = readJsonFirstObject<ExperienceDimensionsFile>(path.join(root, 'src/conditions/experience-dimensions.json'))
  const dims = (dimsFile.dimensions ?? []).slice()
  const dimsById = new Map(dims.map((d) => [d.id, d]))
  const matrixByDim = parseEvidenceMatrix(root)

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

  // Motif pages
  const outMotifsDir = path.join(root, 'docs/references/motifs')
  ensureDir(outMotifsDir)

  const motifsAll = new Set<string>()
  for (const dim of dims) {
    for (const n of dim.motif_summary?.video_nodes ?? []) motifsAll.add(n)
    for (const n of dim.motif_summary?.audio_nodes ?? []) motifsAll.add(n)
  }

  const motifsList = Array.from(motifsAll)
  writeFileIfChanged(path.join(outMotifsDir, 'INDEX.md'), motifIndexPage(motifsList))

  // Build condition metadata for motif pages
  const condMeta: Array<{ id: string; label: string; dims: string[] }> = []
  for (const file of profileFiles) {
    const prof = readJsonFirstObject<Profile>(path.join(profilesDir, file))
    const dimIds = (prof.experience_dimensions ?? []).map((d) => d.id)
    condMeta.push({ id: prof.id, label: prof.label, dims: dimIds })
  }

  for (const motif of motifsList) {
    const usedByDims: Array<{ id: string; label: string; strength: string; doc: string }> = []
    for (const dim of dims) {
      const nodes = [...(dim.motif_summary?.video_nodes ?? []), ...(dim.motif_summary?.audio_nodes ?? [])]
      if (nodes.includes(motif)) {
        usedByDims.push({
          id: dim.id,
          label: dim.label,
          strength: strengthLabel(dim.evidence_strength),
          doc: dim.rationale_doc ?? `docs/references/dimensions/${dim.id}.md`,
        })
      }
    }
    const usedByConditions: Array<{ id: string; label: string; doc: string }> = []
    for (const c of condMeta) {
      const any = c.dims.some((d) => usedByDims.some((u) => u.id === d))
      if (any) usedByConditions.push({ id: c.id, label: c.label, doc: `docs/references/conditions/${c.id}.md` })
    }
    writeFileIfChanged(path.join(outMotifsDir, `${motif}.md`), motifPage(motif, usedByDims, usedByConditions, matrixByDim))
  }

  console.log(
    `[evidence-pages-gen] Wrote ${dims.length} dimension page(s), ${profileFiles.length} condition page(s), ${motifsList.length} motif page(s).`
  )
}

main()

