import * as cheerio from 'cheerio'
import TurndownService from 'turndown'
import axios from 'axios'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const URL = 'https://www.tofugu.com/japanese/learn-hiragana/'
const PROJECT_ROOT = path.resolve(__dirname, '..')
const DATA_FILE = path.join(PROJECT_ROOT, 'src/data/hiragana.json')

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
      // 2. p (text 1)
      // 3. div.article-audio-sentence
      // 4. p (text 2)

      const p1 = figure.next('p')
      if (p1.length === 0) continue

      const audioDiv = p1.next('div.article-audio-sentence')
      if (audioDiv.length === 0) continue

      const p2 = audioDiv.next('p')
      if (p2.length === 0) continue

      // If we are here, we matched the group
      console.log(`Matched group for image: ${path.basename(imgUrl)}`)

      const turndownService = new TurndownService()
      const text1 = turndownService.turndown(p1.html() || '')
      const text2 = turndownService.turndown(p2.html() || '')
      const combinedText = `${text1}\n\n${text2}`

      const audioSource = audioDiv.find('audio source').attr('src')

      // Filenames
      const imgName = path.basename(imgUrl)

      // Use the character ID for strict naming
      const id = imgName.split('.')[0].substring(0, 1)

      // Construct absolute URLs
      // Handle relative URLs if any, though Tofugu usually provides absolute or root-relative
      const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.tofugu.com${imgUrl}`

      let fullAudioUrl
      if (audioSource) {
        fullAudioUrl = audioSource.startsWith('http')
          ? audioSource
          : `https://www.tofugu.com${audioSource}`
      }

      results[id] = {
        imagePath: fullImgUrl,
        audioPath: fullAudioUrl,
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
