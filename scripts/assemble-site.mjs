import { copyFile, cp, mkdir, readFile, readdir } from 'node:fs/promises'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const [distPath, outputPath] = process.argv.slice(2)
if (!distPath || !outputPath) {
  throw new Error('Usage: node scripts/assemble-site.mjs <automation-dist> <new-output-directory>')
}

const root = fileURLToPath(new URL('../', import.meta.url))
const dist = resolve(distPath)
const output = resolve(outputPath)
const publicDesign = [
  '.nojekyll', 'CNAME', '404.html', 'portal.css',
  'assets', 'img', 'rooms.json', 'hero.js', 'main.js', 'scene.js',
  'style.css', 'style.logo-theme-v2.css', 'style.original-logo-v3.css',
  'architech-model.glb', 'architech-model-lite.glb',
  'drawing-0.jpg', 'drawing-ground.jpg', 'drawing-ground-lite.jpg',
  'plan-render-0.jpg', 'plan-render-1.jpg', 'plan-render-2.jpg',
]
const copyPublic = path => basename(path).toLowerCase() !== 'desktop.ini'

const automationShell = await readFile(join(dist, 'index.html'), 'utf8')
if (!automationShell.includes('src="/automation/assets/') || automationShell.includes('noindex')) {
  throw new Error('Build Automation with BASE=/automation/ before assembling the site.')
}

// Require a fresh output directory so no stale or unrelated files can be published.
await mkdir(output)
await mkdir(join(output, 'design'))
await Promise.all([
  ...publicDesign.map(name => cp(join(root, name), join(output, name), { recursive: true, filter: copyPublic })),
  copyFile(join(root, 'portal.html'), join(output, 'index.html')),
  copyFile(join(root, 'index.html'), join(output, 'design', 'index.html')),
  cp(dist, join(output, 'automation'), {
    recursive: true,
    filter: path => path !== join(dist, '404.html') && copyPublic(path),
  }),
])

for (const group of ['plugins', 'demos']) {
  const directory = join(output, 'automation', group)
  const routes = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isDirectory())
  if (routes.length === 0) throw new Error(`Automation emitted no ${group} routes.`)
  console.log(`Mounted ${routes.length} Automation ${group} at /automation/${group}/`)
}
