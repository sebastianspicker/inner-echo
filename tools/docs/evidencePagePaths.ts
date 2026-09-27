import fs from 'node:fs'
import path from 'node:path'

/** Output names come from bundled data, which is still untrusted generator input. */
export function evidencePagePath(directory: string, id: string): string {
  if (!/^[a-z0-9_-]{1,64}$/i.test(id)) {
    throw new Error(`Invalid evidence page identifier: ${JSON.stringify(id)}`)
  }
  return path.join(directory, `${id}.md`)
}

/** Preflight every destination before generation can overwrite an existing page. */
export function validateEvidenceDestinations(root: string, destinations: string[]) {
  const resolvedRoot = path.resolve(root)
  for (const destination of destinations) {
    const relative = path.relative(resolvedRoot, path.resolve(destination))
    if (relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative)) {
      throw new Error('Evidence destination escapes the repository')
    }
    let current = resolvedRoot
    for (const component of relative.split(path.sep)) {
      current = path.join(current, component)
      const stat = fs.lstatSync(current, { throwIfNoEntry: false })
      if (stat?.isSymbolicLink()) {
        throw new Error('Evidence destinations must not follow symbolic links')
      }
    }
  }
}
