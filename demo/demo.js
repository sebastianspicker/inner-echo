const steps = [
  {
    image: '01-onboarding.webp',
    alt: 'Inner Echo welcome and privacy disclosure screen',
    kicker: 'Welcome and boundaries',
    title: 'Begin without requesting access',
    description:
      'The real product explains its metaphor, privacy model, and permission boundaries before any media action is available.',
  },
  {
    image: '05-symptom-mode.webp',
    alt: 'Inner Echo experience-dimension setup with synthetic fixture media',
    kicker: 'Experience setup',
    title: 'Shape a reflective setup',
    description:
      'Experience dimensions can be combined and weighted. The captured fixture is sanitized and does not describe a person.',
  },
  {
    image: '02-hero-active.webp',
    alt: 'Inner Echo active runtime screen with deterministic synthetic camera input',
    kicker: 'Active workspace',
    title: 'Keep state and comfort visible',
    description:
      'The real runtime shows camera, audio, and effects state alongside intensity, Safe Mode, and Reduced Motion controls.',
  },
  {
    image: '10-stop-everything-idle.webp',
    alt: 'Inner Echo idle screen after Stop Everything was used during fixture capture',
    kicker: 'Stopped state',
    title: 'Return to a truthful idle state',
    description:
      'Stop Everything releases active resources in the real application. Here it is only a documented end state.',
  },
]

const image = document.querySelector('#demo-image')
const counter = document.querySelector('#step-counter')
const kicker = document.querySelector('#step-kicker')
const title = document.querySelector('#step-title')
const description = document.querySelector('#step-description')
const previous = document.querySelector('#previous-step')
const next = document.querySelector('#next-step')
const status = document.querySelector('#status-message')
const dots = [...document.querySelectorAll('.step-dot')]

let activeStep = 0

function showStep(stepIndex) {
  activeStep = Math.max(0, Math.min(stepIndex, steps.length - 1))
  const step = steps[activeStep]

  image.src = `./screenshots/${step.image}`
  image.alt = step.alt
  counter.textContent = `Step ${activeStep + 1} of ${steps.length}`
  kicker.textContent = step.kicker
  title.textContent = step.title
  description.textContent = step.description
  previous.disabled = activeStep === 0
  next.disabled = activeStep === steps.length - 1
  status.textContent = `Simulated walkthrough showing step ${activeStep + 1}: ${step.title}.`

  dots.forEach((dot, index) => {
    dot.classList.toggle('is-current', index === activeStep)
    if (index === activeStep) dot.setAttribute('aria-current', 'step')
    else dot.removeAttribute('aria-current')
  })
}

previous.addEventListener('click', () => showStep(activeStep - 1))
next.addEventListener('click', () => showStep(activeStep + 1))
dots.forEach((dot) => dot.addEventListener('click', () => showStep(Number(dot.dataset.step))))
