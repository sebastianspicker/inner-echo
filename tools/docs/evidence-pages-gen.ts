/**
 * Generate evidence pages from canonical JSON into docs/references.
 *
 * IMPORTANT: Do NOT modify `src/content/experience/**` files. This command
 * reads bundled content and writes only generated evidence documentation.
 */

import { parseMotifClaims } from '../contracts/motifs/claims'
import {
  loadDimensions,
  loadProfiles,
  parseCorpusSourcesByDimension,
  parseEvidenceMatrix,
} from './evidencePageParsing'
import { writeEvidencePages } from './evidencePageWriting'
import { writeMappingSummary } from './mapping-summary'

function main() {
  const root = process.cwd()
  const dimensions = loadDimensions(root).slice()
  const profiles = loadProfiles(root)
  const motifCount = writeEvidencePages({
    root,
    dimensions,
    profiles,
    matrixByDim: parseEvidenceMatrix(root),
    claimsByKey: parseMotifClaims(root),
    sourcesByDim: parseCorpusSourcesByDimension(root),
  })
  console.log(
    `[evidence-pages-gen] Wrote ${dimensions.length} dimension page(s), ${profiles.length} condition page(s), ${motifCount} motif page(s).`,
  )
  writeMappingSummary(root)
}

main()
