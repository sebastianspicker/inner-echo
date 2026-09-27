import fs from 'node:fs'
import path from 'node:path'

import type { MotifClaim } from '../contracts/motifs/claims'
import { allMotifs, usedByConditions, usedByDimensions } from './evidencePageModel'
import {
  renderConditionPage,
  renderDimensionPage,
  renderMotifIndexPage,
  renderMotifPage,
} from './evidencePageRendering'
import type { Profile } from './evidencePageParsing'
import { evidencePagePath, validateEvidenceDestinations } from './evidencePagePaths'
import type {
  EvidenceMatrixRow,
  ExperienceDimensionDef,
  ScientificSource,
} from './evidencePageFormatting'

function ensureDir(directory: string) {
  fs.mkdirSync(directory, { recursive: true })
}

function writeFileIfChanged(filePath: string, contents: string) {
  const previous = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null
  if (previous === contents) return
  fs.writeFileSync(filePath, contents, 'utf-8')
}

export type EvidencePageInputs = {
  claimsByKey: Map<string, MotifClaim>
  dimensions: ExperienceDimensionDef[]
  matrixByDim: Map<string, EvidenceMatrixRow>
  profiles: Profile[]
  root: string
  sourcesByDim: Map<string, ScientificSource[]>
}

export function writeEvidencePages({
  claimsByKey,
  dimensions,
  matrixByDim,
  profiles,
  root,
  sourcesByDim,
}: EvidencePageInputs) {
  const dimensionsById = new Map(dimensions.map((dimension) => [dimension.id, dimension]))
  const dimensionsDir = path.join(root, 'docs/references/dimensions')
  const conditionsDir = path.join(root, 'docs/references/conditions')
  const motifsDir = path.join(root, 'docs/references/motifs')
  validateEvidenceDestinations(root, [dimensionsDir, conditionsDir, motifsDir])
  // Retain reference paths for legacy presets even when no default uses a motif.
  const retainedMotifs = (fs.existsSync(motifsDir) ? fs.readdirSync(motifsDir) : [])
    .filter((file) => file.endsWith('.md') && file !== 'INDEX.md')
    .map((file) => file.slice(0, -3))
  const motifs = Array.from(new Set([...allMotifs(dimensions, profiles), ...retainedMotifs])).sort()
  if (motifs.some((motif) => motif.toUpperCase() === 'INDEX')) {
    throw new Error('INDEX is reserved for the evidence motif index')
  }
  validateEvidenceDestinations(root, [
    ...dimensions.map(({ id }) => evidencePagePath(dimensionsDir, id)),
    ...profiles.map(({ id }) => evidencePagePath(conditionsDir, id)),
    ...motifs.map((id) => evidencePagePath(motifsDir, id)),
    evidencePagePath(motifsDir, 'INDEX'),
  ])
  ensureDir(dimensionsDir)
  ensureDir(conditionsDir)
  ensureDir(motifsDir)
  for (const dimension of dimensions) {
    writeFileIfChanged(
      evidencePagePath(dimensionsDir, dimension.id),
      renderDimensionPage(dimension, claimsByKey),
    )
  }
  for (const profile of profiles) {
    writeFileIfChanged(
      evidencePagePath(conditionsDir, profile.id),
      renderConditionPage(profile, dimensionsById),
    )
  }
  writeFileIfChanged(path.join(motifsDir, 'INDEX.md'), renderMotifIndexPage(motifs))
  for (const motif of motifs) {
    const usedDimensions = usedByDimensions(motif, dimensions)
    const usedConditions = usedByConditions(motif, profiles)
    writeFileIfChanged(
      evidencePagePath(motifsDir, motif),
      renderMotifPage(
        motif,
        usedDimensions,
        usedConditions,
        matrixByDim,
        claimsByKey,
        sourcesByDim,
      ),
    )
  }
  return motifs.length
}
