/**
 * Camera Request Utility
 *
 * A simple utility module to handle browser permissions and request the user's webcam feed.
 * It uses the native `navigator.mediaDevices.getUserMedia` API.
 *
 * Note: This only requests the video track. Audio/Microphone is handled separately in `audioEngine.ts`
 * to ensure we don't accidentally ask for microphone permissions if the user only wants video.
 */

export type RequestVideoResult =
  | { ok: true; stream: MediaStream }
  | { ok: false; error: DOMException }

/**
 * Request video-only stream from the default camera.
 * Call only in response to a user gesture (e.g. button click).
 */
export async function requestVideoStream(): Promise<RequestVideoResult> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return {
      ok: false,
      error: new DOMException(
        'getUserMedia is not supported in this browser.',
        'NotSupportedError',
      ),
    }
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    })
    return { ok: true, stream }
  } catch (e) {
    const err = e instanceof DOMException ? e : new DOMException(String(e), 'UnknownError')
    return { ok: false, error: err }
  }
}

/**
 * Stop all tracks on the given stream and release camera.
 * Safe to call with null/undefined.
 */
export function stopVideoStream(stream: MediaStream | null | undefined): void {
  if (!stream) return
  stream.getTracks().forEach((track) => {
    track.stop()
  })
}
