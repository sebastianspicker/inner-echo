/**
 * Gentle temporal recursion with strict clamps.
 * Params: decay, feedback, jitter.
 */

import { TemporalBlendNode } from './temporalBlendNode'

export class FeedbackLoopNode extends TemporalBlendNode {
  readonly nodeName = 'feedback_loop'
  protected readonly config = {
    feedbackLimit: 'max_feedback' as const,
    jitterX: 9.1,
    jitterY: 6.4,
    initialFeedback: 0,
  }
}
