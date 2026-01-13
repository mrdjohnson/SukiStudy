import { SubjectType } from '../types'

export const colorByType = {
  [SubjectType.HIRAGANA]: '#0d9488',
  [SubjectType.KATAKANA]: '#d97706',
  [SubjectType.RADICAL]: '#0284c7',
  [SubjectType.KANJI]: '#db2777',
  [SubjectType.VOCABULARY]: '#9333ea',
}

export const textColorByType = {
  [SubjectType.HIRAGANA]: 'text-hiragana',
  [SubjectType.KATAKANA]: 'text-katakana',
  [SubjectType.RADICAL]: 'text-radical',
  [SubjectType.KANJI]: 'text-kanji',
  [SubjectType.VOCABULARY]: 'text-vocabulary',
}

export const bgColorByType = {
  [SubjectType.HIRAGANA]: '!bg-hiragana',
  [SubjectType.KATAKANA]: '!bg-katakana',
  [SubjectType.RADICAL]: '!bg-radical',
  [SubjectType.KANJI]: '!bg-kanji',
  [SubjectType.VOCABULARY]: '!bg-vocabulary',
}

export const themeByType = {
  [SubjectType.HIRAGANA]: '!bg-hiragana/10 border-hiragana',
  [SubjectType.KATAKANA]: '!bg-katakana/10 border-katakana',
  [SubjectType.RADICAL]: '!bg-radical/10 border-radical',
  [SubjectType.KANJI]: '!bg-kanji/10 border-kanji',
  [SubjectType.VOCABULARY]: '!bg-vocabulary/10 border-vocabulary',
}
