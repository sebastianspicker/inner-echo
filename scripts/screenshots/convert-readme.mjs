import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, 'assets/readme/screenshots/manifest.json')
const PNG_DIR = path.join(ROOT, 'assets/readme/screenshots/png')
const WEBP_DIR = path.join(ROOT, 'assets/readme/screenshots/webp')

async function readManifest() {
  const raw = await fs.readFile(MANIFEST_PATH, 'utf8')
  const parsed = JSON.parse(raw)
  if (!parsed || !Array.isArray(parsed.shots)) {
    throw new Error('Invalid screenshot manifest: missing shots array')
  }
  return parsed
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function convertShot(baseName) {
  const pngPath = path.join(PNG_DIR, `${baseName}.png`)
  const webpPath = path.join(WEBP_DIR, `${baseName}.webp`)

  await fs.access(pngPath)
  await sharp(pngPath).webp({ quality: 84, effort: 6 }).toFile(webpPath)

  const stat = await fs.stat(webpPath)
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`Failed to write non-empty WebP file: ${webpPath}`)
  }
}

async function main() {
  const manifest = await readManifest()
  await ensureDir(WEBP_DIR)

  for (const shot of manifest.shots) {
    if (!shot.baseName || typeof shot.baseName !== 'string') {
      throw new Error('Invalid shot entry: missing baseName')
    }
    await convertShot(shot.baseName)
  }

  console.log(`[screenshots:convert] OK (${manifest.shots.length} files)`)
}

main().catch((err) => {
  console.error(`[screenshots:convert] FAILED: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
