/**
 * Shared GLSL helpers for effect fragment shaders. Concatenate them into a shader with
 * template literals; `DISC_BLUR_GLSL` requires `HASH_GLSL` before it.
 */

/** Cheap per-pixel hash in 0..1, used to rotate sampling kernels. */
export const HASH_GLSL = `
float ieHash(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}
`

/**
 * 13-tap, two-ring disc blur (centre, six inner taps at half radius, six outer taps at
 * 0.7 weight), rotated per pixel. `radius` is in UV units of the vertical axis; the x extent
 * is squeezed by the aspect ratio so the disc stays circular on screen.
 */
export const DISC_BLUR_GLSL = `
vec3 ieDiscBlur(sampler2D map, vec2 uv, vec2 seed, float radius, vec2 texelSize) {
  vec3 center = texture2D(map, uv).rgb;
  if (radius <= 0.0) return center;

  vec2 r = vec2(radius * texelSize.x / texelSize.y, radius);
  float rotation = ieHash(seed) * 6.2831853;

  // One trig pair per pixel: step the unit direction by 60 degrees with a constant rotation,
  // and offset the outer ring from the inner one by 30 degrees.
  vec2 dir = vec2(cos(rotation), sin(rotation));
  vec3 sum = center;
  float weight = 1.0;
  for (int i = 0; i < 6; i++) {
    vec2 inner = dir * r * 0.5;
    vec2 outer = vec2(dir.x * 0.8660254 - dir.y * 0.5, dir.y * 0.8660254 + dir.x * 0.5) * r;
    dir = vec2(dir.x * 0.5 - dir.y * 0.8660254, dir.y * 0.5 + dir.x * 0.8660254);
    sum += texture2D(map, uv + inner).rgb;
    sum += 0.7 * texture2D(map, uv + outer).rgb;
    weight += 1.7;
  }
  return clamp(sum / weight, 0.0, 1.0);
}
`

/**
 * Signed per-pixel dither in -0.5..0.5, re-drawn every frame through `seed` (requires
 * `HASH_GLSL`). Scaled by 1/255 and added before quantisation, it keeps an 8-bit history
 * target from rounding a slowly fading ghost back to itself.
 */
export const TEMPORAL_DITHER_GLSL = `
float ieDither(vec2 uv, float seed) {
  return ieHash(uv + seed) - 0.5;
}
`

/**
 * Aspect-corrected distance from the frame centre, normalised so the frame corners sit at
 * 1.0 on any stage shape.
 */
export const RADIAL_GLSL = `
float ieRadialDistance(vec2 p, vec2 texelSize) {
  vec2 c = (p - 0.5) * vec2(texelSize.y / texelSize.x, 1.0);
  return length(c) / (0.5 * length(vec2(texelSize.y / texelSize.x, 1.0)));
}
`
