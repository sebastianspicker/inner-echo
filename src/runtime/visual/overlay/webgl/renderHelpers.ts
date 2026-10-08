import {
  PlaneGeometry,
  ShaderMaterial,
  Vector2,
  type Camera,
  type Material,
  type Mesh,
  type Object3D,
  type Scene,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three'

function isMesh(obj: Object3D | undefined): obj is Mesh {
  return obj != null && 'isMesh' in obj && (obj as Mesh).isMesh === true
}

export function toNodeName(value: unknown): string {
  if (!value || typeof value !== 'object') return 'unknown'
  const explicitName = (value as { nodeName?: string }).nodeName
  if (explicitName) return explicitName
  const ctor = (value as { constructor?: { name?: string } }).constructor?.name
  if (!ctor) return 'unknown'
  return ctor
    .replace(/Node$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase()
}

// Kept local (not imported from the effects package) so the overlay chunk never pulls the lazy
// visual graph closure into itself; `npm run bundle:verify` enforces that boundary.
const COVER_FIT_VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const COVER_FIT_FRAGMENT = `
uniform sampler2D u_map;
uniform vec2 u_uvScale;
uniform vec2 u_uvOffset;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(u_map, vUv * u_uvScale + u_uvOffset);
}
`

/**
 * Source material: samples the camera texture with cover-fit cropping (CSS `object-fit: cover`
 * semantics). This is the only place the chain crops; every effect node then works in the
 * already-fitted frame, so the crop is applied exactly once however long the chain is.
 */
export function createPassthroughMaterial(inputTexture: Texture): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      u_map: { value: inputTexture },
      u_uvScale: { value: new Vector2(1, 1) },
      u_uvOffset: { value: new Vector2(0, 0) },
    },
    vertexShader: COVER_FIT_VERTEX,
    fragmentShader: COVER_FIT_FRAGMENT,
    depthWrite: false,
    depthTest: false,
  })
}

const BLIT_FRAGMENT = `
uniform sampler2D u_map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(u_map, vUv);
}
`

/**
 * Final blit: copies the chain output to the canvas. A plain `ShaderMaterial` keeps the program
 * independent of the bound texture, so swapping `u_map` never forces a recompile.
 */
export function createBlitMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: { u_map: { value: null } },
    vertexShader: COVER_FIT_VERTEX,
    fragmentShader: BLIT_FRAGMENT,
    depthWrite: false,
    depthTest: false,
  })
}

/** Write the cover-fit crop into the source material; tolerates materials without the uniforms. */
export function writeCoverFit(
  material: Material,
  scale: readonly [number, number],
  offset: readonly [number, number],
): void {
  const uniforms = (material as Partial<ShaderMaterial>).uniforms
  const scaleUniform = uniforms?.u_uvScale?.value
  const offsetUniform = uniforms?.u_uvOffset?.value
  if (scaleUniform instanceof Vector2) scaleUniform.set(scale[0], scale[1])
  if (offsetUniform instanceof Vector2) offsetUniform.set(offset[0], offset[1])
}

/** Fullscreen quad geometry (shared). */
export function getQuadGeometry(): PlaneGeometry {
  return new PlaneGeometry(2, 2)
}

/** Render a quad with the given material to the given target (or null = screen). */
export function renderQuad(
  renderer: WebGLRenderer,
  scene: Scene,
  camera: Camera,
  material: Material,
  target: WebGLRenderTarget | null,
): void {
  const child = scene.children[0]
  if (!isMesh(child)) return
  child.material = material
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
}
