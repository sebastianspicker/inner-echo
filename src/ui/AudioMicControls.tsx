import type { AudioContextStatus, MicStatus, AudioInputMode } from '../engine/audio'

export interface AudioMicControlsProps {
    audioStatus: AudioContextStatus
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
                <div className="camera-view__audio" role="group" aria-label="Audio">
                    <div className="camera-view__audio-status" role="status" aria-live="polite">
                        Audio: {audioStatus === 'off' && 'off'}
                        {audioStatus === 'starting' && 'starting…'}
                        {audioStatus === 'on' && 'on'}
                        {audioStatus === 'error' && 'error'}
                    </div>
                    {audioError && (
                        <p className="camera-view__error" role="alert">
                            {audioError}
                        </p>
                    )}
                    {audioStatus === 'off' && (
                        <button
                            type="button"
                            className="camera-view__btn camera-view__btn--audio"
                            onClick={onEnableAudio}
                            aria-label="Enable audio"
                        >
                            Enable audio
                        </button>
                    )}
                    {audioStatus === 'on' && (
                        <label className="camera-view__control">
                            <span className="camera-view__control-label">Master volume</span>
                            <input
                                type="range"
                                min={0}
                                max={100}
                                value={Math.round(masterVolume * 100)}
                                onChange={(e) => {
                                    const n = Number(e.target.value)
                                    if (!Number.isFinite(n)) return
                                    onMasterVolumeChange(n / 100)
                                }}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-valuenow={Math.round(masterVolume * 100)}
                                aria-valuetext={`${Math.round(masterVolume * 100)}%`}
                            />
                        </label>
                    )}

                    {audioStatus === 'on' && (
                        <div className="camera-view__mic" role="group" aria-label="Microphone (optional)">
                            <p className="camera-view__mic-desc">
                                Microphone is optional, local-only, and can be turned off anytime. Not recorded or sent anywhere.
                            </p>
                            <div className="camera-view__mic-status" role="status" aria-live="polite">
                                Mic: {micStatus === 'off' && 'off'}
                                {micStatus === 'requesting' && 'requesting…'}
                                {micStatus === 'on' && 'on'}
                                {micStatus === 'denied' && 'denied'}
                                {micStatus === 'error' && 'error'}
                            </div>
                            {micError && (
                                <p className="camera-view__error" role="alert">
                                    {micError}
                                </p>
                            )}
                            {micStatus !== 'on' && micStatus !== 'requesting' && (
                                <button
                                    type="button"
                                    className="camera-view__btn camera-view__btn--mic"
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
                                        className="camera-view__btn camera-view__btn--mic-off"
                                        onClick={onDisableMic}
                                        aria-label="Disable microphone"
                                    >
                                        Disable microphone
                                    </button>
                                    <label className="camera-view__control">
                                        <span className="camera-view__control-label">Mic sensitivity</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={Math.round(micSensitivity * 100)}
                                            onChange={(e) => {
                                                const n = Number(e.target.value)
                                                if (!Number.isFinite(n)) return
                                                onMicSensitivityChange(n / 100)
                                            }}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(micSensitivity * 100)}
                                            aria-valuetext={`${Math.round(micSensitivity * 100)}%`}
                                        />
                                    </label>
                                    <label className="camera-view__control">
                                        <span className="camera-view__control-label">Noise gate</span>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={Math.round(micGate * 100)}
                                            onChange={(e) => {
                                                const n = Number(e.target.value)
                                                if (!Number.isFinite(n)) return
                                                onMicGateChange(n / 100)
                                            }}
                                            aria-valuemin={0}
                                            aria-valuemax={100}
                                            aria-valuenow={Math.round(micGate * 100)}
                                            aria-valuetext={`${Math.round(micGate * 100)}%`}
                                        />
                                    </label>
                                    <div className="camera-view__input-mode" role="group" aria-label="Audio input">
                                        <span className="camera-view__control-label">Input</span>
                                        <div className="camera-view__input-mode-options">
                                            {(['synth', 'mic', 'mix'] as const).map((mode) => (
                                                <label key={mode} className="camera-view__control camera-view__control--toggle">
                                                    <input
                                                        type="radio"
                                                        name="audio-input-mode"
                                                        checked={inputMode === mode}
                                                        onChange={() => onInputModeChange(mode)}
                                                        aria-label={mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'}
                                                    />
                                                    <span>{mode === 'synth' ? 'Synth only' : mode === 'mic' ? 'Mic only' : 'Mix'}</span>
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
