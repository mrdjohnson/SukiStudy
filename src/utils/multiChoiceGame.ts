import _ from 'lodash'
import { GameItem, MultiChoiceGameItem, SubjectType } from '../types'

export const toItemWithAnswer = (
  item: GameItem,
  pairType?: 'reading' | 'meaning',
): MultiChoiceGameItem | null => {
  const { subject } = item
  let question: string | undefined = subject.characters || undefined

  // Fallback to image if no characters (e.g. Radicals)
  if (!question && subject.character_images) {
    question = subject.character_images.find(i => i.content_type === 'image/svg+xml')?.url
  }

  if (!question) return null

  let answer: string | undefined

  if (subject.object === SubjectType.RADICAL) {
    pairType = 'meaning'
  }

  const readingIndex = subject.isKana ? 1 : 0

  answer =
    pairType === 'reading'
      ? subject.readings?.[readingIndex]?.reading
      : subject.meanings?.[0]?.meaning

  if (!answer || question === answer) return null

  return { ...item, answer, question }
}

export const selectUniqueItems = (items: GameItem[], maxItems: number) => {
  const pairType = _.sample(['reading', 'meaning'] as const)

  // Select 6 unique items with non-colliding questions/answers
  const candidates = _.chain(items)
    .map(item => toItemWithAnswer(item, pairType))
    .compact()
    .shuffle()
    .value()

  const selectedItems: Array<(typeof candidates)[0]> = []
  const usedDisplay = new Set<string>()

  for (const candidate of candidates) {
    const { answer, question } = candidate

    if (selectedItems.length === maxItems) break

    // do not allow any duplicates
    if (usedDisplay.has(answer) || usedDisplay.has(question)) continue

    selectedItems.push(candidate)

    usedDisplay.add(answer)
    usedDisplay.add(question)
  }

  return selectedItems
}
