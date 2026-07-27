import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const ROOT = process.cwd()
const MANIFEST_PATH = path.join(ROOT, 'assets/readme/screenshots/manifest.json')
const PNG_DIR = path.join(ROOT, 'assets/readme/screenshots/png')
const WEBP_DIR = path.join(ROOT, 'assets/readme/screenshots/webp')
const README_PATH = path.join(ROOT, 'README.md')

const SHOTS_PER_SECTION = {
  'core-flow': 3,
  'composition-modes': 3,
  'safety-controls': 3,
  'mobile-experience': 1,
}

const ALLOWED_SECTIONS = new Set(Object.keys(SHOTS_PER_SECTION))

const EXPECTED_SHOT_COUNT = Object.values(SHOTS_PER_SECTION).reduce((a, b) => a + b, 0)

function fail(message) {
  throw new Error(message)
}

async function readJson(file) {
  const raw = await fs.readFile(file, 'utf8')
  return JSON.parse(raw)
}

async function fileInfo(file) {
  const stat = await fs.stat(file)
  if (!stat.isFile() || stat.size <= 0) {
    fail(`Invalid file (missing or empty): ${file}`)
  }
  const metadata = await sharp(file).metadata()
  if (!metadata.width || !metadata.height) {
    fail(`Unable to read image dimensions: ${file}`)
  }
  return {
    size: stat.size,
    width: metadata.width,
    height: metadata.height,
  }
}

function validateShotSchema(shot, index) {
  const context = `shots[${index}]`
  validateRequiredShotStrings(shot, context)
  validateShotSection(shot, context)
  validateShotDimensions(shot, context)
  validateShotFormats(shot, context)
}

function validateRequiredShotStrings(shot, context) {
  const requiredStringFields = [
    'id',
    'baseName',
    'section',
    'purpose',
    'preferredFormat',
    'fallbackFormat',
    'captionKey',
  ]
  for (const field of requiredStringFields) {
    if (typeof shot[field] !== 'string' || shot[field].trim().length === 0) {
      fail(`Invalid ${context}.${field}`)
    }
  }
}

function validateShotSection(shot, context) {
  if (!ALLOWED_SECTIONS.has(shot.section)) fail(`Invalid ${context}.section: ${shot.section}`)
}

function validateShotDimensions(shot, context) {
  if (!shot.viewport || typeof shot.viewport !== 'object') {
    fail(`Invalid ${context}.viewport`)
  }

  if (!Number.isInteger(shot.viewport.width) || !Number.isInteger(shot.viewport.height)) {
    fail(`Invalid ${context}.viewport dimensions`)
  }

  if (!Number.isInteger(shot.minWidth) || !Number.isInteger(shot.minHeight)) {
    fail(`Invalid ${context}.min dimensions`)
  }
}

function validateShotFormats(shot, context) {
  if (shot.preferredFormat !== 'webp' || shot.fallbackFormat !== 'png')
    fail(`Invalid ${context} formats: expected preferred=webp fallback=png`)
}

function addUniqueShot(shot, ids, names) {
  if (ids.has(shot.id)) fail(`Duplicate shot id: ${shot.id}`)
  if (names.has(shot.baseName)) fail(`Duplicate shot baseName: ${shot.baseName}`)
  ids.add(shot.id)
  names.add(shot.baseName)
}

function validateShotReferences(shot, readme) {
  if (!readme.includes(`assets/readme/screenshots/webp/${shot.baseName}.webp`))
    fail(`README missing WebP reference for ${shot.baseName}`)
  if (!readme.includes(`assets/readme/screenshots/png/${shot.baseName}.png`))
    fail(`README missing PNG fallback reference for ${shot.baseName}`)
}

function validateMinimumSize(info, shot, format) {
  if (info.width < shot.minWidth || info.height < shot.minHeight) {
    fail(
      `${format} below minimum dimensions for ${shot.baseName}: got ${info.width}x${info.height}`,
    )
  }
}

async function verifyShot(shot, index, ids, names, readme) {
  validateShotSchema(shot, index)
  addUniqueShot(shot, ids, names)
  const pngInfo = await fileInfo(path.join(PNG_DIR, `${shot.baseName}.png`))
  const webpInfo = await fileInfo(path.join(WEBP_DIR, `${shot.baseName}.webp`))
  validateMinimumSize(pngInfo, shot, 'PNG')
  validateMinimumSize(webpInfo, shot, 'WebP')
  validateShotReferences(shot, readme)
}

async function main() {
  const manifest = await readJson(MANIFEST_PATH)
  if (!manifest || !Array.isArray(manifest.shots)) {
    fail('Invalid manifest: shots array missing')
  }
  if (manifest.shots.length !== EXPECTED_SHOT_COUNT) {
    fail(`Expected ${EXPECTED_SHOT_COUNT} screenshot shots, found ${manifest.shots.length}`)
  }

  const ids = new Set()
  const names = new Set()
  const readme = await fs.readFile(README_PATH, 'utf8')

  for (let i = 0; i < manifest.shots.length; i += 1) {
    await verifyShot(manifest.shots[i], i, ids, names, readme)
  }

  console.log(`[screenshots:verify] OK (${manifest.shots.length} shots)`)
}

main().catch((err) => {
  console.error(`[screenshots:verify] FAILED: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
