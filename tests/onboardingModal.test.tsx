// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

const STORAGE_KEY = 'inner-echo-onboarding-accepted'

// Node 25+ has a built-in localStorage that may lack standard methods.
// Create a spec-compliant mock to use in these tests.
const storageMap = new Map<string, string>()
const storageMock: Storage = {
  get length() { return storageMap.size },
  clear: () => storageMap.clear(),
  getItem: (key: string) => storageMap.get(key) ?? null,
  key: (index: number) => [...storageMap.keys()][index] ?? null,
  removeItem: (key: string) => storageMap.delete(key),
  setItem: (key: string, value: string) => storageMap.set(key, value),
}

beforeEach(() => {
  storageMap.clear()
  vi.stubGlobal('localStorage', storageMock)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

// Import AFTER we set up the stubs, but since ES modules are hoisted,
// we use dynamic import inside tests or rely on the stub being set before each test runs.
// Since the OnboardingModal reads localStorage lazily (on function call, not at import time),
// the static import works fine.
import {
  OnboardingModal,
  getOnboardingAccepted,
  setOnboardingAccepted,
} from '../src/ui/OnboardingModal'

describe('ui/OnboardingModal', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------
  it('renders the modal with title, content, checkbox, and button', () => {
    render(<OnboardingModal onAccept={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Welcome to Inner Echo')).toBeInTheDocument()
    expect(screen.getByText(/your privacy comes first/i)).toBeInTheDocument()
    expect(screen.getByText(/this is not a diagnosis/i)).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /begin/i })).toBeInTheDocument()
  })

  it('has correct ARIA attributes', () => {
    render(<OnboardingModal onAccept={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'onboarding-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'onboarding-desc')
  })

  // ---------------------------------------------------------------------------
  // Interaction — accept flow
  // ---------------------------------------------------------------------------
  it('button is disabled until checkbox is checked', () => {
    render(<OnboardingModal onAccept={vi.fn()} />)
    const button = screen.getByRole('button', { name: /begin/i })
    expect(button).toBeDisabled()
  })

  it('button becomes enabled after checking the checkbox', () => {
    render(<OnboardingModal onAccept={vi.fn()} />)
    const checkbox = screen.getByRole('checkbox')
    const button = screen.getByRole('button', { name: /begin/i })

    fireEvent.click(checkbox)
    expect(button).toBeEnabled()
  })

  it('calls onAccept when checkbox is checked and button is clicked', () => {
    const onAccept = vi.fn()
    render(<OnboardingModal onAccept={onAccept} />)

    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /begin/i }))
    expect(onAccept).toHaveBeenCalledOnce()
  })

  it('does not call onAccept when button is clicked without checking checkbox', () => {
    const onAccept = vi.fn()
    render(<OnboardingModal onAccept={onAccept} />)

    const button = screen.getByRole('button', { name: /begin/i })
    fireEvent.click(button)
    expect(onAccept).not.toHaveBeenCalled()
  })

  it('persists acceptance to localStorage on confirm', () => {
    render(<OnboardingModal onAccept={vi.fn()} />)
    fireEvent.click(screen.getByRole('checkbox'))
    fireEvent.click(screen.getByRole('button', { name: /begin/i }))

    expect(storageMap.get(STORAGE_KEY)).toBe('true')
  })

  // ---------------------------------------------------------------------------
  // Helper functions
  // ---------------------------------------------------------------------------
  it('getOnboardingAccepted returns false when not set', () => {
    expect(getOnboardingAccepted()).toBe(false)
  })

  it('getOnboardingAccepted returns true after setOnboardingAccepted', () => {
    setOnboardingAccepted()
    expect(getOnboardingAccepted()).toBe(true)
  })

  it('getOnboardingAccepted returns false for non-"true" values', () => {
    storageMap.set(STORAGE_KEY, 'yes')
    expect(getOnboardingAccepted()).toBe(false)
  })
})
