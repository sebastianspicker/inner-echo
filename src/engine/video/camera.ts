/**
 * Minimal camera utilities for Phase 1: getUserMedia (video only), no WebGL.
 * Stops all tracks on a stream; does not perform any network or storage.
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
