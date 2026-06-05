import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { basename, extname, join, resolve } from 'node:path'

const repoRoot = resolve(import.meta.dirname, '..')
const defaultPluginSource = resolve(process.env.HOME ?? '', 'personal/forks/openai-plugins')
const defaultBundledPluginRoot = resolve(
  process.env.HOME ?? '',
  '.codex/plugins/cache/openai-bundled',
)
const pluginSource = resolve(
  process.argv[2] ?? process.env.OPENAI_PLUGINS_DIR ?? defaultPluginSource,
)
const pluginRoot = join(pluginSource, 'plugins')
const bundledPluginRoot = resolve(
  process.env.OPENAI_BUNDLED_PLUGINS_DIR ?? defaultBundledPluginRoot,
)
const iconOutputDir = join(repoRoot, 'public/codex-plugin-icons')
const registryOutputPath = join(
  repoRoot,
  'src/features/prompt-library/rendering/codex-plugin-registry.ts',
)

const sourceExtensions = ['.svg', '.png', '.webp', '.jpg', '.jpeg']
const fallbackAssetNames = ['app-icon', 'icon', 'composer', 'logo', 'glyph', 'small', 'platform']

if (!existsSync(pluginRoot)) {
  throw new Error(`Could not find OpenAI plugin source at ${pluginRoot}`)
}

rmSync(iconOutputDir, { force: true, recursive: true })
mkdirSync(iconOutputDir, { recursive: true })

const pluginJsonPaths = uniquePluginJsonPaths([
  ...findPluginJsonPaths(pluginRoot, ['-mindepth', '3', '-maxdepth', '3']),
  ...findPluginJsonPaths(bundledPluginRoot, ['-mindepth', '4', '-maxdepth', '4']),
])

const entries = pluginJsonPaths.map((pluginJsonPath) => {
  const pluginDir = resolve(pluginJsonPath, '../..')
  const plugin = JSON.parse(readFileSync(pluginJsonPath, 'utf8'))
  const interfaceConfig = plugin.interface ?? {}
  const displayName = normalizeDisplayName(interfaceConfig.displayName ?? plugin.name)
  const sourceIconPath = findSourceIcon(pluginDir, interfaceConfig.composerIcon)
  const icon = sourceIconPath ? writePluginSvgIcon(plugin.name, sourceIconPath) : undefined
  const brandColor =
    normalizeHexColor(interfaceConfig.brandColor) ?? colorFromSourceIcon(sourceIconPath)
  const textColor = brandColor ? readableColorOnDark(brandColor) : undefined

  return {
    brandColor,
    displayName,
    iconSrc: icon?.src,
    name: plugin.name,
    sourceIconPath,
    sourceIconType: sourceIconPath ? extname(sourceIconPath).toLowerCase() : undefined,
    textColor,
    usedRasterWrapper: icon?.usedRasterWrapper ?? false,
  }
})

assertSvgSourcesRemainSvg(entries)
writeFileSync(registryOutputPath, registrySource(entries))

function findPluginJsonPaths(root, depthArgs) {
  if (!existsSync(root)) {
    return []
  }

  return execFileSync('find', [root, ...depthArgs, '-path', '*/.codex-plugin/plugin.json'], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((path) => path.trim())
    .filter(Boolean)
    .sort()
}

function uniquePluginJsonPaths(pluginJsonPaths) {
  const pathsByPluginName = new Map()

  for (const pluginJsonPath of pluginJsonPaths) {
    const plugin = JSON.parse(readFileSync(pluginJsonPath, 'utf8'))

    if (!pathsByPluginName.has(plugin.name)) {
      pathsByPluginName.set(plugin.name, pluginJsonPath)
    }
  }

  return [...pathsByPluginName.values()]
}

function findSourceIcon(pluginDir, configuredIconPath) {
  const configuredPath = configuredIconPath ? resolve(pluginDir, configuredIconPath) : null

  if (
    configuredPath &&
    existsSync(configuredPath) &&
    extname(configuredPath).toLowerCase() === '.svg'
  ) {
    return configuredPath
  }

  const assetDir = join(pluginDir, 'assets')

  const assetPaths = existsSync(assetDir)
    ? execFileSync('find', [assetDir, '-maxdepth', '1', '-type', 'f'], {
        encoding: 'utf8',
      })
        .split('\n')
        .map((path) => path.trim())
        .filter((path) => sourceExtensions.includes(extname(path).toLowerCase()))
    : []

  const smallSvg = assetPaths.find(
    (path) =>
      extname(path).toLowerCase() === '.svg' && basename(path).toLowerCase().includes('small'),
  )

  if (smallSvg) {
    return smallSvg
  }

  const svgAsset = assetPaths.find((path) => extname(path).toLowerCase() === '.svg')

  if (svgAsset) {
    return svgAsset
  }

  if (configuredPath && existsSync(configuredPath)) {
    return configuredPath
  }

  for (const assetName of fallbackAssetNames) {
    const matchingAsset = assetPaths.find((path) => {
      const filename = basename(path, extname(path)).toLowerCase()

      return filename === assetName || filename.includes(assetName)
    })

    if (matchingAsset) {
      return matchingAsset
    }
  }

  return assetPaths[0] ?? null
}

function writePluginSvgIcon(pluginName, sourceIconPath) {
  const outputPath = join(iconOutputDir, `${pluginName}.svg`)
  const sourceExtension = extname(sourceIconPath).toLowerCase()

  if (sourceExtension === '.svg') {
    writeFileSync(outputPath, readFileSync(sourceIconPath, 'utf8'))
  } else {
    writeFileSync(outputPath, embeddedRasterSvg(sourceIconPath))
  }

  return {
    src: `/codex-plugin-icons/${pluginName}.svg`,
    usedRasterWrapper: sourceExtension !== '.svg',
  }
}

function assertSvgSourcesRemainSvg(pluginEntries) {
  const wrappedSvgSources = pluginEntries.filter(
    (entry) => entry.sourceIconType === '.svg' && entry.usedRasterWrapper,
  )

  if (wrappedSvgSources.length === 0) {
    return
  }

  const pluginNames = wrappedSvgSources.map((entry) => entry.name).join(', ')

  throw new Error(`Refusing to wrap existing SVG source assets for: ${pluginNames}`)
}

function embeddedRasterSvg(sourceIconPath) {
  const base64 = rasterPngBase64(sourceIconPath)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <image href="data:image/png;base64,${base64}" x="0" y="0" width="64" height="64" preserveAspectRatio="xMidYMid meet"/>
</svg>
`
}

function rasterPngBase64(sourceIconPath) {
  try {
    return execFileSync('magick', [sourceIconPath, '-resize', '128x128>', '-strip', 'PNG:-'], {
      stdio: ['ignore', 'pipe', 'ignore'],
    }).toString('base64')
  } catch {
    return readFileSync(sourceIconPath).toString('base64')
  }
}

function colorFromSourceIcon(sourceIconPath) {
  if (!sourceIconPath) {
    return undefined
  }

  try {
    const averageColor = execFileSync(
      'magick',
      [
        sourceIconPath,
        '-background',
        'white',
        '-alpha',
        'remove',
        '-resize',
        '1x1!',
        '-format',
        '%[hex:p{0,0}]',
        'info:',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    ).trim()
    const color = normalizeHexColor(`#${averageColor.slice(0, 6)}`)

    return isUsefulDerivedColor(color) ? color : undefined
  } catch {
    return undefined
  }
}

