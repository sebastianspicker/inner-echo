/**
 * Subtle single-pass blur.
 * Note: We intentionally keep the kernel small to avoid performance issues.
 */

import { SinglePassTexelNode } from './singlePassTexelNode'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform vec2 u_texelSize;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 c = texture2D(u_map, uv);

  // Amount maps to a small UV radius; conservative to prevent disorientation.
  // Use texel size to ensure consistent blur across different resolutions and aspect ratios.
  float r = u_amount * 0.008;
  vec2 dx = vec2(r * u_texelSize.x / u_texelSize.y, 0.0);
  vec2 dy = vec2(0.0, r);

  vec4 blur =
    c * 0.40 +
    texture2D(u_map, uv + dx) * 0.15 +
    texture2D(u_map, uv - dx) * 0.15 +
    texture2D(u_map, uv + dy) * 0.15 +
    texture2D(u_map, uv - dy) * 0.15;

  gl_FragColor = clamp(blur, 0.0, 1.0);
}
`

export class SoftBlurNode extends SinglePassTexelNode {
  readonly nodeName = 'soft_blur'
  protected readonly fragment = FRAG
  protected readonly maxAmount = 0.35
}
