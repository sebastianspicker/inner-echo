export function createStartupCleanup(
  disposers: Array<() => void>,
  getContext: () => WebGLRenderingContext | null,
): () => void {
  let cleanedUp = false
  return () => {
    if (cleanedUp) return
    cleanedUp = true
    try {
      const context = getContext()
      if (context) {
        context.pixelStorei(context.UNPACK_FLIP_Y_WEBGL, false)
        context.pixelStorei(context.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      }
    } catch {
      /* cleanup remains best-effort */
    }
    for (let index = disposers.length - 1; index >= 0; index--) {
      try {
        disposers[index]()
      } catch {
        /* cleanup remains best-effort */
      }
    }
    disposers.length = 0
  }
}
