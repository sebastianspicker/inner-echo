// @vitest-environment jsdom

import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

import { pageRecovery } from '../../src/app/ErrorBoundary'
import {
  AudioMicControls,
  type AudioMicControlsProps,
} from '../../src/app/experience/components/AudioMicControls'

let root: Root | null = null

enableReactActEnvironment()

afterEach(async () => {
  await disposeTestRoot(root)
  root = null
})

describe('audio import error recovery control', () => {
  it('renders a retry action that invokes the direct audio activation handler', async () => {
    const reloadPage = vi.spyOn(pageRecovery, 'reload').mockImplementation(() => undefined)
    const onEnableAudio = vi.fn()
    const props = {
      audioStatus: 'error',
      audioEnabled: false,
      audioError: 'chunk unavailable',
      masterVolume: 0.22,
      micStatus: 'off',
      micError: null,
      micSensitivity: 0.5,
      micGate: 0.25,
      inputMode: 'synth',
      onEnableAudio,
      onDisableAudio: vi.fn(),
      onEnableMic: vi.fn(),
      onDisableMic: vi.fn(),
      onMasterVolumeChange: vi.fn(),
      onMicSensitivityChange: vi.fn(),
      onMicGateChange: vi.fn(),
      onInputModeChange: vi.fn(),
      defaultOpen: true,
    } satisfies AudioMicControlsProps
    const rendered = await renderTestRoot(createElement(AudioMicControls, props))
    root = rendered.root

    const retry = rendered.container.querySelector<HTMLButtonElement>(
      'button[aria-label="Retry audio"]',
    )
    expect(retry?.textContent).toBe('Retry audio')
    act(() => retry?.click())
    expect(onEnableAudio).toHaveBeenCalledOnce()
    const reload = Array.from(rendered.container.querySelectorAll('button')).find(
      (button) => button.textContent === 'Reload page',
    )
    expect(reload).toBeDefined()
    act(() => reload?.click())
    expect(reloadPage).toHaveBeenCalledOnce()
    reloadPage.mockRestore()
  })
})
