import { describe, expect, it } from 'vitest'
import { loadProfile } from '../../src/content/experience/loader'
import mapping from '../../src/content/experience/dimension-to-signal-mapping.json'

// These are authoring constraints, not clinical validation of numerical settings.
describe('respectful collection defaults', () => {
  it('keeps ordering grids out of both OCD and compulsive-loop composition', async () => {
    const profile = await loadProfile('ocd')
    expect(profile.video_stack.map((entry) => entry.node)).not.toContain('grid_hint')
    expect(mapping.mapping.compulsive_loop.video_motifs.map((entry) => entry.node)).not.toContain(
      'grid_hint',
    )
  })

  it('does not start PTSD fragments or add heartbeat-like panic sound', async () => {
    const [ptsd, panic] = await Promise.all([loadProfile('trauma_ptsd'), loadProfile('panic')])
    expect(ptsd.video_stack.map((entry) => entry.node)).not.toContain('intrusion_burst')
    expect(panic.audio_stack?.chain?.map((entry) => entry.node)).not.toContain('pulse_tone')
    expect(panic.reactive?.analyser_to_params).toEqual([])
  })

  it('does not define ADHD by overload or add camera jitter by default', async () => {
    const profile = await loadProfile('adhd')
    expect(profile.experience_dimensions.map((dimension) => dimension.id)).not.toContain(
      'sensory_overload',
    )
    expect(profile.video_stack.map((entry) => entry.node)).not.toContain('focus_jitter')
  })
})
