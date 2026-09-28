/** WebGL overlay facade. Scene ownership and frame scheduling live in webgl helpers. */

import type { VideoNode } from '../effects/VideoNode'
import { logger } from '../../../platform/logger'
import { createFrameLoop } from './webgl/frameLoop'
import { createOverlayRuntimeState } from './webgl/pipelineState'
import {
  createStartupCleanup,
  initializeWebGLScene,
  registerRuntimeCleanup,
} from './webgl/sceneResources'
import type { VideoPipelineParams } from './webglPipelineTypes'
import type { WebGLDiagnostics } from './webgl/diagnostics'
import type { ReactiveLoopOptions } from './webgl/reactive'

export type { VideoPipelineParams }
export type WebGLOverlayStop = () => void

export interface WebGLOverlayControl {
  stop: WebGLOverlayStop
  setParams(params: VideoPipelineParams): void
  getDiagnostics(): WebGLDiagnostics
}

export interface WebGLOverlayCallbacks {
  onFatalRuntimeError?(error: Error): void
}

/** Optional reactive/coupling callbacks used by the frame loop. */
export type { ReactiveLoopOptions } from './webgl/reactive'

export interface WebGLOverlayStartOptions {
  video: HTMLVideoElement
  canvas: HTMLCanvasElement
  container: HTMLElement
  nodes: VideoNode[]
  reactiveOptions?: ReactiveLoopOptions | null
  callbacks?: WebGLOverlayCallbacks
}

/** Starts the visual graph without changing its public control or fallback behavior. */
export function startWebGLOverlayLoop({
  video,
  canvas,
  container,
  nodes,
  reactiveOptions,
  callbacks,
}: WebGLOverlayStartOptions): WebGLOverlayControl | null {
  const startupDisposers: Array<() => void> = []
  let gl: WebGLRenderingContext | null = null
  const cleanupResources = createStartupCleanup(startupDisposers, () => gl)
  try {
    const state = createOverlayRuntimeState(nodes)
    const resources = initializeWebGLScene(video, canvas, state.usePassthrough, startupDisposers)
    gl = resources.gl
    const stop = (): void => stopOverlay(state, cleanupResources)
    const failAndFallback = (message: string): void => {
      stop()
      callbacks?.onFatalRuntimeError?.(new Error(message))
    }
    registerContextLossHandler(canvas, stop, callbacks, startupDisposers)
    registerRuntimeCleanup(startupDisposers, state, nodes)
    // Camera stop, graph replacement, and renderer fallback must also withdraw
    // modulation from independently running audio.
    startupDisposers.push(() => {
      reactiveOptions?.onInactive?.(state.currentParams.controlValues ?? {})
      reactiveOptions?.applyAudioOverrides?.({})
    })
    state.lastTime = performance.now()
    state.lastScaleChangeMs = performance.now()
    state.rafId = requestAnimationFrame(
      createFrameLoop({
        video,
        canvas,
        container,
        nodes,
        resources,
        state,
        reactiveOptions,
        failAndFallback,
      }),
    )
    return createOverlayControl(stop, state)
  } catch (error) {
    const runtimeError = error instanceof Error ? error : new Error(String(error))
    logger.error('WebGL pipeline startup failed', runtimeError)
    callbacks?.onFatalRuntimeError?.(runtimeError)
    cleanupResources()
    return null
  }
}

function stopOverlay(
  state: import('./webgl/pipelineState').WebGLOverlayRuntimeState,
  cleanupResources: () => void,
): void {
  if (state.stopped) return
  state.stopped = true
  if (state.rafId != null) cancelAnimationFrame(state.rafId)
  state.rafId = null
  cleanupResources()
}

function registerContextLossHandler(
  canvas: HTMLCanvasElement,
  stop: () => void,
  callbacks: WebGLOverlayCallbacks | undefined,
  startupDisposers: Array<() => void>,
): void {
  const onContextLost = (event: Event): void => {
    event.preventDefault()
    logger.warn('WebGL context lost: falling back')
    stop()
    callbacks?.onFatalRuntimeError?.(new Error('WebGL context lost. Render loop stopped.'))
  }
  canvas.addEventListener('webglcontextlost', onContextLost)
  startupDisposers.push(() => canvas.removeEventListener('webglcontextlost', onContextLost))
}

function createOverlayControl(
  stop: () => void,
  state: import('./webgl/pipelineState').WebGLOverlayRuntimeState,
): WebGLOverlayControl {
  return {
    stop,
    setParams(params): void {
      mergePipelineParams(state.currentParams, params)
    },
    getDiagnostics: () => ({
      ...state.diagnostics,
      resourceCounts: { ...state.diagnostics.resourceCounts },
      activeVideoNodes: state.diagnostics.activeVideoNodes.slice(),
    }),
  }
}

function mergePipelineParams(current: VideoPipelineParams, next: VideoPipelineParams): void {
  mergeDefinedParam(current, next, 'intensity')
  mergeDefinedParam(current, next, 'safeMode')
  mergeDefinedParam(current, next, 'controlValues')
  mergeDefinedParam(current, next, 'stressMode')
  mergeDefinedParam(current, next, 'safetyContext')
}

function mergeDefinedParam<K extends keyof VideoPipelineParams>(
  current: VideoPipelineParams,
  next: VideoPipelineParams,
  key: K,
): void {
  if (next[key] !== undefined) current[key] = next[key]
}
