// @vitest-environment jsdom

import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import {
  createPresetSnapshot,
  migrateLegacyPresetPayload,
} from '../../src/app/experience/presets/format'
import { PRESET_LIBRARY_STORAGE_KEY } from '../../src/app/experience/presets/storage'
import { usePresetLibrary } from '../../src/app/experience/presets/usePresetLibrary'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

let root: Root | null = null
enableReactActEnvironment()

afterEach(async () => {
  await disposeTestRoot(root)
  root = null
  localStorage.clear()
  vi.restoreAllMocks()
})

it.each([
  false,
  true,
])('settles after loading a saved library (%s) and preserves edits', async (saved) => {
  const payload = migrateLegacyPresetPayload({ conditionId: 'none' })
  if (!payload) throw new Error('Expected a valid default preset payload')
  const currentPayload = payload
  const snapshots = saved
    ? [createPresetSnapshot(payload, { name: 'Saved setup', createdAt: '2026-09-09T00:00:00Z' })]
    : []
  if (saved) localStorage.setItem(PRESET_LIBRARY_STORAGE_KEY, JSON.stringify(snapshots))
  const getItem = vi.spyOn(Storage.prototype, 'getItem')
  const onApply = vi.fn()
  let library: ReturnType<typeof usePresetLibrary> | undefined
  let renders = 0
  function Probe() {
    if (++renders > 15) throw new Error('Preset library did not settle')
    library = usePresetLibrary({ currentPayload, onApply })
    return createElement('output', null, library.presetName)
  }

  const rendered = await renderTestRoot(createElement(Probe))
  root = rendered.root
  expect(library?.library).toEqual(snapshots)
  await act(async () => library?.onNameChange('An unsaved edit'))
  await act(async () => root?.render(createElement(Probe)))

  expect(rendered.container.textContent).toBe('An unsaved edit')
  expect(getItem.mock.calls.filter(([key]) => key === PRESET_LIBRARY_STORAGE_KEY)).toHaveLength(1)
  expect(onApply).not.toHaveBeenCalled()
})
