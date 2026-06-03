import { Icons } from '../components/Icons'
import { SubjectType, type GameMetadata } from '../core/types'

export const gameMetadata: GameMetadata[] = [
  {
    id: 'memory',
    name: 'Memory Match',
    desc: 'Match characters to their meanings or readings.',
    icon: Icons.Brain,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-400',
    hiddenSubjectTypes: [],
  },
  {
    id: 'quiz',
    name: 'Quick Quiz',
    desc: 'Multiple choice speed run of your learned items.',
    icon: Icons.FileQuestion,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-400',
    hiddenSubjectTypes: [],
  },
  {
    id: 'matching',
    name: 'Matching Pairs',
    desc: 'Find matching pairs of Kanji/Kana and Meanings.',
    icon: Icons.Shuffle,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
    hiddenSubjectTypes: [],
  },
  {
    id: 'typing',
    name: 'Typing Practice',
    desc: 'Type the correct reading or meaning.',
    icon: Icons.Keyboard,
    color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900 dark:text-emerald-400',
    hiddenSubjectTypes: [],
  },
  {
    id: 'connect',
    name: 'Hiragana Connect',
    desc: 'Trace the path of kana to spell the word.',
    icon: Icons.GridDots,
    color: 'bg-teal-100 text-teal-600 dark:bg-teal-900 dark:text-teal-400',
    hiddenSubjectTypes: [
      SubjectType.HIRAGANA,
      SubjectType.KATAKANA,
      SubjectType.RADICAL,
      SubjectType.KATAKANA,
    ],
  },
  {
    id: 'variations',
    name: 'Kanji Readings',
    desc: 'Select all valid readings for a Kanji.',
    icon: Icons.ListCheck,
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900 dark:text-rose-400',
    hiddenSubjectTypes: [
      SubjectType.HIRAGANA,
      SubjectType.KATAKANA,
      SubjectType.RADICAL,
      SubjectType.VOCABULARY,
    ],
  },
  {
    id: 'recall',
    name: 'Word Recall',
    desc: 'List words starting with a specific character.',
    icon: Icons.Sparkles,
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-400',
    hiddenSubjectTypes: [SubjectType.HIRAGANA, SubjectType.KATAKANA, SubjectType.RADICAL],
  },
  {
    id: 'audio',
    name: 'Audio Listen',
    desc: 'Listen to the audio and find the word.',
    icon: Icons.Music,
    color: 'bg-fuchsia-100 text-fuchsia-600 dark:bg-fuchsia-900 dark:text-fuchsia-400',
    hiddenSubjectTypes: [SubjectType.RADICAL],
  },
]
