import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

type ScreenshotShot = {
  id: string
  baseName: string
  section: string
  purpose: string
  viewport: { width: number; height: number }
  preferredFormat: string
  fallbackFormat: string
  minWidth: number
  minHeight: number
  captionKey: string
}

describe('README screenshot manifest', () => {
  it('declares exactly 10 uniquely keyed shots with expected formats', () => {
    const manifestPath = resolve(process.cwd(), 'assets/readme/screenshots/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { shots: ScreenshotShot[] }

    expect(Array.isArray(manifest.shots)).toBe(true)
    expect(manifest.shots).toHaveLength(10)

    const ids = new Set<string>()
    const names = new Set<string>()

    for (const shot of manifest.shots) {
      expect(shot.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(shot.baseName).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(shot.captionKey).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      expect(shot.id.length).toBeGreaterThan(0)
      expect(shot.baseName.length).toBeGreaterThan(0)
      expect(shot.captionKey.length).toBeGreaterThan(0)
      expect(shot.preferredFormat).toBe('webp')
      expect(shot.fallbackFormat).toBe('png')
      expect(shot.viewport.width).toBeGreaterThan(0)
      expect(shot.viewport.height).toBeGreaterThan(0)
      expect(shot.minWidth).toBeGreaterThan(0)
      expect(shot.minHeight).toBeGreaterThan(0)
      expect(ids.has(shot.id)).toBe(false)
      expect(names.has(shot.baseName)).toBe(false)
      ids.add(shot.id)
      names.add(shot.baseName)
    }
  })
})
