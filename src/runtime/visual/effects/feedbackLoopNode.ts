/**
 * Feedback loop: bounded image recurrence. A short afterimage persists, and on a slow
 * cycle (about every 6.5 s) the retained image is held up to 2.5 times longer before releasing, so the
 * same frame keeps resurfacing without escalating.
 * Params: decay, feedback, jitter.
 */

import { TemporalBlendNode } from './temporalBlendNode'

export class FeedbackLoopNode extends TemporalBlendNode {
  readonly nodeName = 'feedback_loop'
  protected readonly config = {
    feedbackLimit: 'max_feedback' as const,
    tauMaxSeconds: 0.6,
    recurrenceBoost: 1.5,
    recurrencePeriodSeconds: 6.5,
  }
}
