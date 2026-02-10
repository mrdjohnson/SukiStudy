import path from 'path'

export const assetFileNames = (assetInfo: any) => {
  const name = assetInfo.name ?? ''
  const ext = path.extname(name).toLowerCase()

  // Group font assets under assets/fonts/<font-family-ish>/...
  if (['.woff', '.woff2', '.ttf', '.otf', '.eot'].includes(ext)) {
    const base = path.basename(name, ext).toLowerCase()

    // Examples we want to group:
    // - zen-old-mincho-61-400-normal.woff2 -> zen-old-mincho
    // - zen-old-mincho-111-400-normal.woff -> zen-old-mincho
    // - yuji-boku-japanese-400-normal.woff2 -> yuji-boku
    const match = base.match(
      /^(.*?)-(?:\d+|japanese|latin|latin-ext|cyrillic|vietnamese|greek|greek-ext|cjk)(?:-|$)/,
    )
    const group = (match?.[1] ?? base.split('-').slice(0, 2).join('-')).replace(/[^a-z0-9-]/g, '')

    const cleanName = base.replace(new RegExp(`^${group}-`), '')

    return `assets/fonts/${group}/${cleanName}-[hash][extname]`
  }

  return `assets/[name]-[hash][extname]`
}
