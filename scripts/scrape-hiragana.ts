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
    const results: Record<string, { text?: string; imagePath?: string; audioPath?: string }> = {}

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

      // Filenames
      const imgName = path.basename(imgUrl)

      // Use the character ID for strict naming
      const id = imgName.split('.')[0].substring(0, 1)

      // Collect text from subsequent siblings
      let combinedTextParts: string[] = []
      let nextNode = figure.next()

      while (nextNode.length > 0) {
        // Stop condition: <p><strong>...</strong></p>
        if (nextNode.is('p')) {
          const html = nextNode.html()?.trim() || ''
          // Check if it starts/ends with strong tags, implying a header
          if (html.startsWith('<strong>')) {
            break
          }
        }

        // Also stop if we hit another figure (new section)
        if (nextNode.is('figure')) {
          break
        }

        if (nextNode.is('p')) {
          const text = turndownService.turndown(nextNode.html() || '')
          if (text.trim()) {
            combinedTextParts.push(text)
          }
        }

        // Skip audio and other elements, just continue traversing
        nextNode = nextNode.next()
      }

      const combinedText = combinedTextParts.join('\n\n')

      const fullImgUrl = imgUrl.startsWith('http') ? imgUrl : `https://www.tofugu.com${imgUrl}`

      results[id] = {
        imagePath: fullImgUrl,
        audioPath: undefined, // Audio skipped in this part
        text: combinedText,
      }
    }

    // Find all figures with class figure-middle
    const audios = $('.article-audio-sentence')
    console.log(`Found ${audios.length} potential audio nodes.`)

    for (let i = 0; i < audios.length; i++) {
      const audio = $(audios[i])

      // Get the hirigana name
      const hiraganaNameSource = audio.find('.article-audio-sentence-sentence').first()
      let hiraganaName = hiraganaNameSource.text()?.trim()

      if (!hiraganaName) {
        console.log(`No hiragana name found for audio ${i}, skipping.`)
        continue
      }

      const audioDiv = audio.find('.article-audio-sentence-player')
      const audioSource = $(audioDiv).find('audio source').attr('src')

      if (audioSource) {
        // Construct absolute URLs

        let fullAudioUrl
        if (audioSource) {
          fullAudioUrl = audioSource.startsWith('http')
            ? audioSource
            : `https://www.tofugu.com${audioSource}`
        }

        results[hiraganaName] = {
          ...results[hiraganaName],
          audioPath: fullAudioUrl,
        }
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
