/**
 * Phase 5: Zod schemas for condition catalog and profile validation.
 * Required fields: id, label, video_stack. Unknown node types are skipped at build time (see graphBuilder).
 */

import { z } from 'zod'

/** Single entry in the conditions catalog (catalog.json). */
export const catalogEntrySchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recommended: z.boolean().optional(),
})

/** Full catalog file shape (we only validate the conditions array for loading). */
export const catalogSchema = z.object({
  conditions: z.array(catalogEntrySchema),
  version: z.string().optional(),
  project: z.string().optional(),
  disclaimer: z.string().optional(),
  references: z
    .object({
      dimensions_index: z.string().optional(),
      evidence_matrix: z.string().optional(),
      disclaimer: z.string().optional(),
    })
    .optional(),
})

/** One video stack node definition in a profile. */
export const videoStackNodeSchema = z.object({
  id: z.string().optional(),
  node: z.string(), // e.g. "grain", "vignette" — only "grain" is implemented in Phase 5
  params: z.record(z.string(), z.unknown()).optional(),
})

/** SSOT: Experience dimension reference + weight. */
export const experienceDimensionSchema = z.object({
  id: z.string().min(1),
  weight: z.number(),
})

/** SSOT: Framing block (metaphor/baseline + disclaimer). */
export const framingSchema = z.object({
  type: z.string().min(1),
  disclaimer: z.string().optional(),
})

/** One UI control from profile (slider or toggle). */
export const uiControlSchema = z.object({
  id: z.string(),
  type: z.enum(['slider', 'toggle']),
  label: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  /** e.g. "intensity", "video.vignette.amount" — maps to pipeline param or nodeIndex.param */
  target: z.string().optional(),
})

/** One audio stack node in a profile (Phase 7). e.g. lowpass, tremolo, noise_bed. */
export const audioStackNodeSchema = z.object({
  id: z.string().optional(),
  node: z.string(),
  params: z.record(z.string(), z.unknown()).optional(),
})

/** Audio stack config in profile: input (synth), master volume, chain of FX nodes. */
export const audioStackSchema = z.object({
  enabled: z.boolean().optional(),
  input: z.enum(['synth']).optional(),
  master: z.object({ volume: z.number().min(0).max(1).optional() }).optional(),
  chain: z.array(audioStackNodeSchema).optional(),
})

/** Phase 8: One analyser→video param mapping (source, target, scale, smoothing, clamp). */
export const analyserToParamSchema = z.object({
  source: z.enum(['rms']),
  target: z.string(), // e.g. "video.grain.amount", "video.temporal_smear.feedback"
  scale: z.number().optional(),
  offset: z.number().optional(),
  smoothing: z
    .object({
      attack: z.number().min(0).optional(),
      release: z.number().min(0).optional(),
    })
    .optional(),
  clamp: z.tuple([z.number(), z.number()]).optional(),
})

/** Phase 8: Reactive config — analyser (RMS) to video param mappings. */
export const reactiveSchema = z.object({
  analyser_to_params: z.array(analyserToParamSchema).optional(),
})

/** SSOT: Safe Mode clamps (values used when safeMode is on). */
export const safeModeClampsSchema = z
  .object({
    max_intensity: z.number().optional(),
    max_temporal_feedback: z.number().optional(),
    max_chroma: z.number().optional(),
    max_contrast: z.number().optional(),
    no_strobe: z.boolean().optional(),
    max_flash_hz: z.number().optional(),
    max_luminance_delta_per_frame: z.number().optional(),
    audio_ceiling_dbfs: z.number().optional(),
    max_tremolo_rate_hz: z.number().optional(),
    max_tremolo_depth: z.number().optional(),
    max_noise_level: z.number().optional(),
    max_feedback: z.number().optional(),
    max_jitter: z.number().optional(),
    max_pulse_depth: z.number().optional(),
  })
  .passthrough()

/** SSOT: Reduced Motion policy. */
export const reducedMotionPolicySchema = z
  .object({
    disable_nodes: z.array(z.string()).optional(),
    note: z.string().optional(),
  })
  .passthrough()

/** SSOT: Safety block (warnings shown in UI; clamps and reduced motion policy are enforced at runtime). */
export const profileSafetySchema = z
  .object({
    intensity_default: z.number(),
    intensity_max: z.number(),
    warnings: z.array(z.string()),
    safe_mode_clamps: safeModeClampsSchema,
    reduced_motion_policy: reducedMotionPolicySchema.optional(),
  })
  .passthrough()

/** Profile file (profiles/<id>.json). Required: id, label, video_stack. */
export const profileSchema = z.object({
  id: z.string().min(1),
  label: z.string(),
  summary: z.string(),
  framing: framingSchema,
  experience_dimensions: z.array(experienceDimensionSchema),
  video_stack: z.array(videoStackNodeSchema),
  audio_stack: audioStackSchema.optional(),
  reactive: reactiveSchema.optional(),
  safety: profileSafetySchema,
  ui: z
    .object({
      controls: z.array(uiControlSchema).optional(),
    })
    .optional(),
  references: z
    .object({
      dimensions: z.array(z.string()).optional(),
    })
    .optional(),
}).passthrough()

export type UIControl = z.infer<typeof uiControlSchema>
export type AudioStackNodeDef = z.infer<typeof audioStackNodeSchema>
export type AudioStackConfig = z.infer<typeof audioStackSchema>
export type AnalyserToParamDef = z.infer<typeof analyserToParamSchema>
export type ReactiveConfig = z.infer<typeof reactiveSchema>

export type CatalogEntry = z.infer<typeof catalogEntrySchema>
export type Catalog = z.infer<typeof catalogSchema>
export type VideoStackNodeDef = z.infer<typeof videoStackNodeSchema>
export type Profile = z.infer<typeof profileSchema>
