import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const requireDist = process.argv.includes('--require-dist')
const noticePath = path.join(root, 'public', 'THIRD_PARTY_NOTICES.txt')

const entries = [
  {
    name: 'dompurify',
    version: '3.4.13',
    license: '(MPL-2.0 OR Apache-2.0)',
    source: 'node_modules/dompurify/LICENSE',
    published: 'third-party-licenses/dompurify-3.4.13-Apache-2.0.txt',
  },
  {
    name: '@types/trusted-types',
    version: '2.0.7',
    license: 'MIT',
    source: 'node_modules/@types/trusted-types/LICENSE',
    published: 'third-party-licenses/types-trusted-types-2.0.7-MIT.txt',
  },
  {
    name: 'marked',
    version: '17.0.5',
    license: 'MIT',
    source: 'node_modules/marked/LICENSE.md',
    published: 'third-party-licenses/marked-17.0.5.txt',
  },
  {
    name: 'react',
    version: '19.2.4',
    license: 'MIT',
    source: 'node_modules/react/LICENSE',
    published: 'third-party-licenses/react-19.2.4-MIT.txt',
  },
  {
    name: 'react-dom',
    version: '19.2.4',
    license: 'MIT',
    source: 'node_modules/react-dom/LICENSE',
    published: 'third-party-licenses/react-dom-19.2.4-MIT.txt',
  },
  {
    name: 'scheduler',
    version: '0.27.0',
    license: 'MIT',
    source: 'node_modules/scheduler/LICENSE',
    published: 'third-party-licenses/scheduler-0.27.0-MIT.txt',
  },
  {
    name: 'three',
    version: '0.183.2',
    license: 'MIT',
    source: 'node_modules/three/LICENSE',
    published: 'third-party-licenses/three-0.183.2-MIT.txt',
  },
  {
    name: 'zod',
    version: '4.3.6',
    license: 'MIT',
    source: 'node_modules/zod/LICENSE',
    published: 'third-party-licenses/zod-4.3.6-MIT.txt',
  },
]

function read(filePath) {
  return fs.readFileSync(path.join(root, filePath))
}

function packageMetadata(name) {
  return JSON.parse(read(`node_modules/${name}/package.json`).toString('utf8'))
}

const notice = fs.readFileSync(noticePath, 'utf8')
const failures = []

for (const entry of entries) {
  const metadata = packageMetadata(entry.name)
  if (metadata.version !== entry.version) {
    failures.push(`${entry.name}: expected version ${entry.version}, found ${metadata.version}`)
  }
  if (metadata.license !== entry.license) {
    failures.push(`${entry.name}: expected license ${entry.license}, found ${metadata.license}`)
  }
  if (!notice.toLowerCase().includes(`${entry.name} ${entry.version}`.toLowerCase())) {
    failures.push(`${entry.name}: version is missing from public/THIRD_PARTY_NOTICES.txt`)
  }
  if (!notice.includes(entry.published)) {
    failures.push(`${entry.name}: license path is missing from public/THIRD_PARTY_NOTICES.txt`)
  }

  const installedLicense = read(entry.source)
  const publishedLicense = read(`public/${entry.published}`)
  if (!installedLicense.equals(publishedLicense)) {
    failures.push(`${entry.name}: published license text differs from the installed package`)
  }

  if (requireDist) {
    const distributedLicense = read(`dist/${entry.published}`)
    if (!publishedLicense.equals(distributedLicense)) {
      failures.push(`${entry.name}: dist license text differs from the public source`)
    }
  }
}

if (requireDist) {
  const distributedNotice = read('dist/THIRD_PARTY_NOTICES.txt')
  if (!fs.readFileSync(noticePath).equals(distributedNotice)) {
    failures.push('dist/THIRD_PARTY_NOTICES.txt differs from the public source')
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`[notices:verify] ${failure}`)
  process.exit(1)
}

console.log(
  `[notices:verify] OK (${entries.length} packages${requireDist ? ', dist included' : ''})`,
)
