import { createHash } from 'node:crypto'
import { readdir, readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getPagesBasePath } from './pages-config.mjs'

const maxAgeMs = 7 * 24 * 60 * 60 * 1000

export function candidateIdentity(environment) {
  const { CANDIDATE_SHA: sha, CI_RUN_ID: runId, CI_RUN_ATTEMPT: runAttempt } = environment
  if (!/^[a-f0-9]{40}$/.test(sha ?? '')) throw new Error('Invalid candidate SHA')
  if (![runId, runAttempt].every((value) => /^[1-9]\d*$/.test(value ?? ''))) {
    throw new Error('Invalid CI run identity')
  }
  if (!Object.hasOwn(environment, 'INNER_ECHO_PAGES_BASE_PATH')) {
    throw new Error('Missing Pages base path')
  }
  return { sha, runId, runAttempt, basePath: getPagesBasePath(environment) }
}

export async function siteDigest(directory) {
  const hash = createHash('sha256')
  async function visit(prefix) {
    const entries = await readdir(resolve(directory, prefix), { withFileTypes: true })
    entries.sort((left, right) => left.name.localeCompare(right.name, 'en'))
    for (const entry of entries) {
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.isDirectory()) await visit(path)
      else if (entry.isFile()) {
        const contents = await readFile(resolve(directory, path))
        hash.update(JSON.stringify([path, contents.length]))
        hash.update(contents)
      } else throw new Error(`Unsupported site entry: ${path}`)
    }
  }
  await visit('')
  return hash.digest('hex')
}

export async function createHandoff(directory, environment, now = Date.now()) {
  for (const required of [
    'index.html',
    'demo/index.html',
    '.nojekyll',
    'THIRD_PARTY_NOTICES.txt',
  ]) {
    await readFile(resolve(directory, required))
  }
  return {
    version: 1,
    ...candidateIdentity(environment),
    createdAt: now,
    siteSha256: await siteDigest(directory),
  }
}

export async function validateHandoff(metadata, directory, environment, now = Date.now()) {
  const expected = candidateIdentity(environment)
  if (metadata?.version !== 1) throw new Error('Unsupported Pages handoff version')
  for (const [key, value] of Object.entries(expected)) {
    if (metadata[key] !== value) throw new Error(`Pages handoff mismatch: ${key}`)
  }
  if (environment.CURRENT_MAIN_SHA !== expected.sha) throw new Error('Stale Pages candidate')
  const age = now - metadata.createdAt
  if (!Number.isFinite(age) || age < 0 || age >= maxAgeMs) {
    throw new Error('Expired or invalid Pages handoff timestamp')
  }
  const actual = await createHandoff(directory, environment, now)
  if (metadata.siteSha256 !== actual.siteSha256) throw new Error('Pages site digest mismatch')
}
