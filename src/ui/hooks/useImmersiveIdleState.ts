import { useEffect, useState } from 'react'
import type { CameraState } from '../../engine/video'

/**
 * Tracks UI idleness while camera is active, for immersive auto-hide mode.
 */
export function useImmersiveIdleState(cameraState: CameraState, timeoutMs = 4500): boolean {
  const [isIdle, setIsIdle] = useState(false)

  useEffect(() => {
    if (cameraState !== 'active') {
      setIsIdle(false)
      return
    }
    let timeoutId: number
    const handleActivity = () => {
      setIsIdle(false)
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => setIsIdle(true), timeoutMs)
    }
    window.addEventListener('mousemove', handleActivity)
    window.addEventListener('keydown', handleActivity)
    window.addEventListener('touchstart', handleActivity)
    handleActivity()
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('mousemove', handleActivity)
      window.removeEventListener('keydown', handleActivity)
      window.removeEventListener('touchstart', handleActivity)
    }
  }, [cameraState, timeoutMs])

  return isIdle
}
