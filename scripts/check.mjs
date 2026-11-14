import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readdir, readFile, stat, mkdir, writeFile } from 'node:fs/promises'
import { resolve, dirname, join, relative, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { counterEntry } from './counter-entry.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const base = '/experiments/the-counter/'
const game = resolve(root, '../the-counter/dist')
const files = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    assert(!entry.isSymbolicLink(), `Symlink in build: ${entry.name}`)
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else files.push(relative(dist, path).split(sep).join('/'))
  }
}
await walk(dist)
assert(files.length > 20, 'Build is missing runtime assets')
const foundation = ['index.html', 'experiments/index.html', '404.html', 'site.css', '_headers', 'home.css', 'home.js', 'about/index.html', 'connect/index.html', 'studies/research/index.html', 'studies/design-tool/index.html']
const portfolio = [
  '_redirects', 'robots.txt', 'sitemap.xml', 'site-motion.js',
  'about.css', 'hubs.css', 'projects.css', 'afterimage-essay.css', 'cosmoture-essay.css',
  'lexography-essay.css', 'naraeology-essay.css',
  'archive/index.html', 'archive/visual-studies/studies.css', 'thoughts/index.html', 'wip/index.html',
  ...['beetle-juice', 'breathe', 'disaster-response', 'eat', 'golden-moth', 'iris', 'stax', 'visual-studies']
    .map(slug => 'archive/' + slug + '/index.html'),
  ...['afterimage', 'cosmoture', 'lexography', 'naraeology'].map(slug => 'wip/' + slug + '/index.html'),
  ...['cosmoture', 'naraeology'].map(slug => 'experiments/' + slug + '/index.html'),
  'assets/homepage/gallery-atlas.png', 'assets/homepage/designing-possibilities.jpg',
  ...['afterimage', 'cosmoture', 'lexography', 'lexography-colored-map', 'naraeology', 'the-counter']
    .map(slug => 'assets/homepage/gallery/' + slug + '.jpg'),
  'assets/vendor/anime-4.5.0.min.js', 'assets/vendor/anime-4.5.0-LICENSE.txt',
]
const portfolioArtwork = /^assets\/(?:archive|projects|writing)\/(?:[\w-]+\/)*[\w-]+\.(?:jpg|png|svg|webp)$/
const homepageAssets = [
  ...['landscape.png', 'data.png', 'portal.png', 'lexography-card.png', 'energy.png', 'lexography-feature.png', 'research.png', 'design-tool.png', 'status-dot.svg', 'arrow-wip.svg', 'arrow-external.svg', 'preview-wip.png', 'preview-experiments.png', 'preview-thoughts.png', 'preview-archive.png', 'research-detail.svg', 'design-tool-detail.svg'].map(file => 'assets/homepage/' + file),
  ...['newsreader-semibold.woff2', 'newsreader-italic.woff2', 'ibm-plex-sans-regular.woff2', 'ibm-plex-sans-medium.woff2', 'Newsreader-OFL.txt', 'IBM-Plex-Sans-OFL.txt'].map(file => 'assets/fonts/' + file),
]
for (const file of files) {
  assert(foundation.includes(file) || portfolio.includes(file) || homepageAssets.includes(file) ||
    portfolioArtwork.test(file) || /^experiments\/the-counter\/(index\.html|favicon\.svg|(?:assets|art|audio)\/.+)$/.test(file),
  `Unexpected build file: ${file}`)
  assert(!/(?:^|\/)(?:\.env.*|\.git|pilot-responses|docs|server|src|node_modules)(?:\/|$)|\.(?:map|zip|json|ts|tsx|mjs|pem|key)$/.test(file), `Non-runtime file: ${file}`)
}
for (const required of [...foundation, ...portfolio, ...homepageAssets]) {
  assert(files.includes(required), `Missing ${required}`)
  assert((await stat(join(dist, required))).size > 0, `Empty runtime file: ${required}`)
}

async function localReference(reference, source) {
  if (/^(?:https?:|data:|blob:|mailto:|#)/i.test(reference)) return
  const url = new URL(reference, 'https://local.invalid/' + source)
  let file = decodeURIComponent(url.pathname).replace(/^\//, '')
  if (!file || file.endsWith('/')) file += 'index.html'
  assert(files.includes(file), `Broken reference ${reference} in ${source}`)
}
for (const file of files.filter(file => /\.(html|css)$/.test(file))) {
  const content = await readFile(join(dist, file), 'utf8')
  assert(!content.includes('figma.com/api/mcp/asset/'), `Temporary design asset URL in ${file}`)
  for (const match of content.matchAll(/(?:href|src)=["']([^"']+)["']/g)) await localReference(match[1], file)
  for (const match of content.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^\s)'";]*))\s*\)/g)) await localReference(match[1] ?? match[2] ?? match[3], file)
}
const html = await readFile(join(dist, base.slice(1), 'index.html'), 'utf8')
const bundledReferences = [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(match => match[1])
assert(bundledReferences.filter(path => path.startsWith(base)).length >= 3, 'Missing game entry assets')
assert(bundledReferences.every(path => path.startsWith(base) || path === 'https://markmathew.com' + base),
  'Game entry points escape its subdirectory')
const js = files.filter(file => file.startsWith(base.slice(1) + 'assets/') && file.endsWith('.js'))
assert(js.length > 0, 'Missing compiled application')
const compiled = (await Promise.all(js.map(file => readFile(join(dist, file), 'utf8')))).join('\n')
assert(compiled.includes(base), 'Missing dynamic asset base')
assert(compiled.includes('/experiments/'), 'Missing return navigation')

const manifest = []
for (const file of files.sort()) {
  const path = join(dist, file)
  const buffer = await readFile(path)
  if (file.startsWith(base.slice(1))) {
    const source = await readFile(join(game, file.slice(base.length - 1)))
    const expected = file === base.slice(1) + 'index.html' ? Buffer.from(counterEntry(source.toString('utf8'))) : source
    assert(buffer.equals(expected), `Copied runtime differs from independent game build: ${file}`)
  }
  assert((await stat(path)).size <= 25 * 1024 * 1024, `Asset exceeds 25 MiB: ${file}`)
  manifest.push({ path: file, bytes: buffer.length, sha256: createHash('sha256').update(buffer).digest('hex') })
}
const config = JSON.parse(await readFile(join(root, 'wrangler.jsonc'), 'utf8'))
assert.equal(config.workers_dev, false)
assert.equal(config.preview_urls, false)
assert(!config.routes && !config.route && !config.main && !config.account_id, 'Unexpected deployment target or backend')
assert.equal(config.assets.not_found_handling, '404-page')
await mkdir(join(root, 'release'), { recursive: true })
await writeFile(join(root, 'release/manifest.json'), JSON.stringify({ build: 'local-preview', totalFiles: manifest.length, totalBytes: manifest.reduce((sum, file) => sum + file.bytes, 0), files: manifest }, null, 2) + '\n')
console.log(`PASS: ${manifest.length} runtime files; internal links, nested assets, copy integrity, size limits and local-only configuration checked.`)
console.log('Wrote release/manifest.json. No response data or source files are present in dist.')
