export type Role = 'student' | 'provider' | 'admin';

export type InternshipStatus = 'pending' | 'active' | 'dismissed' | 'banned' | 'closed';
export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn';
export type ReportStatus = 'open' | 'reviewing' | 'resolved' | 'dismissed';
export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  is_admin: boolean;
  is_banned: boolean;
  avatar_url: string | null;
  bio: string | null;
  company_name: string | null;
  website: string | null;
  created_at: string;
}

export interface Internship {
  id: string;
  provider_id: string;
  title: string;
  company_name: string;
  domain: string | null;
  domain_verified: boolean;
  domain_verified_at: string | null;
  location: string | null;
  is_remote: boolean;
  duration_weeks: number | null;
  stipend_min: number | null;
  stipend_max: number | null;
  description: string;
  requirements: string;
  skills: string[];
  category: string | null;
  status: InternshipStatus;
  dismiss_reason: string | null;
  honour_score: number;
  risk_assessment: RiskAssessment | null;
  risk_assessed_at: string | null;
  application_count: number;
  created_at: string;
  updated_at: string;
}

export interface RiskAssessment {
  risk_level: 'safe' | 'caution' | 'high' | 'critical';
  score: number;
  flags: { code: string; label: string; severity: Severity; explanation: string }[];
  summary: string;
}

export interface HonourEvent {
  id: string;
  internship_id: string;
  delta: number;
  reason: string;
  severity: Severity;
  source: 'report' | 'ai' | 'admin' | 'domain';
  created_at: string;
}

export interface Report {
  id: string;
  internship_id: string;
  reporter_id: string;
  flag_code: string;
  details: string;
  ai_analysis: { flags: string[]; summary: string } | null;
  status: ReportStatus;
  created_at: string;
}

export interface Application {
  id: string;
  internship_id: string;
  student_id: string;
  cover_letter: string;
  resume_text: string;
  status: ApplicationStatus;
  created_at: string;
}

export interface ResumeDraft {
  id: string;
  student_id: string;
  title: string;
  content: string;
  target_internship_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface FlagGlossary {
  id: string;
  code: string;
  label: string;
  severity: Severity;
  points: number;
  description: string | null;
}
