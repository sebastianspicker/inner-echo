/**
 * Video Effect Node Interface
 * 
 * In Inner Echo, a "VideoNode" represents a single distinct visual effect 
 * (like Vignette, Grain, Blur, or Color Grading). 
 * 
 * These nodes are intended to be chained together sequentially by the `webglPipeline.ts`.
 * Each node provides a Three.js `Material` (a shader) which reads an input texture, 
 * applies its mathematical effect, and then the pipeline renders it to an output texture.
 */

import type * as THREE from 'three'

/**
 * Parameters the pipeline passes to nodes each frame (intensity, safe mode, UV, control values).
 */
export interface VideoNodeParams {
  /** Global effect intensity 0..1. In Safe Mode the pipeline clamps this (e.g. max 0.7). */
  intensity: number
  /** When true, intensity and other risky parameters are clamped. */
  safeMode: boolean
  /** SSOT safety clamps (global + safe-mode). */
  safetyContext?: {
    global: Record<string, unknown>
    safeMode: Record<string, unknown>
  }
  /** UV scale for cover fit (set by pipeline). */
  uvScale?: [number, number]
  /** UV offset for cover fit (set by pipeline). */
  uvOffset?: [number, number]
  /** Per-node control values from profile ui.controls, keyed e.g. "0.amount", "1.feedback". */
  controlValues?: Record<string, number | boolean>
  /** This node's index in the video_stack (for resolving control keys). */
  nodeIndex?: number
}

/**
 * Video effect node: produces a material that reads from an input texture.
 * If needsPreviousFrame is true, getMaterial receives a second texture (previous frame) for ping-pong.
 */
export interface VideoNode {
  /**
   * Optional explicit identifier for the node (prevents issues with minification).
   */
  readonly nodeName?: string

  /**
   * When true, pipeline allocates two RenderTargets (ping-pong) and passes previous frame as second arg.
   */
  readonly needsPreviousFrame?: boolean

  /**
   * Update node parameters (intensity, safe mode, control values). Node may clamp when safeMode is true.
   */
  setParams(params: VideoNodeParams): void

  /**
   * Return the material for this pass. inputTexture = current chain input; previousFrame only set for temporal nodes.
   */
  getMaterial(
    inputTexture: THREE.Texture,
    previousFrameTexture?: THREE.Texture | null
  ): THREE.Material

  /**
   * Release WebGL resources (e.g. material, internal RTs). Called when the pipeline stops.
   */
  dispose(): void
}
