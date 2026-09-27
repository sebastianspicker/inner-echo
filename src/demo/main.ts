import './demo.css'

type DemoPhase = 'welcome' | 'setup' | 'active'

type Profile = {
  description: string
  name: string
}

type DemoState = {
  audioEnabled: boolean
  evidenceOpen: boolean
  feedback: string
  hyperarousal: number
  hypervigilance: number
  intensity: number
  micEnabled: boolean
  phase: DemoPhase
  profile: string
  reducedMotion: boolean
  safeMode: boolean
}

const profiles: Profile[] = [
  { name: 'None (clean)', description: 'Baseline mock feed, with no visual treatment.' },
  {
    name: 'Anxiety — generalized / social',
    description: 'Heightened tension and threat-scanning attention, kept bounded and controllable.',
  },
  {
    name: 'Depersonalization / derealization',
    description: 'A gentle behind-glass distance with subtle time drift.',
  },
  {
    name: 'Depressive disorder',
    description: 'Reduced affective contrast and cognitive fog, subtle and non-stereotyped.',
  },
]

const initialState = (): DemoState => ({
  audioEnabled: false,
  evidenceOpen: false,
  feedback: '',
  hyperarousal: 65,
  hypervigilance: 35,
  intensity: 50,
  micEnabled: false,
  phase: 'welcome',
  profile: profiles[1].name,
  reducedMotion: false,
  safeMode: true,
})

let state = initialState()

function selectedProfile() {
  return profiles.find((profile) => profile.name === state.profile) ?? profiles[0]
}

