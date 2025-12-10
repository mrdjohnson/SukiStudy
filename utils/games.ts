import { Icons } from '../../components/Icons';

export const games = [
  {
    id: 'memory',
    name: 'Memory Match',
    desc: 'Match characters to their meanings or readings.',
    icon: Icons.Brain,
    color: 'bg-purple-100 text-purple-600'
  },
  {
    id: 'quiz',
    name: 'Quick Quiz',
    desc: 'Multiple choice speed run of your learned items.',
    icon: Icons.FileQuestion,
    color: 'bg-orange-100 text-orange-600'
  },
  {
    id: 'sorting',
    name: 'Matching Pairs',
    desc: 'Find matching pairs of Kanji and Meanings.',
    icon: Icons.Shuffle,
    color: 'bg-blue-100 text-blue-600'
  },
  {
    id: 'connect',
    name: 'Hiragana Connect',
    desc: 'Trace the path of kana to spell the word.',
    icon: Icons.GridDots,
    color: 'bg-teal-100 text-teal-600'
  },
  {
    id: 'variations',
    name: 'Kanji Readings',
    desc: 'Select all valid readings for a Kanji.',
    icon: Icons.ListCheck,
    color: 'bg-rose-100 text-rose-600'
  },
  {
    id: 'recall',
    name: 'Word Recall',
    desc: 'List words starting with a specific character.',
    icon: Icons.Sparkles,
    color: 'bg-indigo-100 text-indigo-600'
  },
  {
    id: 'typing',
    name: 'Typing Practice',
    desc: 'Type the correct reading or meaning.',
    icon: Icons.Keyboard,
    color: 'bg-emerald-100 text-emerald-600'
  },
  {
    id: 'radical-composition',
    name: 'Kanji Composition',
    desc: 'Construct Kanji from radical parts.',
    icon: Icons.Puzzle,
    color: 'bg-sky-100 text-sky-600'
  },
  {
    id: 'audio-quiz',
    name: 'Audio Listen',
    desc: 'Listen to the audio and find the word.',
    icon: Icons.Music,
    color: 'bg-fuchsia-100 text-fuchsia-600'
  }
];