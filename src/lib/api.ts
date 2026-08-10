const TOKEN_KEY = 'stipendly_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

// ---- Auth ----
export const api = {
  signUp: (email: string, password: string, fullName: string, role: 'student' | 'provider') =>
    request<{ token: string; profile: Profile }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, full_name: fullName, role }),
    }),

  signIn: (email: string, password: string) =>
    request<{ token: string; profile: Profile }>('/auth/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<{ profile: Profile }>('/auth/me'),

  // ---- Profiles ----
  getProfile: (id: string) => request<{ profile: Profile }>(`/profiles/${id}`),
  getProfiles: () => request<{ profiles: Profile[] }>('/profiles'),
  updateProfile: (id: string, body: Partial<Profile>) =>
    request<{ profile: Profile }>(`/profiles/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  banProfile: (id: string, isBanned: boolean) =>
    request<{ success: boolean }>(`/profiles/${id}/ban`, {
      method: 'PATCH',
      body: JSON.stringify({ is_banned: isBanned }),
    }),

  // ---- Internships ----
  getInternships: (params?: { status?: string; provider_id?: string }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.provider_id) qs.set('provider_id', params.provider_id);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<{ internships: Internship[] }>(`/internships${suffix}`);
  },
  getInternship: (id: string) => request<{ internship: Internship }>(`/internships/${id}`),
  getAdminInternships: () => request<{ internships: Internship[] }>('/admin/internships'),
  createInternship: (body: Record<string, unknown>) =>
    request<{ internship: Internship }>('/internships', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateInternship: (id: string, body: Record<string, unknown>) =>
    request<{ internship: Internship }>(`/internships/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ---- Honour events ----
  getHonourEvents: (internshipId: string) =>
    request<{ events: HonourEvent[] }>(`/internships/${internshipId}/honour-events`),
  createHonourEvent: (internshipId: string, body: { delta: number; reason: string; severity: string; source: string }) =>
    request<{ event: HonourEvent }>(`/internships/${internshipId}/honour-events`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ---- Reports ----
  getReports: (internshipId: string) =>
    request<{ reports: Report[] }>(`/internships/${internshipId}/reports`),
  createReport: (internshipId: string, body: { flag_code: string; details: string; ai_analysis: unknown }) =>
    request<{ report: Report }>(`/internships/${internshipId}/reports`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  getAllReports: () =>
    request<{ reports: (Report & { internship?: { title: string; honour_score: number }; reporter?: { full_name: string } })[] }>('/reports'),
  updateReport: (id: string, status: string) =>
    request<{ report: Report }>(`/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ---- Applications ----
  getApplications: (params: { student_id?: string; internship_id?: string }) => {
    const qs = new URLSearchParams();
    if (params.student_id) qs.set('student_id', params.student_id);
    if (params.internship_id) qs.set('internship_id', params.internship_id);
    return request<{ applications: (Application & { internship?: Internship; student?: Profile })[] }>(`/applications?${qs.toString()}`);
  },
  createApplication: (body: { internship_id: string; cover_letter: string; resume_text: string }) =>
    request<{ application: Application }>('/applications', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateApplication: (id: string, status: string) =>
    request<{ application: Application }>(`/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ---- Flag glossary ----
  getFlagGlossary: () => request<{ glossary: FlagGlossary[] }>('/flag-glossary'),
  createFlag: (body: Partial<FlagGlossary>) =>
    request<{ flag: FlagGlossary }>('/flag-glossary', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  updateFlag: (id: string, body: Partial<FlagGlossary>) =>
    request<{ flag: FlagGlossary }>(`/flag-glossary/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  deleteFlag: (id: string) =>
    request<{ success: boolean }>(`/flag-glossary/${id}`, { method: 'DELETE' }),

  // ---- Resume drafts ----
  getResumeDrafts: () => request<{ drafts: ResumeDraft[] }>('/resume-drafts'),
  createResumeDraft: (body: { title: string; content: string }) =>
    request<{ draft: ResumeDraft }>('/resume-drafts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteResumeDraft: (id: string) =>
    request<{ success: boolean }>(`/resume-drafts/${id}`, { method: 'DELETE' }),
};

import type { Profile, Internship, HonourEvent, Report, Application, FlagGlossary, ResumeDraft } from './types';
