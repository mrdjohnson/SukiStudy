
import { WKResource, WKCollection, User, Summary, Subject, Assignment, StudyMaterial } from '../types';

const BASE_URL = 'https://api.wanikani.com/v2';

class WaniKaniService {
  private token: string | null = null;
  private requestTimestamps: number[] = [];
  private readonly MAX_REQUESTS = 25; // Strict limit to avoid 429s
  private readonly TIME_WINDOW = 60000; // 1 minute in ms

  setToken(token: string) {
    this.token = token;
  }

  /**
   * Enforces rate limiting by delaying execution if the limit is reached.
   * Implements a token bucket-style check.
   */
  private async throttle(): Promise<void> {
    const now = Date.now();
    // Remove timestamps that are older than the time window
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < this.TIME_WINDOW);

    if (this.requestTimestamps.length >= this.MAX_REQUESTS) {
      // Calculate how long to wait until the oldest request expires
      const oldest = this.requestTimestamps[0];
      const waitTime = this.TIME_WINDOW - (now - oldest) + 500; // Add 500ms buffer
      
      if (waitTime > 0) {
        console.warn(`[WaniKaniService] Rate limit reached (${this.requestTimestamps.length}/${this.MAX_REQUESTS}). Waiting ${Math.round(waitTime)}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Recursively check again after waiting to ensure we are safe
        return this.throttle();
      }
    }
    
    // Add current timestamp to the queue
    this.requestTimestamps.push(Date.now());
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    if (!this.token) throw new Error("API Token not set");
    
    // Wait for rate limiter permission
    await this.throttle();

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Wanikani-Revision': '20170710', // Recommended revision
        'Content-Type': 'application/json',
        ...options?.headers
      },
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Invalid API Key");
      
      // Handle 429 explicitly just in case
      if (response.status === 429) {
          console.warn("[WaniKaniService] Received 429 Too Many Requests. Backing off for 5 seconds...");
          await new Promise(resolve => setTimeout(resolve, 5000));
          return this.request<T>(endpoint, options);
      }

      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getUser(): Promise<WKResource<User>> {
    return this.request<WKResource<User>>('/user');
  }

  async getSummary(): Promise<WKResource<Summary>> {
    return this.request<WKResource<Summary>>('/summary');
  }

  async getSubjects(ids: number[]): Promise<WKCollection<Subject>> {
    if (ids.length === 0) return { object: 'collection', url: '', pages: { per_page: 0, next_url: null, previous_url: null }, total_count: 0, data: [] };
    const idsString = ids.join(',');
    return this.request<WKCollection<Subject>>(`/subjects?ids=${idsString}`);
  }

  async getLevelSubjects(levels: number[]): Promise<WKCollection<Subject>> {
    return this.request<WKCollection<Subject>>(`/subjects?levels=${levels.join(',')}`);
  }

  async getAssignments(subjectIds?: number[], levels?: number[], srsStages?: number[]): Promise<WKCollection<Assignment>> {
    // Prevent fetching all assignments if an empty array is explicitly passed but meant to filter
    if (subjectIds && subjectIds.length === 0 && (!levels || levels.length === 0)) {
       return { object: 'collection', url: '', pages: { per_page: 0, next_url: null, previous_url: null }, total_count: 0, data: [] };
    }

    const params = new URLSearchParams();
    if (subjectIds && subjectIds.length > 0) params.append('subject_ids', subjectIds.join(','));
    if (levels && levels.length > 0) params.append('levels', levels.join(','));
    if (srsStages && srsStages.length > 0) params.append('srs_stages', srsStages.join(','));
    
    return this.request<WKCollection<Assignment>>(`/assignments?${params.toString()}`);
  }

  async getStudyMaterials(subjectIds: number[]): Promise<WKCollection<StudyMaterial>> {
    if (subjectIds.length === 0) return { object: 'collection', url: '', pages: { per_page: 0, next_url: null, previous_url: null }, total_count: 0, data: [] };
    const params = new URLSearchParams();
    params.append('subject_ids', subjectIds.join(','));
    return this.request<WKCollection<StudyMaterial>>(`/study_materials?${params.toString()}`);
  }

  async startAssignment(assignmentId: number) {
    return this.request(`/assignments/${assignmentId}/start`, {
      method: 'PUT',
    });
  }

  async createReview(assignmentId: number, incorrectMeaningAnswers: number, incorrectReadingAnswers: number) {
    return this.request('/reviews', {
      method: 'POST',
      body: JSON.stringify({
        review: {
          assignment_id: assignmentId,
          incorrect_meaning_answers: incorrectMeaningAnswers,
          incorrect_reading_answers: incorrectReadingAnswers
        }
      })
    });
  }
}

export const waniKaniService = new WaniKaniService();
