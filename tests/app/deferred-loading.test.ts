// @vitest-environment jsdom

import { act, createElement } from 'react'
import type { Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { disposeTestRoot, enableReactActEnvironment, renderTestRoot } from './reactDomHarness'

const workspaceModule = vi.hoisted(() => ({ evaluations: 0, renders: 0 }))

vi.mock('../../src/app/experience/ExperienceWorkspace', () => {
  workspaceModule.evaluations += 1
  return {
    ExperienceWorkspace() {
      workspaceModule.renders += 1
      return createElement('main', null, 'Workspace ready')
    },
  }
})

import App from '../../src/app/App'
import {
  LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY,
  WELCOME_ACKNOWLEDGEMENT_KEY,
  getWelcomeAcknowledged,
  setWelcomeAcknowledged,
} from '../../src/app/welcome/WelcomeStep'

let root: Root | null = null

enableReactActEnvironment()

async function renderApp() {
  workspaceModule.evaluations = 0
  workspaceModule.renders = 0
  const rendered = await renderTestRoot(createElement(App))
  root = rendered.root
  return rendered.container
}

afterEach(async () => {
  await disposeTestRoot(root)
  root = null
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe('welcome acknowledgement loading boundary', () => {
  it('opens sanitized local evidence before loading the workspace', async () => {
    const container = await renderApp()

    const evidenceButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Read the evidence notes'),
    )
    await act(async () => {
      evidenceButton?.click()
      await import('../../src/app/experience/evidence/EvidenceDrawer')
    })

    expect(container.textContent).toContain('Method & Evidence')
    expect(container.textContent).toContain('Sanitized Markdown / Local document')
    expect(workspaceModule.evaluations).toBe(0)
    expect(workspaceModule.renders).toBe(0)
  })

  it('does not evaluate or mount the workspace until Continue is selected', async () => {
    const container = await renderApp()

    expect(container.textContent).toContain('Continue to setup')
    expect(workspaceModule.evaluations).toBe(0)
    expect(workspaceModule.renders).toBe(0)

    const continueButton = Array.from(container.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Continue to setup'),
    )
    await act(async () => continueButton?.click())

    expect(localStorage.getItem(WELCOME_ACKNOWLEDGEMENT_KEY)).toBe('true')
    expect(container.textContent).toContain('Workspace ready')
    expect(workspaceModule.evaluations).toBe(1)
    expect(workspaceModule.renders).toBe(1)
  })

  it('preserves the acknowledgement and legacy-key cleanup contract', () => {
    localStorage.setItem(LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY, 'true')
    expect(getWelcomeAcknowledged()).toBe(false)

    setWelcomeAcknowledged()

    expect(getWelcomeAcknowledged()).toBe(true)
    expect(localStorage.getItem(LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY)).toBeNull()
  })

  it('keeps the welcome available when storage cannot be read or written', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(() => {
        throw new Error('storage unavailable')
      }),
      setItem: vi.fn(() => {
        throw new Error('storage unavailable')
      }),
      removeItem: vi.fn(),
    })

    expect(getWelcomeAcknowledged()).toBe(false)
    expect(() => setWelcomeAcknowledged()).not.toThrow()
    warn.mockRestore()
  })
})
