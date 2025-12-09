
import { WKResource, WKCollection, User, Summary, Subject, Assignment, StudyMaterial } from '../types';

const BASE_URL = 'https://api.wanikani.com/v2';

class WaniKaniService {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string): Promise<T> {
    if (!this.token) throw new Error("API Token not set");
    
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${this.token}`,
        'Wanikani-Revision': '20170710', // Recommended revision
      },
    });

    if (!response.ok) {
      if (response.status === 401) throw new Error("Invalid API Key");
      throw new Error(`API Error: ${response.statusText}`);
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

  async getLevelSubjects(level: number): Promise<WKCollection<Subject>> {
    return this.request<WKCollection<Subject>>(`/subjects?levels=${level}`);
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
}

export const waniKaniService = new WaniKaniService();
