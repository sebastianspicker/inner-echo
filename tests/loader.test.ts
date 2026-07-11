import { describe, expect, it, vi, beforeEach } from 'vitest'

/**
 * Tests for src/conditions/loader.ts
 *
 * The loader relies on Vite's import.meta.glob and dynamic import for catalog.json,
 * so we mock the module and test the exported functions via their validation paths.
 */

// Valid profile data matching profileSchema
const VALID_PROFILE = {
  id: 'test-profile',
  label: 'Test Profile',
  summary: 'A test profile for unit testing.',
  framing: { type: 'metaphor' },
  experience_dimensions: [],
  video_stack: [{ node: 'grain', params: { amount: 0.2 } }],
  safety: {
    intensity_default: 0.5,
    intensity_max: 1,
    warnings: [],
    safe_mode_clamps: {},
  },
}

// Valid catalog data matching catalogSchema
const VALID_CATALOG = {
  conditions: [{ id: 'test', label: 'Test Condition' }],
}

// We mock the loader module internals by mocking the entire module and re-implementing
// with controllable data. Instead, we test the schemas and validation logic directly,
// since the loader is a thin wrapper around schema validation + dynamic import.

import { catalogSchema, profileSchema } from '../src/conditions/schema'

describe('conditions/loader — schema validation (unit)', () => {
  describe('catalogSchema validation', () => {
    it('accepts a valid catalog', () => {
      const result = catalogSchema.safeParse(VALID_CATALOG)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.conditions).toHaveLength(1)
        expect(result.data.conditions[0].id).toBe('test')
      }
    })

    it('rejects a catalog missing required conditions array', () => {
      const result = catalogSchema.safeParse({ version: '1' })
      expect(result.success).toBe(false)
    })

    it('rejects a catalog with empty condition id', () => {
      const result = catalogSchema.safeParse({
        conditions: [{ id: '', label: 'No ID' }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe('profileSchema validation', () => {
    it('accepts a valid profile', () => {
      const result = profileSchema.safeParse(VALID_PROFILE)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.id).toBe('test-profile')
        expect(result.data.video_stack).toHaveLength(1)
      }
    })

    it('rejects profile missing id', () => {
      const { id: _id, ...noId } = VALID_PROFILE
      const result = profileSchema.safeParse(noId)
      expect(result.success).toBe(false)
    })

    it('rejects profile missing video_stack', () => {
      const { video_stack: _vs, ...noStack } = VALID_PROFILE
      const result = profileSchema.safeParse(noStack)
      expect(result.success).toBe(false)
    })

    it('rejects profile with empty id', () => {
      const result = profileSchema.safeParse({ ...VALID_PROFILE, id: '' })
      expect(result.success).toBe(false)
    })

    it('rejects profile missing safety block', () => {
      const { safety: _s, ...noSafety } = VALID_PROFILE
      const result = profileSchema.safeParse(noSafety)
      expect(result.success).toBe(false)
    })
  })
})

describe('conditions/loader — loadProfile and loadCatalog behavior', () => {
  /**
   * We test the loader functions by mocking the Vite-specific dynamic imports.
   * Since import.meta.glob is compile-time Vite magic, we mock the entire module.
   */
  let loadCatalog: typeof import('../src/conditions/loader').loadCatalog
  let loadProfile: typeof import('../src/conditions/loader').loadProfile

  beforeEach(async () => {
    vi.resetModules()
  })

  it('loadProfile with empty id returns null', async () => {
    // The loadProfile function guards against empty ids before hitting import.meta.glob.
    // We can test this by importing the real module (the empty-id path doesn't touch Vite globs).
    const mod = await import('../src/conditions/loader')
    loadProfile = mod.loadProfile

    const result = await loadProfile('')
    expect(result).toBeNull()
  })

  it('loadProfile with whitespace-only id returns null', async () => {
    const mod = await import('../src/conditions/loader')
    const result = await mod.loadProfile('   ')
    expect(result).toBeNull()
  })

  it('loadCatalog returns a catalog with conditions entries', async () => {
    const mod = await import('../src/conditions/loader')
    const catalog = await mod.loadCatalog()
    expect(catalog).not.toBeNull()
    expect(Array.isArray(catalog!.conditions)).toBe(true)
    expect(catalog!.conditions.length).toBe(8)
  })

  it('loadCatalog entries have required id and label fields', async () => {
    const mod = await import('../src/conditions/loader')
    const catalog = await mod.loadCatalog()
    expect(catalog).not.toBeNull()
    for (const entry of catalog!.conditions) {
      expect(typeof entry.id).toBe('string')
      expect(entry.id.length).toBeGreaterThan(0)
      expect(typeof entry.label).toBe('string')
      expect(entry.label.length).toBeGreaterThan(0)
    }
  })

  it('loadProfile("anxiety") returns valid profile with video_stack', async () => {
    const mod = await import('../src/conditions/loader')
    const profile = await mod.loadProfile('anxiety')
    expect(profile).not.toBeNull()
    expect(profile!.id).toBe('anxiety')
    expect(Array.isArray(profile!.video_stack)).toBe(true)
    expect(profile!.video_stack.length).toBeGreaterThan(0)
  })

  it('loadProfile("none") returns baseline profile', async () => {
    const mod = await import('../src/conditions/loader')
    const profile = await mod.loadProfile('none')
    expect(profile).not.toBeNull()
    expect(profile!.id).toBe('none')
  })

  it('loadProfile("nonexistent") returns null gracefully', async () => {
    const mod = await import('../src/conditions/loader')
    const profile = await mod.loadProfile('nonexistent_profile_xyz')
    expect(profile).toBeNull()
  })

  it.each([
    '../anxiety',
    'anxiety/../../catalog',
    '__proto__',
    'Anxiety',
  ])('loadProfile rejects invalid lookup id %s', async (id) => {
    const mod = await import('../src/conditions/loader')
    await expect(mod.loadProfile(id)).resolves.toBeNull()
  })

  it('loaded profile has expected shape (safety, experience_dimensions)', async () => {
    const mod = await import('../src/conditions/loader')
    const profile = await mod.loadProfile('anxiety')
    expect(profile).not.toBeNull()
    expect(profile!.safety).toBeDefined()
    expect(typeof profile!.safety.intensity_default).toBe('number')
    expect(typeof profile!.safety.intensity_max).toBe('number')
    expect(Array.isArray(profile!.safety.warnings)).toBe(true)
    expect(profile!.safety.safe_mode_clamps).toBeDefined()
    expect(Array.isArray(profile!.experience_dimensions)).toBe(true)
  })

  it('all catalog profiles can be loaded successfully', async () => {
    const mod = await import('../src/conditions/loader')
    const catalog = await mod.loadCatalog()
    expect(catalog).not.toBeNull()
    for (const entry of catalog!.conditions) {
      const profile = await mod.loadProfile(entry.id)
      expect(profile).not.toBeNull()
      expect(profile!.id).toBe(entry.id)
    }
  })
})
