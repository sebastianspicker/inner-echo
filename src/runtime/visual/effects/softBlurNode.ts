/**
 * Soft blur: a 13-tap, two-ring disc blur whose radius follows `amount`.
 *
 * The rings are rotated per pixel with a hash so the small kernel reads as a smooth
 * softening rather than a visible ring pattern. `amount` 0.35 (the declared maximum) is a
 * radius of about 1.4% of the frame height.
 */

import { DISC_BLUR_GLSL, HASH_GLSL } from './shaderKernels'
import { SinglePassTexelNode } from './singlePassTexelNode'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform vec2 u_texelSize;
varying vec2 vUv;

${HASH_GLSL}
${DISC_BLUR_GLSL}
void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  gl_FragColor = vec4(ieDiscBlur(u_map, uv, vUv, u_amount * 0.04, u_texelSize), 1.0);
}
`

export class SoftBlurNode extends SinglePassTexelNode {
  readonly nodeName = 'soft_blur'
  protected readonly fragment = FRAG
  protected readonly maxAmount = 0.35
}
