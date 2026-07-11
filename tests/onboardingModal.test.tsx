// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const STORAGE_KEY = 'inner-echo-welcome-acknowledged-v2'
const LEGACY_KEY = 'inner-echo-onboarding-accepted'

// Node 25+ has a built-in localStorage that may lack standard methods.
// Create a spec-compliant mock to use in these tests.
const storageMap = new Map<string, string>()
const storageMock: Storage = {
  get length() {
    return storageMap.size
  },
  clear: () => storageMap.clear(),
  getItem: (key: string) => storageMap.get(key) ?? null,
  key: (index: number) => [...storageMap.keys()][index] ?? null,
  removeItem: (key: string) => storageMap.delete(key),
  setItem: (key: string, value: string) => storageMap.set(key, value),
}

beforeEach(() => {
  vi.restoreAllMocks()
  storageMap.clear()
  vi.stubGlobal('localStorage', storageMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

import { WelcomeStep, getWelcomeAcknowledged, setWelcomeAcknowledged } from '../src/ui/WelcomeStep'

describe('ui/WelcomeStep', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  it('renders an in-flow welcome with accurate privacy and storage disclosure', () => {
    render(<WelcomeStep onContinue={vi.fn()} onOpenEvidence={vi.fn()} />)
    expect(screen.getByRole('heading', { name: /explore experience/i })).toBeInTheDocument()
    expect(screen.getByText(/does not record or upload/i)).toBeInTheDocument()
    expect(screen.getByText(/local storage/i)).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  // ---------------------------------------------------------------------------
  // Interaction — accept flow
  // ---------------------------------------------------------------------------
  it('continues without a readiness checkbox or media action', () => {
    const onContinue = vi.fn()
    render(<WelcomeStep onContinue={onContinue} onOpenEvidence={vi.fn()} />)
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /continue to setup/i }))
    expect(onContinue).toHaveBeenCalledOnce()
  })

  it('persists acceptance to localStorage on confirm', () => {
    render(<WelcomeStep onContinue={vi.fn()} onOpenEvidence={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /continue to setup/i }))

    expect(storageMap.get(STORAGE_KEY)).toBe('true')
  })

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------
  it('getWelcomeAcknowledged returns false when not set', () => {
    expect(getWelcomeAcknowledged()).toBe(false)
  })

  it('getWelcomeAcknowledged returns true after setWelcomeAcknowledged', () => {
    setWelcomeAcknowledged()
    expect(getWelcomeAcknowledged()).toBe(true)
  })

  it('getOnboardingAccepted returns false for non-"true" values', () => {
    storageMap.set(STORAGE_KEY, 'yes')
    expect(getWelcomeAcknowledged()).toBe(false)
  })

  it('getOnboardingAccepted returns false gracefully when localStorage throws', () => {
    vi.spyOn(storageMock, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(getWelcomeAcknowledged()).toBe(false)
  })

  it('setWelcomeAcknowledged does not throw when localStorage throws', () => {
    vi.spyOn(storageMock, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    expect(() => setWelcomeAcknowledged()).not.toThrow()
  })

  it('v2 acknowledgement removes only the legacy acknowledgement', () => {
    storageMap.set(LEGACY_KEY, 'true')
    storageMap.set('inner-echo-presets-v2', 'keep')
    setWelcomeAcknowledged()
    expect(storageMap.has(LEGACY_KEY)).toBe(false)
    expect(storageMap.get('inner-echo-presets-v2')).toBe('keep')
  })
})
