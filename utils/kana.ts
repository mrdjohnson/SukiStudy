
import { GameItem, Subject, SubjectType } from "../types";

export const toHiragana = (input: string): string => {
  const table: Record<string, string> = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
    'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
    'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
    'cha': 'ちゃ', 'chu': 'ちゅ', 'ちょ': 'ちょ',
    'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
    'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
    'mya': 'みゃ', 'みゅ':'みゅ', 'myo': 'みょ',
    'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
    'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
    'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
    'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
    'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
    'っ': 't', 'ー': '-'
  };

  let str = input.toLowerCase();
  str = str.replace(/([kstnhmyrwgzbpd])\1/g, 'っ$1');
  const keys = Object.keys(table).sort((a, b) => b.length - a.length);
  keys.forEach(key => {
    const regex = new RegExp(key, 'g');
    str = str.replace(regex, table[key]);
  });
  return str;
};

// Data for Custom Game Generation
const HIRAGANA_SET = [
  { char: 'あ', romanji: 'a' }, { char: 'い', romanji: 'i' }, { char: 'う', romanji: 'u' }, { char: 'え', romanji: 'e' }, { char: 'お', romanji: 'o' },
  { char: 'か', romanji: 'ka' }, { char: 'き', romanji: 'ki' }, { char: 'く', romanji: 'ku' }, { char: 'け', romanji: 'ke' }, { char: 'こ', romanji: 'ko' },
  { char: 'さ', romanji: 'sa' }, { char: 'し', romanji: 'shi' }, { char: 'す', romanji: 'su' }, { char: 'せ', romanji: 'se' }, { char: 'そ', romanji: 'so' },
  { char: 'た', romanji: 'ta' }, { char: 'ち', romanji: 'chi' }, { char: 'つ', romanji: 'tsu' }, { char: 'て', romanji: 'te' }, { char: 'と', romanji: 'to' },
  { char: 'な', romanji: 'na' }, { char: 'に', romanji: 'ni' }, { char: 'ぬ', romanji: 'nu' }, { char: 'ね', romanji: 'ne' }, { char: 'の', romanji: 'no' },
  { char: 'は', romanji: 'ha' }, { char: 'ひ', romanji: 'hi' }, { char: 'ふ', romanji: 'fu' }, { char: 'へ', romanji: 'he' }, { char: 'ほ', romanji: 'ho' },
  { char: 'ま', romanji: 'ma' }, { char: 'み', romanji: 'mi' }, { char: 'む', romanji: 'mu' }, { char: 'め', romanji: 'me' }, { char: 'も', romanji: 'mo' },
  { char: 'や', romanji: 'ya' }, { char: 'ゆ', romanji: 'yu' }, { char: 'よ', romanji: 'yo' },
  { char: 'ら', romanji: 'ra' }, { char: 'り', romanji: 'ri' }, { char: 'る', romanji: 'ru' }, { char: 'れ', romanji: 're' }, { char: 'ろ', romanji: 'ro' },
  { char: 'わ', romanji: 'wa' }, { char: 'を', romanji: 'wo' }, { char: 'ん', romanji: 'n' }
];

const KATAKANA_SET = [
  { char: 'ア', romanji: 'a' }, { char: 'イ', romanji: 'i' }, { char: 'ウ', romanji: 'u' }, { char: 'エ', romanji: 'e' }, { char: 'オ', romanji: 'o' },
  { char: 'カ', romanji: 'ka' }, { char: 'キ', romanji: 'ki' }, { char: 'ク', romanji: 'ku' }, { char: 'ケ', romanji: 'ke' }, { char: 'コ', romanji: 'ko' },
  { char: 'サ', romanji: 'sa' }, { char: 'シ', romanji: 'shi' }, { char: 'ス', romanji: 'su' }, { char: 'セ', romanji: 'se' }, { char: 'ソ', romanji: 'so' },
  { char: 'タ', romanji: 'ta' }, { char: 'チ', romanji: 'chi' }, { char: 'ツ', romanji: 'tsu' }, { char: 'テ', romanji: 'te' }, { char: 'ト', romanji: 'to' },
  { char: 'ナ', romanji: 'na' }, { char: 'ニ', romanji: 'ni' }, { char: 'ヌ', romanji: 'nu' }, { char: 'ネ', romanji: 'ne' }, { char: 'ノ', romanji: 'no' },
  { char: 'ハ', romanji: 'ha' }, { char: 'ヒ', romanji: 'hi' }, { char: 'フ', romanji: 'fu' }, { char: 'ヘ', romanji: 'he' }, { char: 'ホ', romanji: 'ho' },
  { char: 'マ', romanji: 'ma' }, { char: 'ミ', romanji: 'mi' }, { char: 'ム', romanji: 'mu' }, { char: 'メ', romanji: 'me' }, { char: 'モ', romanji: 'mo' },
  { char: 'ヤ', romanji: 'ya' }, { char: 'ユ', romanji: 'yu' }, { char: 'ヨ', romanji: 'yo' },
  { char: 'ラ', romanji: 'ra' }, { char: 'リ', romanji: 'ri' }, { char: 'ル', romanji: 'ru' }, { char: 'レ', romanji: 're' }, { char: 'ロ', romanji: 'ro' },
  { char: 'ワ', romanji: 'wa' }, { char: 'ヲ', romanji: 'wo' }, { char: 'ン', romanji: 'n' }
];

export const generateKanaGameItems = (includeHiragana: boolean, includeKatakana: boolean): GameItem[] => {
  let list: { char: string, romanji: string }[] = [];
  if (includeHiragana) list = [...list, ...HIRAGANA_SET];
  if (includeKatakana) list = [...list, ...KATAKANA_SET];

  return list.map((item, index) => {
    // Determine type by looking at char code range roughly, or just assume vocab-like behavior
    const subject: Subject = {
      id: -1000 - index, // Negative IDs to avoid conflict with real items
      object: 'vocabulary',
      url: '',
      created_at: new Date().toISOString(),
      level: 1,
      slug: item.romanji,
      hidden_at: null,
      document_url: '',
      characters: item.char,
      character_images: [],
      meanings: [{ meaning: item.romanji, primary: true, accepted_answer: true }],
      auxiliary_meanings: [],
      readings: [{ type: 'kunyomi', primary: true, reading: item.char, accepted_answer: true }],
      component_subject_ids: [],
      amalgamation_subject_ids: [],
      visually_similar_subject_ids: [],
      meaning_mnemonic: `This is the kana for ${item.romanji}`,
      lesson_position: 0,
      spaced_repetition_system_id: 0
    };

    return {
      subject,
      isReviewable: false
    };
  });
};
