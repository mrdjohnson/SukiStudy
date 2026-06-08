import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

type CategoryId = 'seasons' | 'books' | 'anime' | 'chill' | 'random'

interface UnsplashPhoto {
  id: string
  alt_description: string | null
  urls: {
    raw: string
    small: string
  }
  user: {
    name: string
    links: {
      html: string
    }
  }
  links: {
    html: string
  }
}

interface UnsplashSearchResponse {
  results: UnsplashPhoto[]
}

interface WallpaperItem {
  id: string
  thumbUrl: string
  imageUrl: string
  alt: string | null
  authorName: string
  authorUrl: string
  unsplashUrl: string
}

interface WallpaperCategory {
  id: CategoryId
  label: string
  query: string
  portraitItems: WallpaperItem[]
  landscapeItems: WallpaperItem[]
}

interface WallpapersData {
  generatedAt: string
  categories: WallpaperCategory[]
}

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PROJECT_ROOT = path.resolve(__dirname, '..')
const OUTPUT_FILE = path.join(PROJECT_ROOT, 'src/data/wallpapers.json')

const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY
const UNSPLASH_API_BASE = 'https://api.unsplash.com'

const CATEGORIES: Omit<WallpaperCategory, 'portraitItems' | 'landscapeItems'>[] = [
  { id: 'seasons', label: 'Nature', query: 'japan seasons nature' },
  { id: 'books', label: 'Books', query: 'bookshelf' },
  { id: 'anime', label: 'Anime', query: 'anime style landscape illustration' },
  { id: 'chill', label: 'Chill', query: 'lofi' },
  { id: 'random', label: 'Random', query: 'beautiful wallpaper aesthetic' },
]

const ITEMS_PER_CATEGORY = 30

const buildImageUrl = (raw: string, orientation: 'portrait' | 'landscape') => {
  const separator = raw.includes('?') ? '&' : '?'
  if (orientation === 'portrait') {
    return `${raw}${separator}auto=format&fit=crop&crop=entropy&w=1200&h=2000&q=80`
  }
  return `${raw}${separator}auto=format&fit=crop&crop=entropy&w=2200&h=1200&q=80`
}

async function fetchCategory(
  query: string,
  orientation: 'portrait' | 'landscape',
): Promise<UnsplashPhoto[]> {
  const params = new URLSearchParams({
    query,
    per_page: String(ITEMS_PER_CATEGORY),
    page: '1',
    content_filter: 'high',
    orientation,
  })

  const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      'Accept-Version': 'v1',
    },
  })

  if (!response.ok) {
    throw new Error(`Unsplash request failed (${response.status}) for query "${query}"`)
  }

  const data = (await response.json()) as UnsplashSearchResponse
  return data.results
}

async function generateWallpapers() {
  if (!UNSPLASH_ACCESS_KEY) {
    throw new Error(
      'Missing UNSPLASH_ACCESS_KEY. Add it to your environment before running this script.',
    )
  }

  const categories: WallpaperCategory[] = []

  for (const category of CATEGORIES) {
    console.log(`Fetching category "${category.label}"...`)
    const [portraitPhotos, landscapePhotos] = await Promise.all([
      fetchCategory(category.query, 'portrait'),
      fetchCategory(category.query, 'landscape'),
    ])

    const portraitItems: WallpaperItem[] = portraitPhotos.map(photo => ({
      id: photo.id,
      thumbUrl: photo.urls.small,
      imageUrl: buildImageUrl(photo.urls.raw, 'portrait'),
      alt: photo.alt_description,
      authorName: photo.user.name,
      authorUrl: photo.user.links.html,
      unsplashUrl: photo.links.html,
    }))

    const landscapeItems: WallpaperItem[] = landscapePhotos.map(photo => ({
      id: photo.id,
      thumbUrl: photo.urls.small,
      imageUrl: buildImageUrl(photo.urls.raw, 'landscape'),
      alt: photo.alt_description,
      authorName: photo.user.name,
      authorUrl: photo.user.links.html,
      unsplashUrl: photo.links.html,
    }))

    categories.push({
      ...category,
      portraitItems,
      landscapeItems,
    })
  }

  const output: WallpapersData = {
    generatedAt: new Date().toISOString(),
    categories,
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2))
  console.log(`Saved ${OUTPUT_FILE}`)
}

generateWallpapers().catch(error => {
  console.error('Failed to generate wallpapers:', error)
  process.exit(1)
})
