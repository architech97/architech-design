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
  '.nojekyll', 'CNAME', '404.html', 'portal.css', 'chrome.css', 'portfolio.css', 'plain.css', 'privacy',
  'robots.txt', 'favicon.ico',
  'assets', 'img', 'rooms.json', 'hero.js', 'main.js', 'scene.js',
  'style.css', 'style.logo-theme-v2.css', 'style.original-logo-v3.css',
  'architech-model.glb', 'architech-model-lite.glb',
  'drawing-0.jpg', 'drawing-ground.jpg', 'drawing-ground-lite.jpg',
  'plan-render-0.jpg', 'plan-render-1.jpg', 'plan-render-2.jpg',
]
const copyPublic = path => basename(path).toLowerCase() !== 'desktop.ini'

// The numbers published on Home when the Automation build has no stats.json (the pinned 1239129 does not).
const FALLBACK_COUNTS = {
  products: 69,
  revitTools: 58,
  suiteHomes: 3,
  utilities: 1,
  desktopApps: 2,
  connectors: 5,
}
const COUNT_KEYS = Object.keys(FALLBACK_COUNTS)
const NUMBER_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']

const countWord = (value) => NUMBER_WORDS[value] ?? String(value)
const plural = (value, singular, pluralName) => `${countWord(value)} ${value === 1 ? singular : pluralName}`
const describe = (counts) => `${counts.revitTools} Revit add-ins, ${counts.desktopApps} desktop apps, ${counts.connectors} AI connectors, ${counts.products} products`

function homePhrases(counts) {
  const desktopAppsPhrase = plural(counts.desktopApps, 'desktop app', 'desktop apps')
  const groupPhrase = counts.suiteHomes === 3 && counts.utilities === 1
    ? 'the suite home windows, a point-cloud toggle'
    : `${counts.suiteHomes === 1 ? '1 suite home window' : `${counts.suiteHomes} suite home windows`}, ${counts.utilities === 1 ? 'a point-cloud toggle' : `${counts.utilities} utilities`}`
  return {
    revitTools: String(counts.revitTools),
    desktopApps: String(counts.desktopApps),
    connectors: String(counts.connectors),
    products: String(counts.products),
    desktopAppsPhrase,
    connectorsPhrase: plural(counts.connectors, 'AI connector', 'AI connectors'),
    applicationsPhrase: plural(counts.connectors, 'design application', 'design applications'),
    // The parenthetical names the two desktop apps. It stays only while that count is still two.
    desktopDetail: counts.desktopApps === 2
      ? `${desktopAppsPhrase} (one turns a photo into a Revit family, one is an assistant for the open model)`
      : desktopAppsPhrase,
    groupPhrase,
  }
}

function applyHomeCounts(html, counts) {
  const phrases = homePhrases(counts)
  const filled = html.replace(/\{\{([a-zA-Z]+)\}\}/g, (token, key) => {
    if (!Object.hasOwn(phrases, key)) throw new Error(`Unknown Home count token ${token}`)
    return phrases[key]
  })
  if (filled.includes('{{')) throw new Error('A Home count token was left in portal.html.')
  return filled
}

async function homeCounts(distPath) {
  const file = join(distPath, 'stats.json')
  let raw
  try {
    raw = await readFile(file, 'utf8')
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      console.warn(`Home counts: ${file} is missing. Using the hard-coded fallback (${describe(FALLBACK_COUNTS)}).`)
      return FALLBACK_COUNTS
    }
    throw error
  }
  try {
    const parsed = JSON.parse(raw)
    const counts = {}
    for (const key of COUNT_KEYS) {
      const value = parsed[key]
      if (!Number.isInteger(value) || value < 0) throw new Error(`${key} is not a non-negative integer`)
      counts[key] = value
    }
    const sum = counts.revitTools + counts.suiteHomes + counts.utilities + counts.desktopApps + counts.connectors
    if (sum !== counts.products) throw new Error(`groups sum to ${sum}, products is ${counts.products}`)
    if (parsed.productsWithoutDialogs != null && !Array.isArray(parsed.productsWithoutDialogs)) {
      throw new Error('productsWithoutDialogs is not a list')
    }
    console.log(`Home counts: injected from ${file} (${describe(counts)}).`)
    return counts
  } catch (error) {
    console.warn(`Home counts: ${file} could not be used (${error.message}). Using the hard-coded fallback (${describe(FALLBACK_COUNTS)}).`)
    return FALLBACK_COUNTS
  }
}

const automationShell = await readFile(join(dist, 'index.html'), 'utf8')
if (!automationShell.includes('src="/automation/assets/') || automationShell.includes('noindex')) {
  throw new Error('Build Automation with BASE=/automation/ before assembling the site.')
}

// Require a fresh output directory so no stale or unrelated files can be published.
const homeHtml = applyHomeCounts(await readFile(join(root, 'portal.html'), 'utf8'), await homeCounts(dist))

await mkdir(output)
await mkdir(join(output, 'design'))
await Promise.all([
  ...publicDesign.map(name => cp(join(root, name), join(output, name), { recursive: true, filter: copyPublic })),
  writeFile(join(output, 'index.html'), homeHtml),
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

const sitemap = ['/', '/design/', '/privacy/', '/automation/', '/automation/plugins/', '/automation/demos/', '/automation/coverage/', '/automation/connect/']
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
