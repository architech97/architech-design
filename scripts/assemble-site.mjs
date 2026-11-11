import { copyFile, cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
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
  '.nojekyll', 'CNAME', '404.html', 'portal.css', 'chrome.css', 'portfolio.css',
  'robots.txt', 'favicon.ico',
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

// Further Design projects live in projects/<slug>/ and are published at /design/<slug>/.
if (await stat(join(root, 'projects')).catch(() => null)) {
  await cp(join(root, 'projects'), join(output, 'design'), { recursive: true, filter: copyPublic })
}

const sitemap = ['/', '/design/', '/automation/', '/automation/plugins/', '/automation/demos/', '/automation/coverage/', '/automation/connect/']
for (const group of ['plugins', 'demos']) {
  const directory = join(output, 'automation', group)
  const routes = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isDirectory())
  if (routes.length === 0) throw new Error(`Automation emitted no ${group} routes.`)
  sitemap.push(...routes.map(entry => `/automation/${group}/${entry.name}/`))
  console.log(`Mounted ${routes.length} Automation ${group} at /automation/${group}/`)
}

// The sitemap lists exactly the routes that were assembled, so it cannot drift from the build.
const urls = sitemap.map(path => `  <url><loc>https://architechdesign.in${path}</loc></url>`)
await writeFile(join(output, 'sitemap.xml'), ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">', ...urls, '</urlset>', ''].join('\n'))
console.log(`Wrote sitemap.xml with ${sitemap.length} URLs`)
