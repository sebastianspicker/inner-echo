import type { AudioContextStatus, MicStatus, AudioInputMode } from '../engine/audio'
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
  onEnableMic: () => void
  onDisableMic: () => void
  onMasterVolumeChange: (vol: number) => void
  onMicSensitivityChange: (val: number) => void
  onMicGateChange: (val: number) => void
  onInputModeChange: (mode: AudioInputMode) => void
}

function micStatusLabel(status: MicStatus): string {
  if (status === 'requesting') return 'requesting…'
  return status
}

function InputModeControls({
  inputMode,
  onInputModeChange,
}: Pick<AudioMicControlsProps, 'inputMode' | 'onInputModeChange'>) {
  const label = (mode: AudioInputMode) =>
    mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'
  return (
    <div className="ie-controlInputMode" role="group" aria-label="Audio input">
      <span className="ie-controlLabel">Input</span>
      <div className="ie-controlOptions">
        {(['synth', 'mic', 'mix'] as const).map((mode) => (
          <label key={mode} className="ie-control ie-control--toggle">
            <input
              type="radio"
              name="audio-input-mode"
              checked={inputMode === mode}
              onChange={() => onInputModeChange(mode)}
              aria-label={label(mode)}
            />
            <span>{label(mode)}</span>
          </label>
        ))}
      </div>
    </div>
  )
}

function MicrophoneControls(props: AudioMicControlsProps) {
  const canEnable = props.micStatus !== 'on' && props.micStatus !== 'requesting'
  return (
    <div className="ie-controlSubgroup" role="group" aria-label="Microphone (optional)">
      <p className="ie-hint">
        The microphone is entirely optional and stays local to your device. Nothing is ever recorded
        or shared. You can turn it off at any time.
      </p>
      <div className="ie-controlStatus" role="status" aria-live="polite">
        Mic: {micStatusLabel(props.micStatus)}
      </div>
      {props.micError && (
        <p className="ie-inlineError" role="alert">
          {props.micError}
        </p>
      )}
      {canEnable && (
        <button
          type="button"
          className="ie-btn ie-btn--accent"
          onClick={props.onEnableMic}
          aria-label="Enable microphone (optional)"
        >
          Enable microphone (optional)
        </button>
      )}
      {props.micStatus === 'on' && (
        <>
          <button
            type="button"
            className="ie-btn"
            onClick={props.onDisableMic}
            aria-label="Disable microphone"
          >
            Disable microphone
          </button>
          <LabeledSlider
            label="Mic sensitivity"
            className="ie-control ie-control--range"
            min={0}
            max={1}
            step={0.01}
            value={props.micSensitivity}
            onChange={props.onMicSensitivityChange}
          />
          <LabeledSlider
            label="Noise gate"
            className="ie-control ie-control--range"
            min={0}
            max={1}
            step={0.01}
            value={props.micGate}
            onChange={props.onMicGateChange}
          />
          <InputModeControls
            inputMode={props.inputMode}
            onInputModeChange={props.onInputModeChange}
          />
        </>
      )}
    </div>
  )
}

export function AudioMicControls(props: AudioMicControlsProps) {
  return (
    <details className="ie-panelSection">
      <summary className="ie-summary">Audio & microphone</summary>
      <div className="ie-panelBody">
        <div className="ie-controlGroup" role="group" aria-label="Audio">
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
            <LabeledSlider
              label="Master volume"
              className="ie-control ie-control--range"
              min={0}
              max={1}
              step={0.01}
              value={props.masterVolume}
              onChange={props.onMasterVolumeChange}
            />
          )}

          {props.audioStatus === 'on' && <MicrophoneControls {...props} />}
        </div>
      </div>
    </details>
  )
}
