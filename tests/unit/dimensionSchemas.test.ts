import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  experienceDimensionsFileSchema,
  experienceDimensionDefSchema,
  dimensionToSignalMappingFileSchema,
  dimensionSignalMappingEntrySchema,
} from '../../src/conditions/schema'
import { parseFirstJsonObject } from '../../src/utils/jsonObjectParser'

// ---------------------------------------------------------------------------
// Helpers: read & parse the JSON files the same way the adapters do (first
// balanced JSON object, tolerating duplicate top-level objects in the source).
// ---------------------------------------------------------------------------

function loadExperienceDimensions(): unknown {
  const raw = readFileSync(
    resolve(__dirname, '../../src/conditions/experience-dimensions.json'),
    'utf-8',
  )
  return parseFirstJsonObject(raw, {
    predicate(value) {
      const dims = (value as { dimensions?: unknown }).dimensions
      return Array.isArray(dims)
    },
  })
}

function loadDimensionToSignalMapping(): unknown {
  const raw = readFileSync(
    resolve(__dirname, '../../src/conditions/dimension-to-signal-mapping.json'),
    'utf-8',
  )
  return parseFirstJsonObject(raw, {
    predicate(value) {
      const mapping = (value as { mapping?: unknown }).mapping
      return mapping != null && typeof mapping === 'object' && !Array.isArray(mapping)
    },
  })
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('experience-dimensions.json schema validation', () => {
  const data = loadExperienceDimensions()

  it('passes the top-level file schema', () => {
    const result = experienceDimensionsFileSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('has a non-empty dimensions array', () => {
    const result = experienceDimensionsFileSchema.parse(data as Record<string, unknown>)
    expect(result.dimensions.length).toBeGreaterThan(0)
  })

  it('every dimension entry passes the entry schema', () => {
    const file = experienceDimensionsFileSchema.parse(data as Record<string, unknown>)
    for (const dim of file.dimensions) {
      const result = experienceDimensionDefSchema.safeParse(dim)
      expect(result.success, `Dimension "${dim.id}" failed validation`).toBe(true)
    }
  })

  it('every dimension has a unique id', () => {
    const file = experienceDimensionsFileSchema.parse(data as Record<string, unknown>)
    const ids = file.dimensions.map((d) => d.id)
    expect(ids).toEqual([...new Set(ids)])
  })
})

describe('dimension-to-signal-mapping.json schema validation', () => {
  const data = loadDimensionToSignalMapping()

  it('passes the top-level file schema', () => {
    const result = dimensionToSignalMappingFileSchema.safeParse(data)
    expect(result.success).toBe(true)
  })

  it('has at least one mapping entry', () => {
    const file = dimensionToSignalMappingFileSchema.parse(data as Record<string, unknown>)
    expect(Object.keys(file.mapping).length).toBeGreaterThan(0)
  })

  it('every mapping entry passes the entry schema', () => {
    const file = dimensionToSignalMappingFileSchema.parse(data as Record<string, unknown>)
    for (const [key, entry] of Object.entries(file.mapping)) {
      const result = dimensionSignalMappingEntrySchema.safeParse(entry)
      expect(result.success, `Mapping entry "${key}" failed validation`).toBe(true)
    }
  })

  it('mapping keys match known dimension ids', () => {
    const dims = loadExperienceDimensions() as { dimensions: Array<{ id: string }> }
    const dimIds = new Set(dims.dimensions.map((d) => d.id))
    const file = dimensionToSignalMappingFileSchema.parse(data as Record<string, unknown>)
    for (const key of Object.keys(file.mapping)) {
      expect(dimIds.has(key), `Mapping key "${key}" is not a known dimension id`).toBe(true)
    }
  })
})
