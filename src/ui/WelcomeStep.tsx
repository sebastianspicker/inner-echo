import { logger } from '../utils/logger'
import type { EvidenceDocPath } from '../evidence/docs'
import brandMarkUrl from '../../assets/brand/inner-echo-mark.svg'
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

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const handleContinue = (): void => {
    setWelcomeAcknowledged()
    onContinue()
  }

  return (
    <section className="welcome-step" aria-labelledby="welcome-title">
      <div className="welcome-step__lead">
        <div className="welcome-step__brand" aria-label="Inner Echo">
          <img className="welcome-step__mark" src={brandMarkUrl} alt="" aria-hidden="true" />
          <span>Inner Echo</span>
        </div>
        <div className="welcome-step__intro">
          <p className="welcome-step__context">Reflective media lab</p>
          <h1 id="welcome-title">Notice what shifts.</h1>
          <p>
            Explore audiovisual metaphors for attention, sensation, and perception. Not a diagnosis
            or clinical simulation.
          </p>
        </div>

        <div className="welcome-step__actions">
          <button type="button" className="ie-btn ie-btn--accent" onClick={handleContinue}>
            Continue to setup
          </button>
        </div>
        <p className="welcome-step__note">
          Continuing does not request camera, microphone, or audio access.
        </p>
      </div>

      <div className="welcome-step__facts" aria-label="Before you continue">
        <div className="welcome-step__factsLabel">Private by design</div>
        <section>
          <span className="welcome-step__factIcon" aria-hidden="true">
            □
          </span>
          <div>
            <h2>Media stays here</h2>
            <p>
              Camera and microphone are processed in this browser and are not recorded or uploaded.
              Saved setups remain in this browser's local storage.
            </p>
          </div>
        </section>
        <section>
          <span className="welcome-step__factIcon" aria-hidden="true">
            ◇
          </span>
          <div>
            <h2>Permission stays separate</h2>
            <p>Setup never starts camera, sound, or microphone. Each requires a separate action.</p>
          </div>
        </section>
        <section>
          <span className="welcome-step__factIcon" aria-hidden="true">
            ○
          </span>
          <div>
            <h2>Comfort stays close</h2>
            <p>
              Safe Mode starts on. Stop Everything remains one action away whenever media is active.
            </p>
          </div>
        </section>
      </div>

      <div className="welcome-step__localRail" aria-hidden="true">
        <span />
        Local / Client only
      </div>
    </section>
  )
}
