import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'

// Deliberately fixed to the loopback preview; this script never probes a public host.
const origin = 'http://127.0.0.1:8787'
const manifest = JSON.parse(await readFile(new URL('../release/manifest.json', import.meta.url), 'utf8'))
for (const file of manifest.files) {
  if (file.path === '_headers' || file.path === '404.html') continue
  let path = '/' + file.path
  if (path.endsWith('/index.html')) path = path.slice(0, -10)
  const response = await fetch(origin + path, { signal: AbortSignal.timeout(8000) })
  assert.equal(response.status, 200, path)
  const content = Buffer.from(await response.arrayBuffer())
  assert.equal(createHash('sha256').update(content).digest('hex'), file.sha256, path + ' integrity')
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff', path + ' headers')
  if (file.path.endsWith('.webp')) assert(response.headers.get('content-type')?.includes('image/webp'), path)
  if (file.path.endsWith('.wav')) assert(response.headers.get('content-type')?.includes('audio/'), path)
  if (/\/assets\/.*\.(js|css)$/.test(path)) assert(response.headers.get('cache-control')?.includes('immutable'), path)
}
for (const path of ['/experiments', '/experiments/the-counter']) {
  const response = await fetch(origin + path + '?mode=pilot', { redirect: 'manual' })
  assert([301, 307, 308].includes(response.status), path + ' redirect')
  assert.equal(new URL(response.headers.get('location'), origin).pathname, path + '/')
  assert.equal(new URL(response.headers.get('location'), origin).search, '?mode=pilot')
}
const pilot = await fetch(origin + '/experiments/the-counter/?mode=pilot')
assert.equal(pilot.status, 200)
for (const path of ['/missing-page', '/experiments/the-counter/missing.js', '/api/shift-responses', '/pilot-responses/', '/experiments/the-counter/pilot-responses/', '/.env', '/src/App.tsx', '/_headers']) {
  const response = await fetch(origin + path)
  assert.equal(response.status, 404, path + ' should not be served')
}
console.log('PASS: every served runtime file matches its manifest; artwork/audio MIME types, headers, query-preserving redirects, pilot entry and real 404 responses verified.')
