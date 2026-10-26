import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const runtime = join(root, 'staging-dist')
const original = JSON.parse(await readFile(join(root, 'release/manifest.json'), 'utf8'))
const production = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'))
const staging = JSON.parse(await readFile(join(root, 'wrangler.staging.jsonc'), 'utf8'))
assert.equal(production.workers_dev, false)
assert.equal(production.preview_urls, false)
assert.equal(staging.name, 'markmathew-site-review')
assert.equal(staging.workers_dev, false)
assert.equal(staging.preview_urls, false)
assert.equal(staging.assets.directory, './staging-dist')
assert.deepEqual(staging.previews, { observability: { enabled: false } })
for (const config of [production, staging]) {
  assert.deepEqual(Object.keys(config).filter(key => !['$schema', 'name', 'compatibility_date', 'send_metrics', 'workers_dev', 'preview_urls', 'assets', 'previews'].includes(key)), [], 'Unexpected binding, route or production target')
  assert.equal(config.assets.not_found_handling, '404-page')
  assert(!config.assets.binding, 'No backend or submission binding is permitted')
}

const paths = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), 'Staging cannot contain symlinks')
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else paths.push(relative(runtime, path).split(sep).join('/'))
  }
}
await walk(runtime)
assert.deepEqual(paths.sort(), original.files.map(file => file.path).sort(), 'Staging file allowlist differs from verified runtime')
const headers = await readFile(join(runtime, '_headers'), 'utf8')
assert(headers.includes('X-Robots-Tag: noindex, nofollow, noarchive'))
const manifest = []
for (const file of original.files) {
  const content = await readFile(join(runtime, file.path))
  const hash = createHash('sha256').update(content).digest('hex')
  if (file.path === '_headers') {
    const source = await readFile(join(root, 'dist/_headers'), 'utf8')
    assert.equal(content.toString(), source + '\n/*\n  X-Robots-Tag: noindex, nofollow, noarchive\n')
  } else assert.equal(hash, file.sha256, 'Unapproved runtime change: ' + file.path)
  if (file.path.endsWith('.html')) assert(!content.toString().includes('https://notes.markmathew.com'), 'Unverified Notes destination in staging')
  manifest.push({ path: file.path, bytes: content.length, sha256: hash })
}
await writeFile(join(root, 'release/staging-manifest.json'), JSON.stringify({ build: 'hosted-staging-candidate', worker: staging.name, previewName: 'review-20261025', access: 'REQUIRED — owner declined public staging. Preview URLs stay disabled until Access protection is verified.', totalFiles: manifest.length, totalBytes: manifest.reduce((n, file) => n + file.bytes, 0), files: manifest }, null, 2) + '\n')
console.log(`PASS: ${manifest.length} staging files. Game bytes match the verified build; noindex is the only staging overlay. Production URL settings remain disabled.`)
console.log('This validation performs no upload. Local URL defaults remain disabled; verify remote Access before enabling review URLs.')
