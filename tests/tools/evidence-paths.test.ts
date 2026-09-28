import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { writeEvidencePages, type EvidencePageInputs } from '../../tools/docs/evidencePageWriting'

const roots: string[] = []
function fixture(): EvidencePageInputs {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'inner-echo-evidence-'))
  roots.push(root)
  return {
    root,
    dimensions: [],
    profiles: [{ id: 'valid', label: 'Valid' }],
    claimsByKey: new Map(),
    matrixByDim: new Map(),
    sourcesByDim: new Map(),
  }
}
afterEach(() => {
  for (const root of roots.splice(0)) fs.rmSync(root, { recursive: true, force: true })
})

describe('evidence output boundaries', () => {
  it.each([
    '../../outside',
    '/tmp/outside',
    '..\\outside',
    '.',
    '%2e%2e',
    'a'.repeat(65),
  ])('rejects %s before writing any pages', (id) => {
    const input = fixture()
    input.profiles.push({ id, label: 'Invalid' })
    expect(() => writeEvidencePages(input)).toThrow('Invalid evidence page identifier')
    expect(fs.readdirSync(input.root)).toEqual([])
  })

  it('validates motif names as well as profile names before writes', () => {
    const input = fixture()
    input.profiles[0].video_stack = [{ node: '../../outside' }]
    expect(() => writeEvidencePages(input)).toThrow('Invalid evidence page identifier')
    expect(fs.readdirSync(input.root)).toEqual([])
  })

  it.each(['directory', 'file'])('does not follow an existing %s symlink', (kind) => {
    const input = fixture()
    const outside = path.join(input.root, 'outside')
    fs.mkdirSync(outside)
    const target = path.join(outside, 'valid.md')
    fs.writeFileSync(target, 'Keep this content')
    const directory = path.join(input.root, 'docs/references/conditions')
    fs.mkdirSync(path.dirname(directory), { recursive: true })
    if (kind === 'directory') fs.symlinkSync(outside, directory)
    else {
      fs.mkdirSync(directory)
      fs.symlinkSync(target, path.join(directory, 'valid.md'))
    }
    expect(() => writeEvidencePages(input)).toThrow('symbolic links')
    expect(fs.readFileSync(target, 'utf8')).toBe('Keep this content')
    expect(fs.existsSync(path.join(input.root, 'docs/references/motifs'))).toBe(false)
  })

  it('writes valid pages and retains their contents on repeated generation', () => {
    const input = fixture()
    input.profiles[0].video_stack = [{ node: 'color_grade' }]
    expect(writeEvidencePages(input)).toBe(1)
    const file = path.join(input.root, 'docs/references/conditions/valid.md')
    const before = fs.statSync(file).mtimeMs
    expect(fs.readFileSync(file, 'utf8')).toContain('Valid')
    expect(writeEvidencePages(input)).toBe(1)
    expect(fs.statSync(file).mtimeMs).toBe(before)
  })
})
