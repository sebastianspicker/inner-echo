/**
 * Temporal smear: blends with the previous frame using feedback and optional jitter.
 * Uses ping-pong RenderTargets managed by the pipeline; this node only provides the material.
 */

import { TemporalBlendNode } from './temporalBlendNode'

export class TemporalSmearNode extends TemporalBlendNode {
  readonly nodeName = 'temporal_smear'
  protected readonly config = {
    feedbackLimit: 'max_temporal_feedback' as const,
    jitterX: 12.3,
    jitterY: 7.7,
    initialFeedback: 0.5,
    wrapAt: 1000,
  }
}
