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
function isSafeIdentifier(value) {
  if (value.length === 0 || value.startsWith('-') || value.endsWith('-')) return false
  let previousWasSeparator = false
  for (const character of value) {
    if (character === '-') {
      if (previousWasSeparator) return false
      previousWasSeparator = true
      continue
    }
    const code = character.charCodeAt(0)
    const isLowercaseLetter = code >= 97 && code <= 122
    const isDigit = code >= 48 && code <= 57
    if (!isLowercaseLetter && !isDigit) return false
    previousWasSeparator = false
  }
  return true
}

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
  for (const field of ['id', 'baseName', 'captionKey']) {
    if (!isSafeIdentifier(shot[field])) fail(`Invalid ${context}.${field} identifier`)
  }

  if (!ALLOWED_SECTIONS.has(shot.section)) {
    fail(`Invalid ${context}.section: ${shot.section}`)
  }

  if (!shot.viewport || typeof shot.viewport !== 'object') {
    fail(`Invalid ${context}.viewport`)
  }

  if (!Number.isInteger(shot.viewport.width) || !Number.isInteger(shot.viewport.height)) {
    fail(`Invalid ${context}.viewport dimensions`)
  }

  if (!Number.isInteger(shot.minWidth) || !Number.isInteger(shot.minHeight)) {
    fail(`Invalid ${context}.min dimensions`)
  }

  if (shot.preferredFormat !== 'webp' || shot.fallbackFormat !== 'png') {
    fail(`Invalid ${context} formats: expected preferred=webp fallback=png`)
  }
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
    const shot = manifest.shots[i]
    validateShotSchema(shot, i)

    if (ids.has(shot.id)) fail(`Duplicate shot id: ${shot.id}`)
    if (names.has(shot.baseName)) fail(`Duplicate shot baseName: ${shot.baseName}`)
    ids.add(shot.id)
    names.add(shot.baseName)

    const pngPath = path.resolve(PNG_DIR, `${shot.baseName}.png`)
    const webpPath = path.resolve(WEBP_DIR, `${shot.baseName}.webp`)
    if (
      !pngPath.startsWith(`${PNG_DIR}${path.sep}`) ||
      !webpPath.startsWith(`${WEBP_DIR}${path.sep}`)
    ) {
      fail(`Screenshot path escapes repository asset directories: ${shot.baseName}`)
    }

    const pngInfo = await fileInfo(pngPath)
    const webpInfo = await fileInfo(webpPath)

    if (pngInfo.width < shot.minWidth || pngInfo.height < shot.minHeight) {
      fail(
        `PNG below minimum dimensions for ${shot.baseName}: got ${pngInfo.width}x${pngInfo.height}`,
      )
    }
    if (webpInfo.width < shot.minWidth || webpInfo.height < shot.minHeight) {
      fail(
        `WebP below minimum dimensions for ${shot.baseName}: got ${webpInfo.width}x${webpInfo.height}`,
      )
    }

    if (!readme.includes(`assets/readme/screenshots/webp/${shot.baseName}.webp`)) {
      fail(`README missing WebP reference for ${shot.baseName}`)
    }
    if (!readme.includes(`assets/readme/screenshots/png/${shot.baseName}.png`)) {
      fail(`README missing PNG fallback reference for ${shot.baseName}`)
    }
  }

  console.log(`[screenshots:verify] OK (${manifest.shots.length} shots)`)
}

main().catch((err) => {
  console.error(`[screenshots:verify] FAILED: ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})
