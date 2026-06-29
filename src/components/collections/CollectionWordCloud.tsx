import { useEffect, useMemo, useState } from 'react'
import { computeWords } from '@isoterik/react-word-cloud'
import type { WordCloudConfig } from '@isoterik/react-word-cloud'
import clsx from 'clsx'
import type { Subject, SubjectCollection } from '../../core/types'
import { hashString } from '../../core/hash'

type CollectionWordCloudProps = {
  collection: SubjectCollection
  subjects: Subject[]
  className?: string
  maxWords?: number
}

type RenderedWord = {
  text: string
  x: number
  y: number
  rotate: number
  size: number
  fill: string
}

const CLOUD_SIZE = 320

const FONT_FAMILY = 'var(--font-japanese), ui-sans-serif, system-ui'

// Laying out a word cloud runs a d3-cloud collision pass, which is expensive and
// produces a flash on every mount. The layout is a pure function of the seed and
// the chosen subjects, so we cache the fully resolved words (positions + colors)
// keyed by that combination and reuse them across mounts and screens.
//
// The cache key includes the subject ids, so every membership edit produces a
// new entry. Bound the map (evicting the oldest entries) so it can't grow without
// limit over a long-lived session.
const LAYOUT_CACHE_LIMIT = 200
const layoutCache = new Map<string, RenderedWord[]>()

const cacheLayout = (key: string, words: RenderedWord[]) => {
  layoutCache.set(key, words)

  while (layoutCache.size > LAYOUT_CACHE_LIMIT) {
    const oldestKey = layoutCache.keys().next().value
    if (oldestKey === undefined) break
    layoutCache.delete(oldestKey)
  }
}

const createSeededRandom = (seed: string) => {
  let state = hashString(seed) || 1

  return () => {
    state += 0x6d2b79f5
    let next = state
    next = Math.imul(next ^ (next >>> 15), next | 1)
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61)

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296
  }
}

const getSubjectLabel = (subject: Subject) => {
  return (
    subject.characters ||
    subject.meanings.find(meaning => meaning.primary)?.meaning ||
    subject.meanings[0]?.meaning ||
    subject.slug
  )
}

// Pick a stable subset of subjects for the cloud, ordered deterministically by
// the collection seed so the same collection always renders the same words.
const selectCloudSubjects = (
  collection: SubjectCollection,
  subjects: Subject[],
  maxWords: number,
) => {
  return [...subjects]
    .sort((a, b) => {
      const aScore = hashString(`${collection.seed}:subject:${a.id}`)
      const bScore = hashString(`${collection.seed}:subject:${b.id}`)

      return aScore - bScore
    })
    .slice(0, maxWords)
}

const getWordWeight = (collection: SubjectCollection, subject: Subject, variant: number) => {
  return 60 + (hashString(`${collection.seed}:weight:${subject.id}:${variant}`) % 100)
}

// Aim for a full-looking cloud. With only a few subjects we repeat each one a
// handful of times at different sizes (deterministically) so the canvas fills
// out instead of leaving large empty gaps.
const TARGET_WORD_COUNT = 16
const MAX_REPEATS = 6

const buildCloudWords = (collection: SubjectCollection, selectedSubjects: Subject[]) => {
  if (selectedSubjects.length === 0) return []

  const repeats = Math.min(
    MAX_REPEATS,
    Math.max(1, Math.ceil(TARGET_WORD_COUNT / selectedSubjects.length)),
  )

  return selectedSubjects.flatMap(subject => {
    const text = getSubjectLabel(subject)

    return Array.from({ length: repeats }, (_unused, variant) => ({
      text,
      value: getWordWeight(collection, subject, variant),
    }))
  })
}

// Dynamic, readable colors derived from the seed + word so each collection gets
// its own palette while staying legible on the dark thumbnail background.
const getWordFill = (seed: number, text: string) => {
  const hue = hashString(`${seed}:hue:${text}`) % 360
  const saturation = 65 + (hashString(`${seed}:saturation:${text}`) % 25)
  const lightness = 62 + (hashString(`${seed}:lightness:${text}`) % 20)

  return `hsl(${hue} ${saturation}% ${lightness}%)`
}

export const CollectionWordCloud = ({
  collection,
  subjects,
  className,
  maxWords = 10,
}: CollectionWordCloudProps) => {
  const selectedSubjects = useMemo(
    () => selectCloudSubjects(collection, subjects, maxWords),
    [collection, maxWords, subjects],
  )

  const cacheKey = useMemo(
    () => `${collection.seed}:${maxWords}:${selectedSubjects.map(subject => subject.id).join(',')}`,
    [collection.seed, maxWords, selectedSubjects],
  )

  const [words, setWords] = useState<RenderedWord[] | null>(() => layoutCache.get(cacheKey) ?? null)

  useEffect(() => {
    const cached = layoutCache.get(cacheKey)
    if (cached) {
      setWords(cached)
      return
    }

    if (selectedSubjects.length === 0) {
      setWords([])
      return
    }

    let cancelled = false

    const config: WordCloudConfig = {
      words: buildCloudWords(collection, selectedSubjects),
      width: CLOUD_SIZE,
      height: CLOUD_SIZE,
      padding: 1,
      font: FONT_FAMILY,
      fontWeight: '800',
      fontSize: word => 20 + ((word.value - 60) / 100) * 40,
      rotate: word => {
        const rotation = hashString(`${collection.seed}:rotate:${word.text}`) % 3

        return rotation === 0 ? -8 : rotation === 1 ? 0 : 8
      },
      random: createSeededRandom(cacheKey),
    }

    computeWords(config, () => {})
      .then(computed => {
        if (cancelled) return

        const rendered = computed.map<RenderedWord>(word => ({
          text: word.text,
          x: word.x ?? 0,
          y: word.y ?? 0,
          rotate: word.rotate ?? 0,
          size: word.size ?? 16,
          fill: getWordFill(collection.seed, word.text),
        }))

        cacheLayout(cacheKey, rendered)
        setWords(rendered)
      })
      .catch(() => {
        if (!cancelled) setWords([])
      })

    return () => {
      cancelled = true
    }
  }, [cacheKey, collection.seed, selectedSubjects])

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-xl bg-black/30 border border-white/10',
        className,
      )}
      aria-hidden
    >
      {words && words.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-white/60">
          Empty collection
        </div>
      )}

      {words && words.length > 0 && (
        <svg
          viewBox={`0 0 ${CLOUD_SIZE} ${CLOUD_SIZE}`}
          className="absolute inset-0 h-full w-full"
          preserveAspectRatio="xMidYMid slice"
        >
          <g
            transform={`translate(${CLOUD_SIZE / 2} ${CLOUD_SIZE / 2})`}
            fontFamily={FONT_FAMILY}
            fontWeight={800}
          >
            {words.map((word, index) => (
              <text
                key={`${word.text}-${index}`}
                textAnchor="middle"
                dominantBaseline="central"
                transform={`translate(${word.x} ${word.y}) rotate(${word.rotate})`}
                fontSize={word.size}
                fill={word.fill}
              >
                {word.text}
              </text>
            ))}
          </g>
        </svg>
      )}
    </div>
  )
}
