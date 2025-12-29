import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const URL = 'https://www.tofugu.com/japanese/learn-katakana/'
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DATA_FILE = path.join(PROJECT_ROOT, 'src/data/katakana.json')

// Ensure directory exists
if (!fs.existsSync(path.dirname(DATA_FILE))) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true })
}

async function scrape() {
  console.log('Fetching page...')
  try {
    const { data } = await axios.get(URL)
    const $ = cheerio.load(data)
    const results: Record<string, { text: string; imagePath: string; audioPath?: string }> = {}

    console.log('Parsing content...')

    // Find all figures with class figure-middle
    const figures = $('figure.figure-middle')
    console.log(`Found ${figures.length} potential start nodes (figures).`)

    const turndownService = new TurndownService()

    for (let i = 0; i < figures.length; i++) {
      const figure = $(figures[i])

      // Get the image source
      const img = figure.find('img')
      let imgUrl = img.attr('data-src') || img.attr('src')

      if (!imgUrl) {
        console.log(`No image found for figure ${i}, skipping.`)
        continue
      }

      // Look for the sequence described:
      // 1. figure (current)
      // 2. Iterate siblings:
      //    - Collect p tags
      //    - If p tag contains <strong>, stop collecting
      //    - If we hit another figure or end of container, stop. (Though loop is usually sufficient if we just look ahead)

      const collectedText: string[] = []
      let nextElem = figure.next()

      while (nextElem.length > 0) {
        if (nextElem.is('figure')) break // Hit next char
        if (nextElem.is('p')) {
          const children = nextElem.children()
          // Stop if the only child is a strong tag (likely a header)
          if (
            children.length === 1 &&
            children.is('strong')
            // && nextElem.text().trim() === children.text().trim()
          ) {
            break
          }
          const html = nextElem.html() || ''
          if (html.trim()) {
            collectedText.push(turndownService.turndown(html))
          }
        }
        nextElem = nextElem.next()
      }

      if (collectedText.length === 0) {
        console.log(`No text found for ${path.basename(imgUrl)}, skipping.`)
        continue
      }

      // If we are here, we matched the group
      console.log(`Matched group for image: ${path.basename(imgUrl)}`)

      // Convert each block to markdown and join
      const combinedText = collectedText.join('\n\n')

      // Filenames
      const imgName = path.basename(imgUrl)

      // Use the character ID for strict naming
      const id = imgName.split('.')[0].substring(0, 1)

      // Construct absolute URLs
      // Handle relative URLs if any, though Tofugu usually provides absolute or root-relative
      const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.tofugu.com${imgUrl}`

      results[id] = {
        imagePath: fullImgUrl,
        text: combinedText,
      }
    }

    console.log(`Successfully processed ${Object.keys(results).length} items.`)
    fs.writeFileSync(DATA_FILE, JSON.stringify(results, null, 2))
    console.log(`Data saved to ${DATA_FILE}`)
  } catch (e) {
    console.error('Scraping failed:', e)
  }
}

scrape()
