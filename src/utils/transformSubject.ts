import { Subject, SubjectType } from '../types'

export function transformSubject(subject: Subject) {
  let object = subject.object

  if (!object && subject.document_url) {
    if (subject.document_url.startsWith('https://www.wanikani.com/radicals')) {
      object = SubjectType.RADICAL
    } else if (subject.document_url.startsWith('https://www.wanikani.com/kanji')) {
      object = SubjectType.KANJI
    } else if (subject.document_url.startsWith('https://www.wanikani.com/vocabulary')) {
      object = SubjectType.VOCABULARY
    } else {
      console.error('missing object for subject: ', subject)
    }
  }

  return {
    ...subject,
    object,
  }
}
