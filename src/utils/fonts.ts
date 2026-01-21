export interface JapaneseFont {
  name: string
  family: string
  load: () => Promise<any>
}

export const JAPANESE_FONTS: JapaneseFont[] = [
  {
    name: 'Default',
    family: 'inherit',
    load: () => Promise.resolve(),
  },
  {
    name: 'Yuji Boku',
    family: '"Yuji Boku", serif',
    load: () => import('@fontsource/yuji-boku'),
  },
  {
    name: 'Klee One',
    family: '"Klee One", cursive',
    load: () => import('@fontsource/klee-one'),
  },
  {
    name: 'Reggae One',
    family: '"Reggae One", cursive',
    load: () => import('@fontsource/reggae-one'),
  },
  {
    name: 'Yuji Mai',
    family: '"Yuji Mai", serif',
    load: () => import('@fontsource/yuji-mai'),
  },
  {
    name: 'Zen Old Mincho',
    family: '"Zen Old Mincho", serif',
    load: () => import('@fontsource/zen-old-mincho'),
  },
  {
    name: 'Kaisei Opti',
    family: '"Kaisei Opti", serif',
    load: () => import('@fontsource/kaisei-opti'),
  },
  {
    name: 'Zen Kurenaido',
    family: '"Zen Kurenaido", sans-serif',
    load: () => import('@fontsource/zen-kurenaido'),
  },
]
