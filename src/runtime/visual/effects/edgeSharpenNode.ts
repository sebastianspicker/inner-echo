/**
 * Edge sharpen: an unsharp mask over a 3x3 Gaussian at 1.5-texel spacing.
 *
 * `amount` 0..1 maps to a detail gain of 0..2.2, so 1 is a clearly crisp, slightly
 * exaggerated image rather than a halo-heavy one.
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

  vec2 dx = vec2(u_texelSize.x * 1.5, 0.0);
  vec2 dy = vec2(0.0, u_texelSize.y * 1.5);
  vec3 plus =
    texture2D(u_map, uv + dx).rgb +
    texture2D(u_map, uv - dx).rgb +
    texture2D(u_map, uv + dy).rgb +
    texture2D(u_map, uv - dy).rgb;
  vec3 diagonal =
    texture2D(u_map, uv + dx + dy).rgb +
    texture2D(u_map, uv + dx - dy).rgb +
    texture2D(u_map, uv - dx + dy).rgb +
    texture2D(u_map, uv - dx - dy).rgb;
  vec3 blur = (c.rgb * 4.0 + plus * 2.0 + diagonal) / 16.0;

  vec3 detail = c.rgb - blur;
  vec3 outRgb = c.rgb + detail * u_amount * 2.2;

  gl_FragColor = vec4(clamp(outRgb, 0.0, 1.0), 1.0);
}
`

export class EdgeSharpenNode extends SinglePassTexelNode {
  readonly nodeName = 'edge_sharpen'
  protected readonly fragment = FRAG
  protected readonly maxAmount = 1
}
