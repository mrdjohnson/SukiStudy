import {
  WKResource,
  WKCollection,
  User,
  Summary,
  Subject,
  Assignment,
  StudyMaterial,
} from '../types'

const BASE_URL = 'https://api.wanikani.com/v2'

class WaniKaniService {
  private token: string | null = null
  private requestTimestamps: number[] = []
  private readonly MAX_REQUESTS = 50 // Requests per minute
  private readonly TIME_WINDOW = 60000 // 1 minute in ms

  setToken(token: string) {
    this.token = token
  }

  /**
   * Enforces rate limiting by delaying execution if the limit is reached.
   */
  private async throttle(): Promise<void> {
    const now = Date.now()
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.TIME_WINDOW)

    if (this.requestTimestamps.length >= this.MAX_REQUESTS) {
      const oldest = this.requestTimestamps[0]
      const waitTime = this.TIME_WINDOW - (now - oldest) + 500

      if (waitTime > 0) {
        console.warn(`[WaniKaniService] Rate limit reached. Waiting ${Math.round(waitTime)}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return this.throttle()
      }
    }
    this.requestTimestamps.push(Date.now())
  }

  public async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.token) throw new Error('API Token not set')

    await this.throttle()

    // Handle full URLs (for pagination) vs endpoints
    const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Wanikani-Revision': '20170710',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      if (response.status === 401) throw new Error('Invalid API Key')
      if (response.status === 429) {
        console.warn('[WaniKaniService] Received 429. Backing off...')
        await new Promise(resolve => setTimeout(resolve, 5000))
        return this.request<T>(endpoint, options)
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  async getUser(): Promise<WKResource<User>> {
    return this.request<WKResource<User>>('/user')
  }

  async getSummary(): Promise<WKResource<Summary>> {
    return this.request<WKResource<Summary>>('/summary')
  }

  // --- Fetching for UI (Specific IDs) ---

  async getSubjects(ids: number[]): Promise<WKCollection<Subject>> {
    if (ids.length === 0)
      return {
        object: 'collection',
        url: '',
        pages: { per_page: 0, next_url: null, previous_url: null },
        total_count: 0,
        data: [],
      }
    const idsString = ids.join(',')
    return this.request<WKCollection<Subject>>(`/subjects?ids=${idsString}`)
  }

  async getLevelSubjects(levels: number[]): Promise<WKCollection<Subject>> {
    return this.request<WKCollection<Subject>>(`/subjects?levels=${levels.join(',')}`)
  }

  async getAssignments(
    subjectIds?: number[],
    levels?: number[],
    srsStages?: number[],
  ): Promise<WKCollection<Assignment>> {
    const params = new URLSearchParams()
    if (subjectIds && subjectIds.length > 0) params.append('subject_ids', subjectIds.join(','))
    if (levels && levels.length > 0) params.append('levels', levels.join(','))
    if (srsStages && srsStages.length > 0) params.append('srs_stages', srsStages.join(','))
    return this.request<WKCollection<Assignment>>(`/assignments?${params.toString()}`)
  }

  async getStudyMaterials(subjectIds: number[]): Promise<WKCollection<StudyMaterial>> {
    if (subjectIds.length === 0)
      return {
        object: 'collection',
        url: '',
        pages: { per_page: 0, next_url: null, previous_url: null },
        total_count: 0,
        data: [],
      }
    const params = new URLSearchParams()
    params.append('subject_ids', subjectIds.join(','))
    return this.request<WKCollection<StudyMaterial>>(`/study_materials?${params.toString()}`)
  }

  // --- Fetching for Sync (All/Incremental) ---

  async getSubjectsUpdatedAfter(date?: string): Promise<WKCollection<Subject>> {
    const params = new URLSearchParams()
    if (date) params.append('updated_after', date)
    return this.request<WKCollection<Subject>>(`/subjects?${params.toString()}`)
  }

  async getAssignmentsUpdatedAfter(date?: string): Promise<WKCollection<Assignment>> {
    const params = new URLSearchParams()
    if (date) params.append('updated_after', date)
    return this.request<WKCollection<Assignment>>(`/assignments?${params.toString()}`)
  }

  async getStudyMaterialsUpdatedAfter(date?: string): Promise<WKCollection<StudyMaterial>> {
    const params = new URLSearchParams()
    if (date) params.append('updated_after', date)
    return this.request<WKCollection<StudyMaterial>>(`/study_materials?${params.toString()}`)
  }

  // --- Actions ---

  async startAssignment(assignmentId: number) {
    return this.request(`/assignments/${assignmentId}/start`, {
      method: 'PUT',
    })
  }

  async createReview(
    assignmentId: number,
    incorrectMeaningAnswers: number,
    incorrectReadingAnswers: number,
  ) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        review: {
          assignment_id: assignmentId,
          incorrect_meaning_answers: incorrectMeaningAnswers,
          incorrect_reading_answers: incorrectReadingAnswers,
        },
      }),
    })
  }
}

export const waniKaniService = new WaniKaniService()
