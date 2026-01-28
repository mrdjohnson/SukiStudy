import _ from 'lodash'
import React from 'react'
import { Icons } from '../components/Icons'

import { SubjectType, GameDefinition } from '../types'

// Lazy-loaded game components (code split)
const AudioQuizGame = React.lazy(() =>
  import('../pages/games/AudioQuizGame').then(m => ({ default: m.AudioQuizGame })),
)
const ConnectGame = React.lazy(() =>
  import('../pages/games/ConnectGame').then(m => ({ default: m.ConnectGame })),
)
const MemoryGame = React.lazy(() =>
  import('../pages/games/MemoryGame').then(m => ({ default: m.MemoryGame })),
)
const QuizGame = React.lazy(() =>
  import('../pages/games/QuizGame').then(m => ({ default: m.QuizGame })),
)
const RecallGame = React.lazy(() =>
  import('../pages/games/RecallGame').then(m => ({ default: m.RecallGame })),
)
const MatchingGame = React.lazy(() =>
  import('../pages/games/MatchingGame').then(m => ({ default: m.MatchingGame })),
)
const TypingGame = React.lazy(() =>
  import('../pages/games/TypingGame').then(m => ({ default: m.TypingGame })),
)
const VariationsQuizGame = React.lazy(() =>
  import('../pages/games/VariationsQuizGame').then(m => ({ default: m.VariationsQuizGame })),
)
// const RadicalCompositionGame = React.lazy(() =>
//   import('../pages/games/RadicalCompositionGame').then(m => ({ default: m.RadicalCompositionGame })),
// )
// const ShiritoriGame = React.lazy(() =>
//   import('../pages/games/ShiritoriGame').then(m => ({ default: m.ShiritoriGame })),
// )

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
  // {
  //   id: 'shiritori',
  //   name: 'Shiritori',
  //   desc: 'Connect words by their last character.',
  //   icon: Icons.Link,
  //   color: 'bg-yellow-100 text-yellow-600',
  //   enabled: false,
  //   component: ShiritoriGame,
  //   // hidden game for now
  //   hiddenSubjectTypes: [
  //     SubjectType.HIRAGANA,
  //     SubjectType.KATAKANA,
  //     SubjectType.RADICAL,
  //     SubjectType.VOCABULARY,
  //   ],
  // },
  // {
  //   id: 'radical-composition',
  //   name: 'Kanji Composition',
  //   desc: 'Construct Kanji from radical parts.',
  //   icon: Icons.Puzzle,
  //   color: 'bg-sky-100 text-sky-600',
  //   enabled: false,
  //   component: RadicalCompositionGame,
  //   // hidden game for now
  //   hiddenSubjectTypes: [
  //     SubjectType.HIRAGANA,
  //     SubjectType.KATAKANA,
  //     SubjectType.RADICAL,
  //     SubjectType.VOCABULARY,
  //   ],
  // },
  {
    id: 'audio',
    name: 'Audio Listen',
    desc: 'Listen to the audio and find the word.',
    icon: Icons.Music,
    color: 'bg-fuchsia-100 text-fuchsia-600',
    component: AudioQuizGame,
    hiddenSubjectTypes: [SubjectType.RADICAL],
  },
]
