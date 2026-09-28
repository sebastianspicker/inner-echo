import { describe, expect, it } from 'vitest'
import { loadProfile } from '../../src/content/experience/loader'
import type { Profile } from '../../src/domain/experience/schema'
import mapping from '../../src/content/experience/dimension-to-signal-mapping.json'

// These are authoring constraints, not clinical validation of numerical settings.
// Every profile id below is a known bundled condition, so `loadProfile` never
// resolves null here; the non-null assertions only satisfy its general
// `Profile | null` return type.
describe('respectful collection defaults', () => {
  it('keeps ordering grids out of both OCD and compulsive-loop composition', async () => {
    const profile = (await loadProfile('ocd')) as Profile
    expect(profile.video_stack.map((entry) => entry.node)).not.toContain('grid_hint')
    expect(mapping.mapping.compulsive_loop.video_motifs.map((entry) => entry.node)).not.toContain(
      'grid_hint',
    )
  })

  it('does not start PTSD fragments or add heartbeat-like panic sound', async () => {
    const [ptsd, panic] = (await Promise.all([
      loadProfile('trauma_ptsd'),
      loadProfile('panic'),
    ])) as [Profile, Profile]
    expect(ptsd.video_stack.map((entry) => entry.node)).not.toContain('intrusion_burst')
    expect(panic.audio_stack?.chain?.map((entry) => entry.node)).not.toContain('pulse_tone')
    expect(panic.reactive?.analyser_to_params).toEqual([])
  })

  it('does not define ADHD by overload or add camera jitter by default', async () => {
    const profile = (await loadProfile('adhd')) as Profile
    expect(profile.experience_dimensions.map((dimension) => dimension.id)).not.toContain(
      'sensory_overload',
    )
    expect(profile.video_stack.map((entry) => entry.node)).not.toContain('focus_jitter')
  })
})
