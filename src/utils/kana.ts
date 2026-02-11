import { Subject, SubjectType } from '../types'
import { isHiragana, toHiragana, toKatakana, toRomaji as toRomanji } from 'wanakana'
import _ from 'lodash'

import _hiragana from '../data/hiragana.json'
import _katakana from '../data/katakana.json'

type ScrapedKanaItem = Partial<{
  imagePath: string
  audioPath: string
  text: string
}>

const hiragana = _hiragana as Record<string, ScrapedKanaItem>
const katakana = _katakana as Record<string, ScrapedKanaItem>

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
  'きゃ',
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
]

const KATAKANA_LIST = HIRAGANA_LIST.map(hiragana => toKatakana(hiragana))

export { toKatakana, toHiragana, toRomanji }

export const getKanaSubjects = (): Subject[] => {
  const list: string[] = _.reverse(HIRAGANA_LIST.concat(...KATAKANA_LIST))

  return list.map((item, index) => {
    const romanji = toRomanji(item)
    const itemIsHiragana = isHiragana(item.trim())
    const alternate = itemIsHiragana ? toKatakana(item) : toHiragana(item)

    const versions = [toRomanji, toHiragana, toKatakana].map(f => f(item))

    const type = itemIsHiragana ? SubjectType.HIRAGANA : SubjectType.KATAKANA

    const kanaItem = itemIsHiragana ? hiragana[item] : katakana[item]

    const character_images: Subject['character_images'] = kanaItem?.imagePath
      ? [{ url: kanaItem?.imagePath, metadata: {}, content_type: 'image' }]
      : []

    let pronunciation_audios: Subject['pronunciation_audios'] = []

    if (kanaItem?.audioPath) {
      pronunciation_audios = [{ url: kanaItem?.audioPath, content_type: 'audio' }]
    } else {
      const altAudio = itemIsHiragana
        ? katakana[alternate]?.audioPath
        : hiragana[alternate]?.audioPath

      if (altAudio) {
        pronunciation_audios = [{ url: altAudio, content_type: 'audio' }]
      }
    }

    // Determine type by looking at char code range roughly, or just assume vocab-like behavior
    const subject: Subject = {
      id: -1000 - index, // Negative IDs to avoid conflict with real items
      object: type,
      url: '',
      created_at: new Date().toISOString(),
      level: 1,
      slug: romanji,
      hidden_at: null,
      document_url: '',
      characters: item,
      character_images,
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
      meaning_mnemonic: kanaItem?.text || `This is the ${type} for ${romanji}`,
      lesson_position: 0,
      spaced_repetition_system_id: 0,
      pronunciation_audios,
      isKana: true,
    }

    return subject
  })
}
