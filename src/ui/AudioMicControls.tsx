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

export function AudioMicControls({
  audioStatus,
  audioEnabled,
  audioError,
  masterVolume,
  micStatus,
  micError,
  micSensitivity,
  micGate,
  inputMode,
  onEnableAudio,
  onEnableMic,
  onDisableMic,
  onMasterVolumeChange,
  onMicSensitivityChange,
  onMicGateChange,
  onInputModeChange,
}: AudioMicControlsProps) {
  return (
    <details className="ie-panelSection">
      <summary className="ie-summary">Audio & microphone</summary>
      <div className="ie-panelBody">
        <div className="ie-controlGroup" role="group" aria-label="Audio">
          <div className="ie-controlStatus" role="status" aria-live="polite">
            Audio: {getAudioStateLabel(audioStatus, audioEnabled)}
          </div>
          {audioError && (
            <p className="ie-inlineError" role="alert">
              {audioError}
            </p>
          )}
          {audioStatus === 'off' && (
            <button
              type="button"
              className="ie-btn ie-btn--accent"
              onClick={onEnableAudio}
              aria-label="Enable audio"
            >
              Enable audio
            </button>
          )}
          {audioStatus === 'on' && (
            <LabeledSlider
              label="Master volume"
              className="ie-control ie-control--range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={onMasterVolumeChange}
            />
          )}

          {audioStatus === 'on' && (
            <div className="ie-controlSubgroup" role="group" aria-label="Microphone (optional)">
              <p className="ie-hint">
                The microphone is entirely optional and stays local to your device. Nothing is ever
                recorded or shared. You can turn it off at any time.
              </p>
              <div className="ie-controlStatus" role="status" aria-live="polite">
                Mic: {micStatus === 'off' && 'off'}
                {micStatus === 'requesting' && 'requesting…'}
                {micStatus === 'on' && 'on'}
                {micStatus === 'denied' && 'denied'}
                {micStatus === 'error' && 'error'}
              </div>
              {micError && (
                <p className="ie-inlineError" role="alert">
                  {micError}
                </p>
              )}
              {micStatus !== 'on' && micStatus !== 'requesting' && (
                <button
                  type="button"
                  className="ie-btn ie-btn--accent"
                  onClick={onEnableMic}
                  aria-label="Enable microphone (optional)"
                >
                  Enable microphone (optional)
                </button>
              )}
              {micStatus === 'on' && (
                <>
                  <button
                    type="button"
                    className="ie-btn"
                    onClick={onDisableMic}
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
                    value={micSensitivity}
                    onChange={onMicSensitivityChange}
                  />
                  <LabeledSlider
                    label="Noise gate"
                    className="ie-control ie-control--range"
                    min={0}
                    max={1}
                    step={0.01}
                    value={micGate}
                    onChange={onMicGateChange}
                  />
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
                            aria-label={
                              mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'
                            }
                          />
                          <span>
                            {mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </details>
  )
}
