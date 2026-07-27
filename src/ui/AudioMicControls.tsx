import type { AudioContextStatus, MicStatus, AudioInputMode } from '../engine/audio'
import { MicrophoneActiveControls } from './MicrophoneActiveControls'
import { MicrophoneActivationButton } from './MicrophoneActivationButton'
import { MicrophonePrivacyHint } from './MicrophonePrivacyHint'
import { MicrophoneStatus } from './MicrophoneStatus'
import { getAudioStateLabel } from './audioStatusMessages'
import { LabeledSlider } from './controls/LabeledSlider'

export interface AudioMicControlsProps {
  audioStatus: AudioContextStatus
  audioEnabled: boolean
  audioError: string | null
  masterVolume: number
  micStatus: MicStatus
  micError: string | null
  micSensitivity: number
  micGate: number
  inputMode: AudioInputMode
  onEnableAudio: () => void
  onDisableAudio: () => void
  onEnableMic: () => void
  onDisableMic: () => void
  onMasterVolumeChange: (vol: number) => void
  onMicSensitivityChange: (val: number) => void
  onMicGateChange: (val: number) => void
  onInputModeChange: (mode: AudioInputMode) => void
  defaultOpen?: boolean
}

function AudioSection(props: AudioMicControlsProps) {
  return (
    <>
      <div className="ie-controlStatus" role="status" aria-live="polite">
        Audio: {getAudioStateLabel(props.audioStatus, props.audioEnabled)}
      </div>
      {props.audioError && (
        <p className="ie-inlineError" role="alert">
          {props.audioError}
        </p>
      )}
      {props.audioStatus === 'off' && (
        <button
          type="button"
          className="ie-btn ie-btn--accent"
          onClick={props.onEnableAudio}
          aria-label="Enable audio"
        >
          Enable audio
        </button>
      )}
      {props.audioStatus === 'on' && (
        <>
          <button type="button" className="ie-btn" onClick={props.onDisableAudio}>
            Disable sound
          </button>
          <LabeledSlider
            label="Master volume"
            className="ie-control ie-control--range"
            min={0}
            max={1}
            step={0.01}
            value={props.masterVolume}
            onChange={props.onMasterVolumeChange}
          />
        </>
      )}
    </>
  )
}

function MicrophoneSection(props: AudioMicControlsProps) {
  if (props.audioStatus !== 'on') return null
  const canEnable = props.micStatus !== 'on' && props.micStatus !== 'requesting'

  return (
    <div className="ie-controlSubgroup" role="group" aria-label="Microphone (optional)">
      <MicrophonePrivacyHint />
      <MicrophoneStatus status={props.micStatus} error={props.micError} />
      <MicrophoneActivationButton canEnable={canEnable} onEnableMic={props.onEnableMic} />
      {props.micStatus === 'on' && <MicrophoneActiveControls {...props} />}
    </div>
  )
}

export function AudioMicControls(props: AudioMicControlsProps) {
  return (
    <details
      className="ie-panelSection ie-panelSection--audio"
      open={props.defaultOpen || undefined}
    >
      <summary className="ie-summary">Audio & microphone</summary>
      <div className="ie-panelBody">
        <div className="ie-controlGroup" role="group" aria-label="Audio">
          <AudioSection {...props} />
          <MicrophoneSection {...props} />
        </div>
      </div>
    </details>
  )
}
