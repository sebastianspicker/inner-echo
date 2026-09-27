import { describe, expect, it } from 'vitest'

import catalogFile from '../../src/content/experience/catalog.json'
import experienceDimensionsFile from '../../src/content/experience/experience-dimensions.json'
import dimensionToSignalMappingFile from '../../src/content/experience/dimension-to-signal-mapping.json'
import {
  catalogSchema,
  dimensionToSignalMappingFileSchema,
  experienceDimensionsFileSchema,
  profileSchema,
} from '../../src/domain/experience/schema'

// Bundled profile modules, eagerly resolved (mirrors the loader's own glob pattern).
const profileModules = import.meta.glob<{ default: Record<string, unknown> }>(
  '../../src/content/experience/profiles/*.json',
  { eager: true },
)

// Guards the switch to returning `result.data`: zod must not strip or default fields
// the bundled JSON already sets, or content adapters would silently change shape.
describe('bundled content JSON survives schema validation unchanged', () => {
  it('parses catalog.json without stripping or defaulting fields', () => {
    const result = catalogSchema.safeParse(catalogFile)
    if (!result.success) throw new Error(result.error.message)
    expect(result.data).toEqual(catalogFile)
  })

  it('parses experience-dimensions.json without stripping or defaulting fields', () => {
    const result = experienceDimensionsFileSchema.safeParse(experienceDimensionsFile)
    if (!result.success) throw new Error(result.error.message)
    expect(result.data).toEqual(experienceDimensionsFile)
  })

  it('parses dimension-to-signal-mapping.json without stripping or defaulting fields', () => {
    const result = dimensionToSignalMappingFileSchema.safeParse(dimensionToSignalMappingFile)
    if (!result.success) throw new Error(result.error.message)
    expect(result.data).toEqual(dimensionToSignalMappingFile)
  })

  it('parses every bundled profile without stripping or defaulting fields', () => {
    const paths = Object.keys(profileModules)
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) {
      const raw = profileModules[path].default
      const result = profileSchema.safeParse(raw)
      if (!result.success) throw new Error(`${path}: ${result.error.message}`)
      expect(result.data).toEqual(raw)
    }
  })
})
