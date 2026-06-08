import wallpapersData from '../data/wallpapers.json'

type WallpaperItem = {
  id: string
  thumbUrl: string
  imageUrl: string
  alt: string | null
  authorName: string
  authorUrl: string
  unsplashUrl: string
}

type WallpaperCategory = {
  portraitItems: WallpaperItem[]
  landscapeItems: WallpaperItem[]
}

export const getDefaultBackground = () => {
  const DEFAULT_WALLPAPER_ID = 'ZQHiqI96ZCM'

  const wallpaperCategories = wallpapersData.categories as WallpaperCategory[]
  const allWallpaperItems = wallpaperCategories.flatMap(category => [
    ...category.portraitItems,
    ...category.landscapeItems,
  ])

  const portraitWallpaper = wallpaperCategories
    .flatMap(category => category.portraitItems)
    .find(item => item.id === DEFAULT_WALLPAPER_ID)
  const landscapeWallpaper = wallpaperCategories
    .flatMap(category => category.landscapeItems)
    .find(item => item.id === DEFAULT_WALLPAPER_ID)
  const fallbackWallpaper = portraitWallpaper || landscapeWallpaper || allWallpaperItems[0]

  if (!fallbackWallpaper) {
    return null
  }

  return {
    ...fallbackWallpaper,
    id: fallbackWallpaper.id,
    portraitUrl: (portraitWallpaper || fallbackWallpaper).imageUrl,
    landscapeUrl: (landscapeWallpaper || fallbackWallpaper).imageUrl,
  }
}
