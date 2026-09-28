/**
 * Subtle single-pass unsharp mask.
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

  vec2 dx = vec2(u_texelSize.x, 0.0);
  vec2 dy = vec2(0.0, u_texelSize.y);
  vec4 blur =
    c * 0.50 +
    texture2D(u_map, uv + dx) * 0.125 +
    texture2D(u_map, uv - dx) * 0.125 +
    texture2D(u_map, uv + dy) * 0.125 +
    texture2D(u_map, uv - dy) * 0.125;

  vec3 detail = c.rgb - blur.rgb;
  vec3 outRgb = c.rgb + detail * u_amount;

  gl_FragColor = vec4(clamp(outRgb, 0.0, 1.0), 1.0);
}
`

export class EdgeSharpenNode extends SinglePassTexelNode {
  readonly nodeName = 'edge_sharpen'
  protected readonly fragment = FRAG
  protected readonly maxAmount = 0.2
}
