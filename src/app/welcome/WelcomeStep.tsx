import { logger } from '../../platform/logger'
import type { EvidenceDocPath } from '../../content/evidence'
import brandMarkUrl from '../../../assets/brand/inner-echo-mark.svg'
import mirrorRenderUrl from '../../../assets/screens/mirror-render.webp'
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
            Notice <em>what shifts.</em>
          </h1>
          <p className="ie-titlePage__lede">
            A gentle audiovisual metaphor over your own camera, in this browser. A way to talk, not
            a diagnosis.
          </p>
          <div className="ie-titlePage__actions">
            <button type="button" className="ie-btn ie-btn--accent" onClick={handleContinue}>
              Continue to setup
            </button>
            <button
              type="button"
              className="ie-btn"
              onClick={() => onOpenEvidence('docs/references/README.md')}
              aria-label="Read the evidence notes (Method and Evidence)"
            >
              Read the evidence notes
            </button>
          </div>
        </div>

        <figure className="ie-titlePage__media">
          <img
            src={mirrorRenderUrl}
            width={1600}
            height={1000}
            alt="A narrow stone alley opening onto the sea, seen through the Inner Echo mirror: a grainy veil softens the walls and the edges darken toward the bright opening."
          />
          <figcaption className="ie-caption__note">
            Derealization and Time Dilation, rendered over a photograph. An interpretation, not a
            reproduction.
          </figcaption>
        </figure>
      </div>

      <section className="ie-commitments" aria-labelledby="welcome-commitments">
        <h2 id="welcome-commitments">Before you continue</h2>
        <ol className="ie-notes">
          <li>
            <h3>Media stays here</h3>
            <p>
              Camera and microphone are processed in this browser only. Nothing is recorded,
              uploaded, or sent anywhere.
            </p>
          </li>
          <li>
            <h3>You stay in control</h3>
            <p>
              Continuing does not request camera, microphone, or audio access. Each starts only when
              you ask, and Stop Everything releases all active media at once.
            </p>
          </li>
          <li>
            <h3>Interpretations, not reproductions</h3>
            <p>
              Sources describe experiences. The images and sounds are artistic interpretations of
              them, not validated reproductions.
            </p>
          </li>
        </ol>
      </section>
    </section>
  )
}
