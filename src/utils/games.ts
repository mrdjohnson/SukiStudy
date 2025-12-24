import _ from 'lodash'
import { Icons } from '../components/Icons'

import { AudioQuizGame } from '../pages/games/AudioQuizGame'
import { ConnectGame } from '../pages/games/ConnectGame'
import { MemoryGame } from '../pages/games/MemoryGame'
import { QuizGame } from '../pages/games/QuizGame'
import { RadicalCompositionGame } from '../pages/games/RadicalCompositionGame'
import { RecallGame } from '../pages/games/RecallGame'
import { ShiritoriGame } from '../pages/games/ShiritoriGame'
import { MatchingGame } from '../pages/games/MatchingGame'
import { TypingGame } from '../pages/games/TypingGame'
import { VariationsQuizGame } from '../pages/games/VariationsQuizGame'

import { GameItem, GameResultData, SubjectType } from '../types'

export interface GameDefinition {
  id: string
  name: string
  desc: string
  icon: any
  color: string
  enabled?: boolean
  component: React.FC<{ items?: GameItem[]; onComplete?: (data: GameResultData) => void }>
  hiddenSubjectTypes: SubjectType[]
}

export const games: GameDefinition[] = [
  {
    id: 'memory',
    name: 'Memory Match',
    desc: 'Match characters to their meanings or readings.',
    icon: Icons.Brain,
    color: 'bg-purple-100 text-purple-600',
    component: MemoryGame,
    hiddenSubjectTypes: [],
  },
  {
    id: 'quiz',
    name: 'Quick Quiz',
    desc: 'Multiple choice speed run of your learned items.',
    icon: Icons.FileQuestion,
    color: 'bg-orange-100 text-orange-600',
    component: QuizGame,
    hiddenSubjectTypes: [],
  },
  {
    id: 'matching',
    name: 'Matching Pairs',
    desc: 'Find matching pairs of Kanji/Kana and Meanings.',
    icon: Icons.Shuffle,
    color: 'bg-blue-100 text-blue-600',
    component: MatchingGame,
    hiddenSubjectTypes: [],
  },
  {
    id: 'typing',
    name: 'Typing Practice',
    desc: 'Type the correct reading or meaning.',
    icon: Icons.Keyboard,
    color: 'bg-emerald-100 text-emerald-600',
    component: TypingGame,
    hiddenSubjectTypes: [],
  },
  {
    id: 'connect',
    name: 'Hiragana Connect',
    desc: 'Trace the path of kana to spell the word.',
    icon: Icons.GridDots,
    color: 'bg-teal-100 text-teal-600',
    component: ConnectGame,
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
    color: 'bg-rose-100 text-rose-600',
    component: VariationsQuizGame,
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
    color: 'bg-indigo-100 text-indigo-600',
    component: RecallGame,
    hiddenSubjectTypes: [SubjectType.HIRAGANA, SubjectType.KATAKANA, SubjectType.RADICAL],
  },
  {
    id: 'shiritori',
    name: 'Shiritori',
    desc: 'Connect words by their last character.',
    icon: Icons.Link,
    color: 'bg-yellow-100 text-yellow-600',
    enabled: false,
    component: ShiritoriGame,
    // hidden game for now
    hiddenSubjectTypes: [
      SubjectType.HIRAGANA,
      SubjectType.KATAKANA,
      SubjectType.RADICAL,
      SubjectType.VOCABULARY,
    ],
  },
  {
    id: 'radical-composition',
    name: 'Kanji Composition',
    desc: 'Construct Kanji from radical parts.',
    icon: Icons.Puzzle,
    color: 'bg-sky-100 text-sky-600',
    enabled: false,
    component: RadicalCompositionGame,
    // hidden game for now
    hiddenSubjectTypes: [
      SubjectType.HIRAGANA,
      SubjectType.KATAKANA,
      SubjectType.RADICAL,
      SubjectType.VOCABULARY,
    ],
  },
  {
    id: 'audio',
    name: 'Audio Listen',
    desc: 'Listen to the audio and find the word.',
    icon: Icons.Music,
    color: 'bg-fuchsia-100 text-fuchsia-600',
    component: AudioQuizGame,
    hiddenSubjectTypes: [SubjectType.HIRAGANA, SubjectType.KATAKANA, SubjectType.RADICAL],
  },
]
