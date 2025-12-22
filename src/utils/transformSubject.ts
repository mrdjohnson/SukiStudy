import { Subject } from '../types'

export function transformSubject(subject: Subject) {
  let object = subject.object

  if (!object && subject.document_url) {
    if (subject.document_url.startsWith('https://www.wanikani.com/radicals')) {
      object = 'radical'
    } else if (subject.document_url.startsWith('https://www.wanikani.com/kanji')) {
      object = 'kanji'
    } else {
      console.error('missing object for subject: ', subject)
    }
  }

  return {
    ...subject,
    object,
  }
}
