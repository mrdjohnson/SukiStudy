import { faker } from '@faker-js/faker'
import { Factory } from 'fishery'
import { SubjectType } from '../../src/core/types'
import type { Subject } from '../../src/core/types'
import { subjects } from '../../src/core/db'

type SubjectTransientParams = {
  isKana?: boolean
  type?: SubjectType
}

const kanaTypes = [SubjectType.HIRAGANA, SubjectType.KATAKANA]

export const subjectFactory = Factory.define<Subject, SubjectTransientParams>(
  ({ sequence, transientParams, onCreate }) => {
    onCreate(subject => {
      subjects.insert(subject)

      return subject
    })

    const object = transientParams.type ?? SubjectType.VOCABULARY
    const isKana = transientParams.isKana ?? kanaTypes.includes(object)
    const reading = faker.word.sample().toLowerCase()
    const meaning = faker.word.noun()

    return {
      id: sequence,
      object,
      url: faker.internet.url(),
      created_at: faker.date.past().toISOString(),
      level: isKana ? 1 : faker.number.int({ min: 1, max: 60 }),
      slug: faker.helpers.slugify(`${meaning}-${sequence}`).toLowerCase(),
      hidden_at: null,
      document_url: faker.internet.url(),
      characters: faker.string.alpha({ length: 1 }),
      character_images: [],
      meanings: [
        {
          meaning,
          primary: true,
          accepted_answer: true,
        },
      ],
      auxiliary_meanings: [],
      readings: [
        {
          type: 'kunyomi',
          primary: true,
          reading,
          accepted_answer: true,
        },
      ],
      component_subject_ids: [],
      amalgamation_subject_ids: [],
      visually_similar_subject_ids: [],
      meaning_mnemonic: faker.lorem.sentence(),
      reading_mnemonic: faker.lorem.sentence(),
      lesson_position: sequence,
      spaced_repetition_system_id: 1,
      pronunciation_audios: [],
      context_sentences: [],
      isKana,
    }
  },
)
