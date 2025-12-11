import { GameItem, Subject } from '../types'
import { isHiragana, toHiragana, toKatakana, toRomaji as toRomanji } from 'wanakana'

const HIRAGANA_LIST = [
  'あ',
  'い',
  'う',
  'え',
  'お',
  'か',
  'き',
  'く',
  'け',
  'こ',
  'さ',
  'し',
  'す',
  'せ',
  'そ',
  'た',
  'ち',
  'つ',
  'て',
  'と',
  'な',
  'に',
  'ぬ',
  'ね',
  'の',
  'は',
  'ひ',
  'ふ',
  'へ',
  'ほ',
  'ま',
  'み',
  'む',
  'め',
  'も',
  'や',
  'ゆ',
  'よ',
  'ら',
  'り',
  'る',
  'れ',
  'ろ',
  'わ',
  'を',
  'ん',

  // dakuten
  'が',
  'ぎ',
  'ぐ',
  'げ',
  'ご',
  'ざ',
  'じ',
  'ず',
  'ぜ',
  'ぞ',
  'だ',
  'ぢ',
  'づ',
  'で',
  'ど',
  'ば',
  'び',
  'ぶ',
  'べ',
  'ぼ',

  // handakuten
  'ぱ',
  'ぴ',
  'ぷ',
  'ぺ',
  'ぽ',

  // // small kana
  // 'ぁ',
  // 'ぃ',
  // 'ぅ',
  // 'ぇ',
  // 'ぉ',
  // 'ゃ',
  // 'ゅ',
  // 'ょ',
  // 'っ',

  // combinations
  'きゃ:',
  'きゅ',
  'きょ',
  'しゃ',
  'しゅ',
  'しょ',
  'ちゃ',
  'ちゅ',
  'ちょ',
  'にゃ',
  'にゅ',
  'にょ',
  'ひゃ',
  'ひゅ',
  'ひょ',
  'みゃ',
  'みゅ',
  'みょ',
  'りゃ',
  'りゅ',
  'りょ',
  'ぎゃ',
  'ぎゅ',
  'ぎょ',
  'じゃ',
  'じゅ',
  'じょ',
  'びゃ',
  'びゅ',
  'びょ',
  'ぴゃ',
  'ぴゅ',
  'ぴょ',
] as const

const KATAKANA_LIST = HIRAGANA_LIST.map(hiragana => toKatakana(hiragana))

export { toKatakana, toHiragana, toRomanji }

export const generateKanaGameItems = (
  includeHiragana: boolean,
  includeKatakana: boolean,
): GameItem[] => {
  const list: string[] = []
  if (includeHiragana) list.push(...HIRAGANA_LIST)
  if (includeKatakana) list.push(...KATAKANA_LIST)

  return list.map((item, index) => {
    const romanji = toRomanji(item)
    const itemIsHiragana = isHiragana(item)
    const alternate = itemIsHiragana ? toKatakana(item) : toHiragana(item)

    const versions = [toRomanji, toHiragana, toKatakana].map(f => f(item))

    const type = itemIsHiragana ? 'hiragana' : 'katakana'

    // Determine type by looking at char code range roughly, or just assume vocab-like behavior
    const subject: Subject = {
      id: -1000 - index, // Negative IDs to avoid conflict with real items
      object: type,
      url: '',
      created_at: new Date().toISOString(),
      level: 0,
      slug: romanji,
      hidden_at: null,
      document_url: '',
      characters: item,
      character_images: [],
      meanings: versions.map(version => ({
        meaning: version,
        primary: false,
        accepted_answer: true,
      })),
      auxiliary_meanings: [],
      readings: [
        { type: 'kunyomi', primary: true, reading: item, accepted_answer: true },
        { type: 'kunyomi', primary: false, reading: alternate, accepted_answer: true },
      ],
      component_subject_ids: [],
      amalgamation_subject_ids: [],
      visually_similar_subject_ids: [],
      meaning_mnemonic: `This is the ${type} for ${romanji}`,
      lesson_position: 0,
      spaced_repetition_system_id: 0,
    }

    return {
      subject,
      isReviewable: false,
    }
  })
}
