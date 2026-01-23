import TextToSVG from 'text-to-svg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { JAPANESE_FONTS } from '../src/utils/fonts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.resolve(__dirname, '../public/assets/fonts/previews')

// Ensure output directory exists // turbo
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const PACKAGE_MAP: Record<string, string> = {
  'Yuji Boku': '@fontsource/yuji-boku/files/yuji-boku-japanese-400-normal.woff',
  'Klee One': '@fontsource/klee-one/files/klee-one-japanese-400-normal.woff',
  'Reggae One': '@fontsource/reggae-one/files/reggae-one-japanese-400-normal.woff',
  'Yuji Mai': '@fontsource/yuji-mai/files/yuji-mai-japanese-400-normal.woff',
  'Zen Old Mincho': '@fontsource/zen-old-mincho/files/zen-old-mincho-japanese-400-normal.woff',
  'Kaisei Opti': '@fontsource/kaisei-opti/files/kaisei-opti-japanese-400-normal.woff',
  'Zen Kurenaido': '@fontsource/zen-kurenaido/files/zen-kurenaido-japanese-400-normal.woff',
}

async function generatePreviews() {
  console.log('Generating font previews...')

  for (const font of JAPANESE_FONTS) {
    if (font.name === 'Default') continue

    const fontPathRelative = PACKAGE_MAP[font.name]
    if (!fontPathRelative) {
      console.warn(`No font file mapping found for ${font.name}`)
      continue
    }

    const fontPath = path.resolve(__dirname, '../node_modules', fontPathRelative)

    if (!fs.existsSync(fontPath)) {
      console.warn(`Font file not found at ${fontPath}`)
      // Try looking for non-japanese subset if japanese one fails, or list dir to find available
      continue
    }

    try {
      const textToSVG = TextToSVG.loadSync(fontPath)

      const attributes = { fill: 'black', stroke: 'none' }
      const options = { x: 0, y: 0, fontSize: 32, anchor: 'top', attributes }

      const svg = textToSVG.getSVG('人類社会のすべて\nあ い う え お', options)

      // Calculate viewBox to fit content strictly or use a fixed size?
      // text-to-svg returns an SVG string with width/height/viewBox set based on the text metrics.

      const fileName = `${font.name.replace(/\s+/g, '_').toLowerCase()}.svg`
      const outputPath = path.join(OUTPUT_DIR, fileName)

      fs.writeFileSync(outputPath, svg)
      console.log(`Generated preview for ${font.name}: ${fileName}`)
    } catch (error) {
      console.error(`Error generating preview for ${font.name}:`, error)
    }
  }
}

generatePreviews()
