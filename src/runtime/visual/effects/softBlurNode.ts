/**
 * Soft blur: a 13-tap, two-ring disc blur whose radius follows `amount`.
 *
 * The rings are rotated per pixel with a hash so the small kernel reads as a smooth
 * softening rather than a visible ring pattern. `amount` 0.35 (the declared maximum) is a
 * radius of about 1.4% of the frame height.
 */

import { SinglePassTexelNode } from './singlePassTexelNode'

const FRAG = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
uniform float u_amount;
uniform vec2 u_texelSize;
varying vec2 vUv;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUv * u_uvScale + u_uvOffset;
  vec4 center = texture2D(u_map, uv);
  float r = u_amount * 0.04;
  if (r <= 0.0) {
    gl_FragColor = center;
    return;
  }

  // Keep the disc circular on screen: UV x is squeezed by the aspect ratio.
  vec2 radius = vec2(r * u_texelSize.x / u_texelSize.y, r);
  float rotation = rand(vUv) * 6.2831853;

  vec4 sum = center;
  float weight = 1.0;
  for (int i = 0; i < 6; i++) {
    float a = rotation + float(i) * 1.0471976;
    vec2 inner = vec2(cos(a), sin(a)) * radius * 0.5;
    vec2 outer = vec2(cos(a + 0.5235988), sin(a + 0.5235988)) * radius;
    sum += texture2D(u_map, uv + inner);
    sum += 0.7 * texture2D(u_map, uv + outer);
    weight += 1.7;
  }

  gl_FragColor = clamp(sum / weight, 0.0, 1.0);
}
`

export class SoftBlurNode extends SinglePassTexelNode {
  readonly nodeName = 'soft_blur'
  protected readonly fragment = FRAG
  protected readonly maxAmount = 0.35
}
