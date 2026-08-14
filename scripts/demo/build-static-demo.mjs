import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '../..')
const output = resolve(root, 'pages-dist')

await rm(output, { recursive: true, force: true })
await mkdir(resolve(output, 'assets'), { recursive: true })
await mkdir(resolve(output, 'screenshots'), { recursive: true })

await cp(resolve(root, 'demo'), output, { recursive: true })
await cp(
  resolve(root, 'assets/brand/inner-echo-mark.svg'),
  resolve(output, 'assets/inner-echo-mark.svg'),
)
await cp(
  resolve(root, 'assets/brand/inner-echo-favicon.svg'),
  resolve(output, 'assets/inner-echo-favicon.svg'),
)

for (const filename of [
  '01-onboarding.webp',
  '05-symptom-mode.webp',
  '02-hero-active.webp',
  '10-stop-everything-idle.webp',
]) {
  await cp(
    resolve(root, 'assets/readme/screenshots/webp', filename),
    resolve(output, 'screenshots', filename),
  )
}

await writeFile(resolve(output, '.nojekyll'), '')