function getRequiredElement<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Demo element is missing: ${selector}`)
  return element
}

function setVisible(selector: string, visible: boolean) {
  getRequiredElement<HTMLElement>(selector).hidden = !visible
}

function updateStatus(selector: string, value: string, active: boolean) {
  const item = getRequiredElement<HTMLElement>(selector)
  getRequiredElement<HTMLElement>('.status-value', item).textContent = value
  getRequiredElement<HTMLElement>('.status-value', item).classList.toggle('is-on', active)
  getRequiredElement<HTMLElement>('.status-dot', item).classList.toggle('is-on', active)
}

function formatWeight(value: number) {
  return (value / 100).toFixed(2)
}

function setReadout(selector: string, value: string) {
  const readout = getRequiredElement<HTMLElement>(selector)
  const text = readout.lastChild
  if (!text) throw new Error(`Demo readout is missing text: ${selector}`)
  text.textContent = value
}

function renderVisibility(active: boolean) {
  setVisible('[data-demo-welcome]', state.phase === 'welcome')
  setVisible('[data-demo-shell]', state.phase !== 'welcome')
  setVisible('[data-action="stop"]', active)
  setVisible('[data-action="reset"]', state.phase !== 'welcome')
  setVisible('[data-evidence-note]', state.evidenceOpen)
  setVisible('[data-action="start"]', !active)
  setVisible('[data-action="save"]', active)
}

function renderStage(active: boolean, profile: Profile) {
  const stage = getRequiredElement<HTMLElement>('[data-stage]')
  stage.classList.toggle('is-active', active)
  setReadout(
    '[data-feed-readout]',
    active ? ' SIMULATED FEED · 1280×720' : ' DEMO PREVIEW · NO DEVICE ACCESS',
  )
  getRequiredElement<HTMLElement>('[data-stage-profile]').textContent = active
    ? profile.name
    : 'Ready to simulate'
  setReadout('[data-stage-truth]', active ? ' SIMULATION ACTIVE' : ' SIMULATED INPUT ONLY')
}

function renderStatuses(active: boolean) {
  updateStatus('[data-status="feed"]', active ? 'Simulated' : 'Idle', active)
  updateStatus(
    '[data-status="audio"]',
    state.audioEnabled ? 'Simulated on' : 'Off',
    state.audioEnabled,
  )
  updateStatus('[data-status="mic"]', state.micEnabled ? 'Simulated on' : 'Off', state.micEnabled)
  updateStatus('[data-status="effects"]', active ? 'Demo active' : 'Standby', active)
}

function renderControls(profile: Profile, active: boolean) {
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-profile]')) {
    button.setAttribute('aria-pressed', String(button.dataset.profile === profile.name))
  }

  for (const input of document.querySelectorAll<HTMLInputElement>('[data-range]')) {
    const value =
      state[
        input.dataset.range as keyof Pick<
          DemoState,
          'hyperarousal' | 'hypervigilance' | 'intensity'
        >
      ]
    input.value = String(value)
    getRequiredElement<HTMLOutputElement>(`[data-output="${input.dataset.range}"]`).value =
      input.dataset.range === 'intensity' ? `${value}%` : formatWeight(value)
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-switch]')) {
    const checked =
      state[button.dataset.switch as keyof Pick<DemoState, 'safeMode' | 'reducedMotion'>]
    button.classList.toggle('is-on', checked)
    button.setAttribute('aria-checked', String(checked))
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-simulation]')) {
    const enabled =
      state[button.dataset.simulation as keyof Pick<DemoState, 'audioEnabled' | 'micEnabled'>]
    button.setAttribute('aria-pressed', String(enabled))
    button.textContent = enabled ? 'Disable' : 'Simulate'
  }

  getRequiredElement<HTMLElement>('[data-evidence-toggle]').textContent = state.evidenceOpen
    ? 'Hide evidence'
    : 'Evidence'
  getRequiredElement<HTMLElement>('[data-footer-note]').textContent = active
    ? 'Everything shown remains simulated. No device access occurs.'
    : 'Starting the demo changes local interface state only.'

  const feedback = getRequiredElement<HTMLElement>('[data-feedback]')
  feedback.hidden = !state.feedback
  feedback.textContent = state.feedback
}

function render() {
  const active = state.phase === 'active'
  const profile = selectedProfile()
  document.body.dataset.demoPhase = state.phase
  renderVisibility(active)
  renderStage(active, profile)
  renderStatuses(active)
  renderControls(profile, active)
}

function updateState(next: Partial<DemoState>) {
  state = { ...state, ...next }
  render()
}

function resetDemo(message: string) {
  state = { ...initialState(), phase: 'setup', feedback: message }
  render()
}

document.addEventListener('click', (event) => {
  const target = (event.target as Element).closest<HTMLElement>(
    '[data-action], [data-profile], [data-switch], [data-simulation]',
  )
  if (!target) return

  if (target.dataset.profile) {
    const profile = profiles.find((item) => item.name === target.dataset.profile)
    if (profile)
      updateState({
        feedback: `${profile.name} selected for the simulated feed.`,
        profile: profile.name,
      })
    return
  }

  if (target.dataset.switch) {
    const key = target.dataset.switch as keyof Pick<DemoState, 'safeMode' | 'reducedMotion'>
    updateState({ [key]: !state[key] })
    return
  }

  if (target.dataset.simulation) {
    const key = target.dataset.simulation as keyof Pick<DemoState, 'audioEnabled' | 'micEnabled'>
    updateState({ [key]: !state[key] })
    return
  }

  switch (target.dataset.action) {
    case 'continue':
      updateState({ phase: 'setup' })
      break
    case 'start':
      updateState({
        feedback: 'Demo started. The feed and all status readouts are simulated.',
        phase: 'active',
      })
      break
    case 'stop':
      updateState({
        audioEnabled: false,
        feedback: 'Demo stopped. No device was active or accessed.',
        micEnabled: false,
        phase: 'setup',
      })
      break
    case 'reset':
      resetDemo('Demo reset. No device was active or accessed.')
      break
    case 'evidence':
      updateState({ evidenceOpen: !state.evidenceOpen })
      break
    case 'close-evidence':
      updateState({ evidenceOpen: false })
      break
    case 'share':
      updateState({
        feedback: 'Share link prepared for this mock setup. Nothing was copied or sent.',
      })
      break
    case 'save':
      updateState({ feedback: `Mock setup saved: ${selectedProfile().name}. No data was stored.` })
      break
  }
})

document.addEventListener('input', (event) => {
  const input = event.target as HTMLInputElement
  if (!input.matches('[data-range]')) return

  const key = input.dataset.range as keyof Pick<
    DemoState,
    'hyperarousal' | 'hypervigilance' | 'intensity'
  >
  updateState({ [key]: Number(input.value) })
})

render()
