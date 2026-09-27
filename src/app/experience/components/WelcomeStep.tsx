import { logger } from '../../../platform/logger'
import type { EvidenceDocPath } from '../../../content/evidence'
import brandMarkUrl from '../../../../assets/brand/inner-echo-mark.svg'
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
      <div className="welcome-step__lead">
        <div className="welcome-step__brand">
          <img className="welcome-step__mark" src={brandMarkUrl} alt="" aria-hidden="true" />
          <span>Inner Echo</span>
        </div>
        <div className="welcome-step__intro">
          <h1 id="welcome-title">
            <span>Notice</span> <span>what shifts.</span>
          </h1>
          <p>
            Audiovisual metaphors for attention, sensation, and perception, rendered on your own
            camera feed, in this browser. A way to talk about inner experience. Not a diagnosis or a
            measurement.
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

        <section className="welcome-step__facts" aria-label="Before you continue">
          <section>
            <div>
              <h2>Media stays here</h2>
              <p>
                Camera and microphone are processed in this browser only. Nothing is recorded,
                uploaded, or sent anywhere.
              </p>
            </div>
          </section>
          <section>
            <div>
              <h2>You stay in control</h2>
              <p>
                Camera, sound, and microphone each start only when you ask. Comfort controls remain
                available, and Stop Everything releases active media.
              </p>
            </div>
          </section>
          <section>
            <div>
              <h2>Experiences, not reproductions</h2>
              <p>
                Sources describe experiences. Visual and sound choices are artistic interpretations,
                not validated reproductions.{' '}
                <button
                  type="button"
                  className="ie-inlineAction"
                  onClick={() => onOpenEvidence('docs/references/README.md')}
                  aria-label="Open Method and Evidence"
                >
                  Read the evidence notes
                </button>
              </p>
            </div>
          </section>
        </section>
      </div>
    </section>
  )
}