function isUsefulDerivedColor(color) {
  if (!color) {
    return false
  }

  const { b, g, r } = hexToRgb(color)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const saturation = max === 0 ? 0 : (max - min) / max

  return saturation > 0.12 && max < 248 && min > 8
}

function readableColorOnDark(color) {
  let { b, g, r } = hexToRgb(color)
  const background = hexToRgb('#0b0c0e')

  for (let step = 0; step < 16; step += 1) {
    const candidate = rgbToHex({ b, g, r })

    if (contrastRatio(hexToRgb(candidate), background) >= 3) {
      return candidate
    }

    r = mixChannel(r, 255, 0.14)
    g = mixChannel(g, 255, 0.14)
    b = mixChannel(b, 255, 0.14)
  }

  return '#e8e6e3'
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground)
  const backgroundLuminance = relativeLuminance(background)
  const light = Math.max(foregroundLuminance, backgroundLuminance)
  const dark = Math.min(foregroundLuminance, backgroundLuminance)

  return (light + 0.05) / (dark + 0.05)
}

function relativeLuminance({ b, g, r }) {
  const [red, green, blue] = [r, g, b].map((channel) => {
    const value = channel / 255

    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue
}

function mixChannel(from, to, amount) {
  return Math.round(from + (to - from) * amount)
}

function normalizeHexColor(color) {
  if (typeof color !== 'string') {
    return undefined
  }

  const trimmedColor = color.trim()
  const shorthandMatch = trimmedColor.match(/^#([0-9a-f]{3})$/i)

  if (shorthandMatch) {
    return `#${shorthandMatch[1]
      .split('')
      .map((character) => character + character)
      .join('')
      .toUpperCase()}`
  }

  const match = trimmedColor.match(/^#([0-9a-f]{6})$/i)

  return match ? `#${match[1].toUpperCase()}` : undefined
}

function hexToRgb(color) {
  const normalizedColor = normalizeHexColor(color)

  if (!normalizedColor) {
    throw new Error(`Invalid hex color: ${color}`)
  }

  return {
    b: Number.parseInt(normalizedColor.slice(5, 7), 16),
    g: Number.parseInt(normalizedColor.slice(3, 5), 16),
    r: Number.parseInt(normalizedColor.slice(1, 3), 16),
  }
}

function rgbToHex({ b, g, r }) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()}`
}

function normalizeDisplayName(displayName) {
  return String(displayName).trim().replace(/\s+/g, ' ')
}

function registrySource(pluginEntries) {
  const registryEntries = pluginEntries
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((entry) => `  ${JSON.stringify(entry.name)}: ${registryEntrySource(entry)},`)
    .join('\n')

  return `// Generated by scripts/generate-codex-plugin-assets.mjs from OpenAI plugin sources.
// Do not edit by hand.

export type CodexPluginVisual = {
  brandColor?: string
  displayName: string
  iconSrc?: string
  textColor?: string
}

export const codexPluginRegistry = {
${registryEntries}
} as const satisfies Record<string, CodexPluginVisual>

export const getCodexPluginVisual = (value: string): CodexPluginVisual | undefined => {
  return codexPluginRegistry[normalizeCodexPluginName(value) as keyof typeof codexPluginRegistry]
}

const normalizeCodexPluginName = (value: string) => {
  return value.trim().replace(/^@/, '').replace(/[_\\s]+/g, '-').toLowerCase()
}
`
}

function registryEntrySource(entry) {
  const fields = [
    `displayName: ${JSON.stringify(entry.displayName)}`,
    entry.brandColor ? `brandColor: ${JSON.stringify(entry.brandColor)}` : null,
    entry.textColor ? `textColor: ${JSON.stringify(entry.textColor)}` : null,
    entry.iconSrc ? `iconSrc: ${JSON.stringify(entry.iconSrc)}` : null,
  ].filter(Boolean)

  return `{ ${fields.join(', ')} }`
}
