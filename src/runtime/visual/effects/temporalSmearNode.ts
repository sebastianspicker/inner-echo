/**
 * Temporal smear: a faint, continuous afterimage trail with an optional slow drift of the
 * retained frame. Uses the pipeline's ping-pong render targets; this node only provides
 * the material.
 */

import { TemporalBlendNode } from './temporalBlendNode'

export class TemporalSmearNode extends TemporalBlendNode {
  readonly nodeName = 'temporal_smear'
  protected readonly config = {
    feedbackLimit: 'max_temporal_feedback' as const,
    tauMaxSeconds: 0.6,
    recurrenceBoost: 0,
    recurrencePeriodSeconds: 1,
  }
}
