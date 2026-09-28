import { logger } from '../../platform/logger'
import type { EvidenceDocPath } from '../../content/evidence'
import brandMarkUrl from '../../../assets/brand/inner-echo-mark.svg'
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
    <section className="welcome-step ie-titlePage" aria-labelledby="welcome-title">
      <header className="ie-titlePage__head">
        <div className="ie-titlePage__brand">
          <img src={brandMarkUrl} alt="" aria-hidden="true" />
          <span>Inner Echo</span>
        </div>
        <p className="ie-titlePage__running">A camera mirror for talking about inner experience</p>
      </header>

      <div className="ie-titlePage__body">
        <div>
          <h1 id="welcome-title" className="ie-titlePage__title">
            <span>Notice</span> <em>what shifts.</em>
          </h1>
          <p className="ie-titlePage__lede">
            Inner Echo lays a gentle audiovisual metaphor over your own camera feed, in this
            browser, so that something hard to describe has something to point at. It is a way to
            talk about inner experience, not a diagnosis or a measurement.
          </p>
          <div className="ie-titlePage__actions">
            <button type="button" className="ie-btn ie-btn--accent" onClick={handleContinue}>
              Continue to setup
            </button>
            <p className="ie-titlePage__note">
              Continuing does not request camera, microphone, or audio access.
            </p>
          </div>
        </div>

        <section aria-label="Before you continue">
          <ol className="ie-notes">
            <li>
              <h2>Media stays here</h2>
              <p>
                Camera and microphone are processed in this browser only. Nothing is recorded,
                uploaded, or sent anywhere.
              </p>
            </li>
            <li>
              <h2>You stay in control</h2>
              <p>
                Camera, sound, and microphone each start only when you ask. Comfort controls stay
                within reach, and Stop Everything releases all active media at once.
              </p>
            </li>
            <li>
              <h2>Interpretations, not reproductions</h2>
              <p>
                Sources describe experiences; the images and sounds are artistic interpretations of
                them, not validated reproductions.{' '}
                <button
                  type="button"
                  className="ie-inlineAction"
                  onClick={() => onOpenEvidence('docs/references/README.md')}
                  aria-label="Open Method and Evidence"
                >
                  Read the evidence notes
                </button>
              </p>
            </li>
          </ol>
        </section>
      </div>
    </section>
  )
}
