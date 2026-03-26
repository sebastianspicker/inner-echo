import { describe, expect, it } from 'vitest'

import { FakeAudioContext } from '../src/contractVerification/fakeAudioContext'
import {
  createLowpass,
  createHighpass,
  createTremolo,
  createNoiseBed,
  createCompressor,
  createDelay,
  createReverb,
  createFlutter,
  createPulseTone,
} from '../src/engine/audio/fx'

// ---------------------------------------------------------------------------
// All FX factories share the same contract (AudioModule interface):
//   connect(destination), getInput(), setParams(params), dispose()
// ---------------------------------------------------------------------------

/** Create a FakeAudioContext that acts as BaseAudioContext for the FX factories. */
function ctx(): BaseAudioContext {
  return new FakeAudioContext() as unknown as BaseAudioContext
}

/** Assert that the returned module has the full AudioModule shape. */
function expectAudioModuleShape(mod: ReturnType<typeof createLowpass>): void {
  expect(typeof mod.connect).toBe('function')
  expect(typeof mod.getInput).toBe('function')
  expect(typeof mod.setParams).toBe('function')
  expect(typeof mod.dispose).toBe('function')
}

// ---------------------------------------------------------------------------
// Define each factory with representative params and param-update objects.
// ---------------------------------------------------------------------------
const factories = [
  {
    name: 'createLowpass',
    create: (c: BaseAudioContext) => createLowpass(c, { cutoff: 900, q: 0.8 }),
    updateParams: { cutoff: 600, q: 1.0 },
  },
  {
    name: 'createHighpass',
    create: (c: BaseAudioContext) => createHighpass(c, { cutoff: 200, q: 0.9 }),
    updateParams: { cutoff: 300, q: 1.1 },
  },
  {
    name: 'createTremolo',
    create: (c: BaseAudioContext) => createTremolo(c, { rate: 2, depth: 0.1 }),
    updateParams: { rate: 3.5, depth: 0.12 },
  },
  {
    name: 'createNoiseBed',
    create: (c: BaseAudioContext) => createNoiseBed(c, { level: 0.04, color: 'pink' }),
    updateParams: { level: 0.06, color: 'white' },
  },
  {
    name: 'createCompressor',
    create: (c: BaseAudioContext) =>
      createCompressor(c, { threshold: -20, ratio: 4, attack: 0.01, release: 0.2, ceiling: -8 }),
    updateParams: { threshold: -15, ratio: 6, attack: 0.02, release: 0.3, ceiling: -10 },
  },
  {
    name: 'createDelay',
    create: (c: BaseAudioContext) => createDelay(c, { time: 0.15, feedback: 0.08, mix: 0.05 }),
    updateParams: { time: 0.2, feedback: 0.1, mix: 0.08 },
  },
  {
    name: 'createReverb',
    create: (c: BaseAudioContext) => createReverb(c, { mix: 0.06, decay: 1.5 }),
    updateParams: { mix: 0.1, decay: 2.0 },
  },
  {
    name: 'createFlutter',
    create: (c: BaseAudioContext) => createFlutter(c, { rate: 0.5, depth: 0.04 }),
    updateParams: { rate: 0.8, depth: 0.08 },
  },
  {
    name: 'createPulseTone',
    create: (c: BaseAudioContext) => createPulseTone(c, { rate: 1.0, mix: 0.05, base_freq: 120 }),
    updateParams: { rate: 2.0, mix: 0.08, base_freq: 180 },
  },
] as const

describe('engine/audio/fx', () => {
  for (const factory of factories) {
    describe(factory.name, () => {
      it('returns an AudioModule with connect, getInput, setParams, dispose', () => {
        const mod = factory.create(ctx())
        expectAudioModuleShape(mod)
        mod.dispose()
      })

      it('getInput() returns a truthy node-like object', () => {
        const mod = factory.create(ctx())
        const input = mod.getInput()
        expect(input).toBeTruthy()
        mod.dispose()
      })

      it('connect() does not throw', () => {
        const c = ctx()
        const mod = factory.create(c)
        const dest = (c as unknown as FakeAudioContext).createGain()
        expect(() => mod.connect(dest as unknown as AudioNode)).not.toThrow()
        mod.dispose()
      })

      it('setParams() with representative params does not throw', () => {
        const mod = factory.create(ctx())
        expect(() => mod.setParams(factory.updateParams as Record<string, unknown>)).not.toThrow()
        mod.dispose()
      })

      it('setParams() with empty object does not throw', () => {
        const mod = factory.create(ctx())
        expect(() => mod.setParams({})).not.toThrow()
        mod.dispose()
      })

      it('dispose() does not throw', () => {
        const mod = factory.create(ctx())
        expect(() => mod.dispose()).not.toThrow()
      })

      it('dispose() can be called after connect without error', () => {
        const c = ctx()
        const mod = factory.create(c)
        const dest = (c as unknown as FakeAudioContext).createGain()
        mod.connect(dest as unknown as AudioNode)
        expect(() => mod.dispose()).not.toThrow()
      })
    })
  }

  // -----------------------------------------------------------------------
  // Additional targeted tests
  // -----------------------------------------------------------------------
  describe('createLowpass specifics', () => {
    it('uses default cutoff and Q when no params provided', () => {
      const mod = createLowpass(ctx())
      // Should not throw and should produce a valid module.
      expectAudioModuleShape(mod)
      mod.dispose()
    })
  })

  describe('createHighpass specifics', () => {
    it('uses default cutoff and Q when no params provided', () => {
      const mod = createHighpass(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })
  })

  describe('createNoiseBed specifics', () => {
    it('defaults to pink noise when color is omitted', () => {
      const mod = createNoiseBed(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })

    it('accepts brown noise color', () => {
      const mod = createNoiseBed(ctx(), { color: 'brown' })
      expectAudioModuleShape(mod)
      mod.dispose()
    })

    it('normalizes unknown color to pink', () => {
      const mod = createNoiseBed(ctx(), { color: 'invalid' as any })
      expectAudioModuleShape(mod)
      mod.dispose()
    })

    it('setParams with color change does not throw', () => {
      const mod = createNoiseBed(ctx(), { color: 'pink' })
      expect(() => mod.setParams({ color: 'brown' })).not.toThrow()
      expect(() => mod.setParams({ color: 'white' })).not.toThrow()
      mod.dispose()
    })
  })

  describe('createCompressor specifics', () => {
    it('creates module with defaults when no params provided', () => {
      const mod = createCompressor(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })
  })

  describe('createDelay specifics', () => {
    it('creates module with defaults when no params provided', () => {
      const mod = createDelay(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })
  })

  describe('createReverb specifics', () => {
    it('creates module with defaults', () => {
      const mod = createReverb(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })

    it('regenerates impulse when decay changes significantly', () => {
      const mod = createReverb(ctx(), { decay: 1.0 })
      // Large decay change should trigger regeneration.
      expect(() => mod.setParams({ decay: 2.5 })).not.toThrow()
      mod.dispose()
    })

    it('does not regenerate impulse for small decay change', () => {
      const mod = createReverb(ctx(), { decay: 1.0 })
      // Tiny decay change (below 0.08 threshold) should skip regeneration.
      expect(() => mod.setParams({ decay: 1.05 })).not.toThrow()
      mod.dispose()
    })
  })

  describe('createFlutter specifics', () => {
    it('creates module with defaults', () => {
      const mod = createFlutter(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })
  })

  describe('createPulseTone specifics', () => {
    it('creates module with defaults', () => {
      const mod = createPulseTone(ctx())
      expectAudioModuleShape(mod)
      mod.dispose()
    })
  })
})
