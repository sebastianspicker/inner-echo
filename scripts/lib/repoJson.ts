import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parseFirstJsonObject } from '../../src/utils/jsonObjectParser'

export function loadRepoJson<T>(rootDir: string, pathFromRoot: string): T {
  return parseFirstJsonObject<T>(readFileSync(join(rootDir, pathFromRoot), 'utf-8'))
}
