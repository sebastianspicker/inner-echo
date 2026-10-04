import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  candidateIdentity,
  createHandoff,
  validateHandoff,
} from '../../tools/deployment/pages-handoff.mjs'

const now = Date.UTC(2026, 8, 6)
const sha = 'a'.repeat(40)
const environment = {
  CANDIDATE_SHA: sha,
  CURRENT_MAIN_SHA: sha,
  CI_RUN_ID: '123',
  CI_RUN_ATTEMPT: '2',
  INNER_ECHO_PAGES_BASE_PATH: '/inner-echo/',
}
let directory: string
beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), 'inner-echo-handoff-'))
  await mkdir(join(directory, 'demo'))
  await Promise.all(
    ['index.html', 'demo/index.html', '.nojekyll', 'THIRD_PARTY_NOTICES.txt'].map((path) =>
      writeFile(join(directory, path), path),
    ),
  )
})
afterEach(async () => rm(directory, { recursive: true, force: true }))

describe('verified Pages handoff', () => {
  it.each([
    ['', '/'],
    ['/', '/'],
    ['/inner-echo', '/inner-echo/'],
    ['/inner-echo/', '/inner-echo/'],
  ])('accepts the unchanged site and normalized base %s', async (base, normalizedBase) => {
    const expected = { ...environment, INNER_ECHO_PAGES_BASE_PATH: base }
    const metadata = await createHandoff(directory, expected, now)
    expect(metadata.basePath).toBe(normalizedBase)
    await expect(
      validateHandoff(metadata, directory, expected, now + 1000),
    ).resolves.toBeUndefined()
  })

  it.each(['sha', 'runId', 'runAttempt', 'basePath', 'version'])(
    'rejects mismatched %s',
    async (key) => {
      const metadata = { ...(await createHandoff(directory, environment, now)), [key]: 'wrong' }
      await expect(validateHandoff(metadata, directory, environment, now)).rejects.toThrow()
    },
  )

  it('rejects stale main and expired or future metadata', async () => {
    const metadata = await createHandoff(directory, environment, now)
    await expect(
      validateHandoff(
        metadata,
        directory,
        { ...environment, CURRENT_MAIN_SHA: 'b'.repeat(40) },
        now,
      ),
    ).rejects.toThrow('Stale')
    for (const timestamp of [now - 1, now + 7 * 24 * 60 * 60 * 1000]) {
      await expect(validateHandoff(metadata, directory, environment, timestamp)).rejects.toThrow(
        'timestamp',
      )
    }
  })

  it('rejects missing identity and malformed expected configuration', async () => {
    await expect(validateHandoff(null, directory, environment, now)).rejects.toThrow('version')
    expect(() => candidateIdentity({ ...environment, CANDIDATE_SHA: '' })).toThrow('SHA')
    expect(() => candidateIdentity({ ...environment, CI_RUN_ATTEMPT: '' })).toThrow('run identity')
    expect(() =>
      candidateIdentity({ CANDIDATE_SHA: sha, CI_RUN_ID: '1', CI_RUN_ATTEMPT: '1' }),
    ).toThrow('base path')
    expect(() => candidateIdentity({ ...environment, INNER_ECHO_PAGES_BASE_PATH: '/../' })).toThrow(
      'base path',
    )
  })

  it.each(['modified', 'added', 'missing', 'symlink'])(
    'rejects %s site content',
    async (change) => {
      const metadata = await createHandoff(directory, environment, now)
      if (change === 'modified') await writeFile(join(directory, 'index.html'), 'modified')
      if (change === 'added') await writeFile(join(directory, 'candidate.json'), '{}')
      if (change === 'missing') await rm(join(directory, 'demo/index.html'))
      if (change === 'symlink')
        await symlink(join(directory, 'index.html'), join(directory, 'linked.html'))
      await expect(validateHandoff(metadata, directory, environment, now)).rejects.toThrow()
    },
  )
})
