export enum SubjectType {
  RADICAL = 'radical',
  KANJI = 'kanji',
  VOCABULARY = 'vocabulary',
  HIRAGANA = 'hiragana',
  KATAKANA = 'katakana'
}

export interface WKResource<T> {
  id: number
  object: string
  url: string
  data_updated_at: string
  data: T
}

export interface WKCollection<T> {
  object: 'collection'
  url: string
  pages: {
    per_page: number
    next_url: string | null
    previous_url: string | null
  }
  total_count: number
  data: WKResource<T>[]
}

export interface User {
  id?: string // Added for DB compatibility
  username: string
  level: number
  started_at: string
  current_vacation_started_at: string | null
  profile_url: string
}

export interface StudyMaterial {
  id?: number
  created_at: string
  subject_id: number
  subject_type: string
  meaning_note: string | null
  reading_note: string | null
  meaning_synonyms: string[]
  hidden: boolean
}

export interface Subject {
  id?: number // Required for SignalDB matching, though optional in raw API type
  object?: string
  url?: string
  created_at: string
  level: number
  slug: string
  hidden_at: string | null
  document_url: string
  characters: string | null
  character_images: {
    url: string
    metadata: {
      color?: string
      dimensions?: string
      style_name?: string
    }
    content_type: string
  }[]
  meanings: {
    meaning: string
    primary: boolean
    accepted_answer: boolean
  }[]
  auxiliary_meanings: {
    meaning: string
    type: string
  }[]
  readings?: {
    type: string
    primary: boolean
    reading: string
    accepted_answer: boolean
  }[]
  component_subject_ids: number[]
  amalgamation_subject_ids: number[]
  visually_similar_subject_ids: number[]
  meaning_mnemonic: string
  reading_mnemonic?: string
  lesson_position: number
  spaced_repetition_system_id: number
  pronunciation_audios?: {
    url: string
    content_type: string
    metadata: {
      gender: string
      source_id: number
      pronunciation: string
      voice_actor_id: number
      voice_actor_name: string
      voice_description: string
    }
  }[]
  context_sentences?: {
    en: string
    ja: string
  }[]
}

export interface Assignment {
  id?: number
  created_at: string
  subject_id: number
  subject_type: string
  srs_stage: number
  unlocked_at: string | null
  started_at: string | null
  passed_at: string | null
  burned_at: string | null
  available_at: string | null
  resurrected_at: string | null
  hidden: boolean
}

export interface Summary {
  lessons: {
    available_at: string
    subject_ids: number[]
  }[]
  next_reviews_at: string | null
  reviews: {
    available_at: string
    subject_ids: number[]
  }[]
}

export interface GameItem {
  subject: Subject
  assignment?: Assignment
  isReviewable: boolean
}

export interface GameResultData {
  gameId: string
  score: number
  maxScore: number
  timeTaken: number // in seconds
  history: {
    subject: Subject
    correct: boolean
  }[]
}

export type FlashcardMode = 'lesson' | 'review' | 'browse'
