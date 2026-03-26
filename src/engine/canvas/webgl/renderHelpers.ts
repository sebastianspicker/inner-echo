import * as THREE from 'three'

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
export function createPassthroughMaterial(inputTexture: THREE.Texture): THREE.Material {
  return new THREE.MeshBasicMaterial({
    map: inputTexture,
    depthWrite: false,
  })
}

/** Fullscreen quad geometry (shared). */
export function getQuadGeometry(): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(2, 2)
}

/** Render a quad with the given material to the given target (or null = screen). */
export function renderQuad(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  material: THREE.Material,
  target: THREE.WebGLRenderTarget | null
): void {
  const mesh = scene.children[0] as THREE.Mesh
  mesh.material = material
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
}
