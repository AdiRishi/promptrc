import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { type Plugin } from 'vite'

interface SitemapPluginOptions {
  baseUrl: string
  routeTreePath?: string
  sitemapPath?: string
  robotsPath?: string
  verbose?: boolean
  trailingSlash?: boolean
  excludePaths?: string[]
}

function extractRoutes(content: string) {
  const interfaceMatch = content.match(/interface FileRoutesByFullPath\s*\{([^}]+)\}/)

  if (interfaceMatch) {
    const pathMatches = interfaceMatch[1].match(/'([^']+)':/g)

    if (pathMatches) {
      return pathMatches
        .map((match) => match.replace(/[':]| /g, ''))
        .filter((path) => !isDynamicRoute(path))
    }
  }

  const fullPathsMatch = content.match(/fullPaths:\s*([^\n]+)/)

  if (fullPathsMatch) {
    return fullPathsMatch[1]
      .split('|')
      .map((path) => path.trim().replace(/^'|'$/g, ''))
      .filter((path) => !isDynamicRoute(path))
  }

  return []
}

function isDynamicRoute(path: string) {
  return path.includes('$') || path.includes('[') || path.includes(']')
}

function escapeXml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildUrl(baseUrl: string, path: string, trailingSlash: boolean) {
  const cleanBaseUrl = baseUrl.replace(/\/$/, '')
  let url = path === '/' ? cleanBaseUrl : `${cleanBaseUrl}${path}`

  if (trailingSlash && !url.endsWith('/') && url !== cleanBaseUrl) {
    url += '/'
  }

  return url
}

function writeTextFile(filePath: string, contents: string) {
  const outputDir = dirname(filePath)

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  writeFileSync(filePath, contents, 'utf-8')
}

export function sitemapPlugin({
  baseUrl,
  routeTreePath = 'src/routeTree.gen.ts',
  sitemapPath = 'public/sitemap.xml',
  robotsPath = 'public/robots.txt',
  verbose = false,
  trailingSlash = false,
  excludePaths = [],
}: SitemapPluginOptions): Plugin {
  return {
    name: 'vite-sitemap-plugin',
    apply: 'build',
    enforce: 'post',

    buildEnd() {
      const rootDir = process.cwd()
      const routeTreeFullPath = resolve(rootDir, routeTreePath)
      const sitemapFullPath = resolve(rootDir, sitemapPath)
      const robotsFullPath = resolve(rootDir, robotsPath)

      let routeTreeContent: string

      try {
        routeTreeContent = readFileSync(routeTreeFullPath, 'utf-8')
      } catch {
        console.warn('[sitemap-plugin] Could not read routeTree.gen.ts')
        return
      }

      const routes = extractRoutes(routeTreeContent).filter((path) => !excludePaths.includes(path))

      if (routes.length === 0) {
        console.warn('[sitemap-plugin] No static routes found')
        return
      }

      if (verbose) {
        console.log('[sitemap-plugin] Found routes:', routes)
      }

      const now = new Date().toISOString()
      const sitemapUrl = buildUrl(baseUrl, '/sitemap.xml', false)
      const urls = routes
        .map((route) => {
          const url = escapeXml(buildUrl(baseUrl, route, trailingSlash))

          return `  <url>
    <loc>${url}</loc>
    <lastmod>${now}</lastmod>
  </url>`
        })
        .join('\n')

      const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
      xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
      xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
            http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
${urls}
</urlset>
`

      const robots = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Disallow:

Sitemap: ${sitemapUrl}
`

      writeTextFile(sitemapFullPath, sitemap)
      writeTextFile(robotsFullPath, robots)

      console.log(`[sitemap-plugin] Generated sitemap with ${routes.length} route(s)`)
    },
  }
}
