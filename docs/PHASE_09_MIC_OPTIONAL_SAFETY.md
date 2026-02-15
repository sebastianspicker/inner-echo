# Phase 9: Mic Optional Safety

Optional microphone as an audio source (permission separate from camera). Local-only; no recording or storage. Safety: low default gain, hard limiter, switchable routing (synth / mic / mix).

**Prerequisite:** Phase 8 complete.

---

## File list

| File | Role |
|------|------|
| `src/engine/audio/types.ts` | `MicStatus` ('off' \| 'requesting' \| 'on' \| 'denied' \| 'error'), `AudioInputMode` ('synth' \| 'mic' \| 'mix'). |
| `src/engine/audio/audioEngine.ts` | Mic: `getUserMedia({ audio: true })` on user gesture; `MediaStreamAudioSourceNode` → pre-gain → limiter → mixer; routing (synth/mic/mix); `requestMic()`, `stopMic()`, `setInputMode()`; Stop clears mic tracks. |
| `src/engine/audio/index.ts` | Exports `MicStatus`, `AudioInputMode`. |
| `src/ui/CameraView.tsx` | Mic state, "Enable microphone (optional)" / "Disable microphone", status text, input mode (Synth only / Mic only / Mix); Stop resets mic state. |
| `src/ui/CameraView.css` | `.camera-view__mic`, `.camera-view__mic-desc`, `.camera-view__mic-status`, `.camera-view__btn--mic`, `.camera-view__btn--mic-off`, `.camera-view__input-mode`. |
| `docs/PHASE_09_MIC_OPTIONAL_SAFETY.md` | This doc. |

---

## Behaviour

- **Permission:** Microphone is requested only after a user gesture (click "Enable microphone (optional)"). Separate from camera; denying mic does not affect camera or synth.
- **Routing:** When mic is on, user can choose **Synth only**, **Mic only**, or **Mix** (both at reduced level). Same FX chain (e.g. lowpass) is applied to the selected input(s).
- **Safety:** Mic path: pre-gain 0.25 → DynamicsCompressorNode (threshold -24 dB, ratio 8, fast attack/release). No recording, no storage, no network.
- **Stop:** "Stop" (Stop Everything) stops mic tracks and clears mic state; `stopMic()` is called from engine `stop()`.

---

## Test steps (acceptance)

1. **Deny → clean denied state**
   - Start camera, enable audio. Click "Enable microphone (optional)". In the browser permission prompt, choose **Block**.
   - UI shows status "Mic: denied" (and optional error message). No console errors. User can click "Enable microphone (optional)" again to retry.

2. **Active → audible effect on mic**
   - Start camera, select a condition with audio (e.g. one with lowpass in `audio_stack`). Enable audio, then enable microphone and allow permission.
   - Set input to **Mic only**. Speak or make sound; the same effect (e.g. lowpass) should be clearly audible on the mic signal.

3. **Loud signal does not clip (limiter)**
   - With mic on and **Mic only**, produce a loud signal (e.g. loud speech or noise close to mic). Output should not distort; limiter keeps level in check.

4. **Stop → mic track off**
   - With mic on, click **Stop** (Stop Everything). Mic status returns to "off"; no mic tracks remain active (browser mic indicator off). No console errors.

5. **Routing**
   - With mic on: switch between **Synth only**, **Mic only**, and **Mix**. Synth only = only synth through FX; Mic only = only mic through FX; Mix = both at reduced level.

6. **No recording / no network**
   - Confirm no `MediaRecorder`, no `getUserMedia` for video+audio together for recording, and no network requests when using mic (MVP rule).

---

## Constants (safety)

- `MIC_PRE_GAIN`: 0.25  
- Limiter: threshold -24 dB, ratio 8, attack 0.003 s, release 0.1 s  

All in `src/engine/audio/audioEngine.ts`.
