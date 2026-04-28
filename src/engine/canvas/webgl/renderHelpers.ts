import {
  MeshBasicMaterial,
  PlaneGeometry,
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

/** Passthrough material: displays input texture with no effect. */
export function createPassthroughMaterial(inputTexture: Texture): Material {
  return new MeshBasicMaterial({
    map: inputTexture,
    depthWrite: false,
  })
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
