// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import { loadEvidenceDoc, type EvidenceDocPath } from '../src/evidence/docs'

describe('evidence document lookup', () => {
  it.each([
    '../README.md',
    'docs/references/../REFERENCES_AUDIT.md',
    'docs/references/a/../../README.md',
    'docs/references/file.md?raw',
  ])('rejects invalid repository-relative path %s', async (path) => {
    await expect(loadEvidenceDoc(path as EvidenceDocPath)).resolves.toBeNull()
  })
})
