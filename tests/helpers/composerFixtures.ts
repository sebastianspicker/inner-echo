import type { ComposerSettings } from '../../src/composer/types'

export function createComposerSettings(
  overrides: Partial<ComposerSettings> = {},
): ComposerSettings {
  return {
    intensity: 0.5,
    safeMode: false,
    reducedMotion: false,
    audioEnabled: false,
    micEnabled: false,
    couplingStrength: 0,
    maxFeedback: 1,
    interactionAmount: 0,
    debugOverlay: false,
    ...overrides,
  }
}
