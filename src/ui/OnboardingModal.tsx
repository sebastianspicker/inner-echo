/**
 * Phase 10: Onboarding modal — consent before camera.
 * Content: local-only, no diagnosis, Stop anytime, Safe Mode recommendation.
 * Blocks camera until user checks "verstanden" and confirms.
 * Accessibility: keyboard, ARIA, focus trap.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '../utils/logger'
import './OnboardingModal.css'

const STORAGE_KEY = 'inner-echo-onboarding-accepted'

export function getOnboardingAccepted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function setOnboardingAccepted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, 'true')
  } catch (err) {
    logger.warn('setOnboardingAccepted failed', err)
  }
}

export interface OnboardingModalProps {
  onAccept: () => void
}

export function OnboardingModal({ onAccept }: OnboardingModalProps) {
  const [understood, setUnderstood] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  const handleConfirm = useCallback(() => {
    if (!understood) return
    setOnboardingAccepted()
    onAccept()
  }, [understood, onAccept])

  // Focus trap: keep focus inside modal; initial focus on checkbox
  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    checkboxRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        // Do not close on Escape — user must accept to proceed
        return
      }
      if (e.key === 'Tab') {
        const focusable = wrapper.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    wrapper.addEventListener('keydown', handleKeyDown)
    return () => wrapper.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div
      ref={wrapperRef}
      className="onboarding-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-desc"
    >
      <div className="onboarding-modal">
        <h2 id="onboarding-title" className="onboarding-modal__title">
          Before you start
        </h2>
        <div id="onboarding-desc" className="onboarding-modal__content">
          <p>
            <strong>Local only.</strong> Your camera and microphone are used only in your browser.
            Nothing is recorded or sent to any server.
          </p>
          <p>
            <strong>Not a diagnosis.</strong> This app is an artistic, educational metaphor. It does
            not diagnose or treat any condition.
          </p>
          <p>
            <strong>Stop anytime.</strong> Use the &quot;Stop Everything&quot; button to stop the
            camera, audio, and all effects immediately.
          </p>
          <p>
            <strong>Safe Mode.</strong> We recommend turning on Safe Mode to keep effects
            comfortable. You can change it at any time.
          </p>
        </div>
        <label className="onboarding-modal__checkbox">
          <input
            ref={checkboxRef}
            type="checkbox"
            checked={understood}
            onChange={(e) => setUnderstood(e.target.checked)}
            aria-describedby="onboarding-checkbox-desc"
          />
          <span id="onboarding-checkbox-desc">I have read and understood the above.</span>
        </label>
        <div className="onboarding-modal__actions">
          <button
            ref={confirmRef}
            type="button"
            className="onboarding-modal__btn onboarding-modal__btn--primary"
            onClick={handleConfirm}
            disabled={!understood}
            aria-label="Accept and continue"
          >
            Accept and continue
          </button>
        </div>
      </div>
    </div>
  )
}
