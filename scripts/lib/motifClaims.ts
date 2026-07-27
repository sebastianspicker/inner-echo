import fs from 'node:fs'
import path from 'node:path'

export type MotifClaimLabel = 'supported' | 'mixed' | 'artistic' | 'hypothesis'
export type MotifClaim = {
  dimensionId: string
  motif: string
  label: MotifClaimLabel
  why?: string
  sources: string[]
}
type MotifClaimsFile = { claims: MotifClaim[] }

export function parseMotifClaims(root: string) {
  const filePath = path.join(root, 'docs/references/MOTIF_CLAIMS.json')
  if (!fs.existsSync(filePath)) return new Map<string, MotifClaim>()
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as MotifClaimsFile
  return toClaimMap(data.claims ?? [])
}

function toClaimMap(claims: MotifClaim[]) {
  const out = new Map<string, MotifClaim>()
  for (const claim of claims) addClaim(out, claim)
  return out
}

function addClaim(out: Map<string, MotifClaim>, claim: MotifClaim) {
  const dimensionId = String(claim.dimensionId ?? '').trim()
  const motif = String(claim.motif ?? '').trim()
  if (!dimensionId || !motif) return
  out.set(`${dimensionId}|${motif}`, {
    dimensionId,
    motif,
    label: claim.label,
    why: claim.why,
    sources: Array.isArray(claim.sources) ? claim.sources.map(String) : [],
  })
}
