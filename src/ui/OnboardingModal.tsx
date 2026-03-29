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

  // Prevent body scrolling while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

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
          'button:not([disabled]):not([aria-hidden="true"]), [href]:not([aria-hidden="true"]), input:not([disabled]):not([aria-hidden="true"]), select:not([aria-hidden="true"]), textarea:not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"]):not([aria-hidden="true"])',
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
        <div className="onboarding-modal__welcome" aria-hidden="true" />
        <h2 id="onboarding-title" className="onboarding-modal__title">
          Welcome to Inner Echo
        </h2>
        <p className="onboarding-modal__intro">
          This is a safe, private space. Take a moment to read through the following before you
          begin.
        </p>
        <div id="onboarding-desc" className="onboarding-modal__content">
          <p>
            <strong>Your privacy comes first.</strong> Your camera and microphone stay entirely in
            your browser. Nothing is ever recorded, stored, or sent anywhere.
          </p>
          <p>
            <strong>This is not a diagnosis.</strong> Inner Echo uses artistic metaphor to help you
            explore and reflect. It does not diagnose, treat, or replace professional care.
          </p>
          <p>
            <strong>You are always in control.</strong> You can pause or stop everything at any
            time. There is no pressure to continue.
          </p>
          <p>
            <strong>Comfort first.</strong> We suggest starting with Safe Mode on to keep the
            experience gentle. You can adjust this whenever you like.
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
          <span id="onboarding-checkbox-desc">I understand and feel ready to begin.</span>
        </label>
        <div className="onboarding-modal__actions">
          <button
            ref={confirmRef}
            type="button"
            className="onboarding-modal__btn onboarding-modal__btn--primary"
            onClick={handleConfirm}
            disabled={!understood}
            aria-label="Begin your experience"
          >
            Begin
          </button>
        </div>
      </div>
    </div>
  )
}
