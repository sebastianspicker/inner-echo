import { describe, expect, it } from 'vitest'
import {
  allMotifs,
  deriveConditionPageModel,
  usedByConditions,
} from '../../tools/docs/evidencePageModel'
import { dimPage } from '../../tools/docs/evidencePageFormatting'
import type { Profile } from '../../tools/docs/evidencePageParsing'

const profile: Profile = {
  id: 'example',
  label: 'Example',
  experience_dimensions: [{ id: 'attention', weight: 0.5 }],
  video_stack: [{ node: 'salience_competition' }],
  audio_stack: { enabled: true, chain: [{ node: 'lowpass' }] },
}
const dimension = {
  id: 'attention',
  label: 'Attention',
  description: 'Attention varies.',
  evidence_strength: 'high',
  motif_summary: { video_nodes: ['grain'], audio_nodes: [] },
}

describe('evidence traceability', () => {
  it('lists the actual preset effects independently of related dimension motifs', () => {
    const model = deriveConditionPageModel(profile, new Map([[dimension.id, dimension]]))
    expect(model.motifs.map((motif) => motif.id)).toEqual(['lowpass', 'salience_competition'])
    expect(usedByConditions('grain', [profile])).toEqual([])
    expect(usedByConditions('salience_competition', [profile])).toHaveLength(1)
    expect(allMotifs([dimension], [profile])).toEqual(
      expect.arrayContaining(['grain', 'lowpass', 'salience_competition']),
    )
  })

  it('does not list disabled audio as a preset effect', () => {
    const silent = { ...profile, audio_stack: { ...profile.audio_stack, enabled: false } }
    expect(usedByConditions('lowpass', [silent])).toEqual([])
  })

  it('does not promote phenomenon evidence to validation of an unreviewed audiovisual mapping', () => {
    const page = dimPage(dimension, new Map())
    expect(page).toContain('| Artistic | High |')
    expect(page).toContain('Experience evidence')
    expect(page).not.toContain('Likelihood label')
  })
})
