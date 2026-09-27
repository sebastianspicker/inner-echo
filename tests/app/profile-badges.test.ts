// @vitest-environment jsdom

import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

const loadProfile = vi.hoisted(() => vi.fn())

vi.mock('../../src/content/experience/loader', () => ({ loadProfile }))

import {
  loadProfileBadgeStrengths,
  selectProfileBadgeIds,
  useProfileBadgeStrengths,
} from '../../src/app/experience/hooks/useProfileBadgeStrengths'
import type { ExperienceDimensionDef } from '../../src/domain/experience/composition/types'

const catalog = [
  { id: 'alpha', label: 'Alpha' },
  { id: 'beta', label: 'Beta' },
]

const dimensions = new Map<string, ExperienceDimensionDef>([
  ['high-dimension', { id: 'high-dimension', label: 'High', evidence_strength: 'high' }],
  ['low-dimension', { id: 'low-dimension', label: 'Low', evidence_strength: 'low' }],
])

let root: Root | null = null

enableReactActEnvironment()

afterEach(async () => {
  await disposeTestRoot(root)
  root = null
  loadProfile.mockReset()
})

describe('profile badge loading scope', () => {
  it('loads no profiles in dimension mode and only the selection in curated mode', () => {
    expect(selectProfileBadgeIds('symptom', 'alpha', catalog)).toEqual([])
    expect(selectProfileBadgeIds('preset', 'alpha', catalog)).toEqual(['alpha'])
  })

  it('loads the visible catalog profiles in combined mode without a general cache', async () => {
    expect(selectProfileBadgeIds('multimorbid', 'alpha', catalog)).toEqual(['alpha', 'beta'])
    loadProfile
      .mockResolvedValueOnce({ experience_dimensions: [{ id: 'high-dimension' }] })
      .mockResolvedValueOnce({ experience_dimensions: [{ id: 'low-dimension' }] })

    await expect(loadProfileBadgeStrengths(['alpha', 'beta'], dimensions)).resolves.toEqual({
      alpha: 'high',
      beta: 'low',
    })
    expect(loadProfile).toHaveBeenCalledTimes(2)
  })

  it('discards a stale curated-profile result after the selection changes', async () => {
    let resolveAlpha!: (profile: { experience_dimensions: { id: string }[] }) => void
    let resolveBeta!: (profile: { experience_dimensions: { id: string }[] }) => void
    loadProfile.mockImplementation(
      (id: string) =>
        new Promise((resolve) => {
          if (id === 'alpha') resolveAlpha = resolve
          else resolveBeta = resolve
        }),
    )
    const BadgeProbe = ({ conditionId }: { conditionId: string }) =>
      createElement(
        'span',
        null,
        JSON.stringify(useProfileBadgeStrengths('preset', conditionId, catalog, dimensions)),
      )

    const rendered = await renderTestRoot(createElement(BadgeProbe, { conditionId: 'alpha' }))
    const { container } = rendered
    root = rendered.root
    await act(async () => root?.render(createElement(BadgeProbe, { conditionId: 'beta' })))
    await act(async () => resolveBeta({ experience_dimensions: [{ id: 'low-dimension' }] }))
    expect(container.textContent).toBe('{"beta":"low"}')

    await act(async () => resolveAlpha({ experience_dimensions: [{ id: 'high-dimension' }] }))
    expect(container.textContent).toBe('{"beta":"low"}')
  })
})
