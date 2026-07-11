import { logger } from '../utils/logger'
import type { EvidenceDocPath } from '../evidence/docs'
import './WelcomeStep.css'

export const WELCOME_ACKNOWLEDGEMENT_KEY = 'inner-echo-welcome-acknowledged-v2'
export const LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY = 'inner-echo-onboarding-accepted'

export function getWelcomeAcknowledged(): boolean {
  try {
    return localStorage.getItem(WELCOME_ACKNOWLEDGEMENT_KEY) === 'true'
  } catch {
    return false
  }
}

export function setWelcomeAcknowledged(): void {
  try {
    localStorage.setItem(WELCOME_ACKNOWLEDGEMENT_KEY, 'true')
    localStorage.removeItem(LEGACY_WELCOME_ACKNOWLEDGEMENT_KEY)
  } catch (err) {
    logger.warn('setWelcomeAcknowledged failed', err)
  }
}

export interface WelcomeStepProps {
  onContinue: () => void
  onOpenEvidence: (docPath: EvidenceDocPath) => void
}

export function WelcomeStep({ onContinue, onOpenEvidence }: WelcomeStepProps) {
  const handleContinue = (): void => {
    setWelcomeAcknowledged()
    onContinue()
  }

  return (
    <section className="welcome-step" aria-labelledby="welcome-title">
      <div className="welcome-step__intro">
        <p className="welcome-step__context">Reflective media lab</p>
        <h1 id="welcome-title">Explore experience through audiovisual metaphor.</h1>
        <p>
          Inner Echo is a browser-based artwork for discussing patterns of attention, sensation, and
          perception. It is not a diagnosis, simulation, treatment, or substitute for care.
        </p>
      </div>

      <div className="welcome-step__facts" aria-label="Before you continue">
        <section>
          <h2>Your media stays on this device</h2>
          <p>
            Camera and microphone input are processed in your browser. Inner Echo does not record or
            upload them. Camera, sound, and microphone each require a separate action.
          </p>
        </section>
        <section>
          <h2>Some settings can remain locally</h2>
          <p>
            This welcome acknowledgement and presets you explicitly save use this browser's local
            storage. A shared link contains configuration in its URL; it never starts media.
          </p>
        </section>
        <section>
          <h2>Comfort controls stay available</h2>
          <p>
            Safe Mode starts on. Reduced Motion follows your system preference. Stop Everything
            remains one action away whenever media is starting or active.
          </p>
        </section>
      </div>

      <div className="welcome-step__actions">
        <button type="button" className="ie-btn ie-btn--accent" onClick={handleContinue}>
          Continue to setup
        </button>
        <button
          type="button"
          className="ie-btn"
          onClick={() => onOpenEvidence('docs/references/README.md')}
        >
          Method &amp; Evidence
        </button>
      </div>
      <p className="welcome-step__note">Continuing does not request camera or audio access.</p>
    </section>
  )
}
