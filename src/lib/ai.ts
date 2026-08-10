import type { RiskAssessment, Severity } from './types';

export const PERSONAL_EMAIL_DOMAINS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'live.com',
  'aol.com', 'icloud.com', 'protonmail.com', 'mail.com', 'yandex.com',
  'gmx.com', 'zoho.com',
]);

export interface FlagDef {
  code: string;
  label: string;
  severity: Severity;
  points: number;
  description: string;
  explanation: (ctx: { email: string | null; domain: string | null; title: string; description: string; stipendMin: number | null; stipendMax: number | null; isRemote: boolean; location: string | null }) => string;
}

export const FLAG_DEFS: FlagDef[] = [
  {
    code: 'upfront_fee',
    label: 'Asks for upfront payment / deposit',
    severity: 'critical',
    points: 40,
    description: 'Provider requests money from the applicant.',
    explanation: () => 'The listing mentions a registration, training, equipment, or security deposit — a classic fake-internship signal.',
  },
  {
    code: 'asks_pii',
    label: 'Requests sensitive personal data upfront',
    severity: 'high',
    points: 22,
    description: 'SSN, bank details, ID scans requested before hiring.',
    explanation: () => 'The listing asks for bank details, government ID numbers, or scans before any offer — never required for a legitimate internship.',
  },
  {
    code: 'unrealistic_pay',
    label: 'Unrealistically high pay for the role',
    severity: 'high',
    points: 25,
    description: 'Listing promises compensation far above market norms.',
    explanation: ({ stipendMax }) => `The advertised stipend (₹${stipendMax?.toLocaleString() ?? '—'} / month) is well above typical internship bands, a common lure used by scams.`,
  },
  {
    code: 'no_company_info',
    label: 'No verifiable company identity',
    severity: 'medium',
    points: 12,
    description: 'Missing or vague company name, website, or address.',
    explanation: () => 'There is no company name, website, or domain that can be independently verified.',
  },
  {
    code: 'generic_email',
    label: 'Uses a free personal email (not a company domain)',
    severity: 'low',
    points: 8,
    description: 'Contact via gmail/yahoo instead of a business domain.',
    explanation: ({ email }) => `The contact email (${email}) uses a free provider instead of a company domain, reducing accountability.`,
  },
  {
    code: 'vague_role',
    label: 'Role responsibilities are vague or undefined',
    severity: 'low',
    points: 6,
    description: 'No clear tasks, deliverables, or learning outcomes.',
    explanation: () => 'The description does not state concrete tasks, deliverables, or learning outcomes — a hallmark of low-quality or fake roles.',
  },
  {
    code: 'no_mentorship',
    label: 'No mention of mentorship or supervision',
    severity: 'low',
    points: 5,
    description: 'Internship offers no guidance or supervisor.',
    explanation: () => 'No mentor, supervisor, or learning support is mentioned — legitimate internships highlight mentorship.',
  },
  {
    code: 'unprofessional_lang',
    label: 'Unprofessional or suspicious language',
    severity: 'medium',
    points: 12,
    description: 'Grammatically erratic, coercive, or scam-like tone.',
    explanation: () => 'The tone is coercive, urgency-driven, or grammatically erratic in ways associated with scam listings.',
  },
  {
    code: 'copy_paste',
    label: 'Description appears copied from another listing',
    severity: 'low',
    points: 6,
    description: 'Duplicate or near-duplicate job text.',
    explanation: () => 'The description contains boilerplate language that appears across many unrelated listings.',
  },
  {
    code: 'impossible_location',
    label: 'Location mismatch or impossible logistics',
    severity: 'medium',
    points: 10,
    description: 'Remote role requiring relocation, contradictory locations.',
    explanation: () => 'The role is marked remote but requires relocation, or lists contradictory locations.',
  },
];

const MONEY_RE = /(₹|rs\.?|inr|rupees?)\s*[\d,]+|usd\s*[\d,]+|\$[\d,]+/gi;
const FEE_RE = /(registration|security|training|equipment|onboarding|refundable)?\s*(fee|deposit|payment|charge)/gi;
const PII_RE = /(aadhaar|pan\s?card|ssn|bank\s?account|upi\s?id|passport|driver'?s?\s?licence|credit\s?card|cvv)/gi;
const URGENCY_RE = /(urgent|immediate|act\s?now|limited\s?seats?|last\s?chance|hurry|offer\s?ends?\s?today|today\s?only)/gi;
const VAGUE_RE = /\b(help\s?out|do\s?stuff|general\s?work|miscellaneous|various\s?tasks|easy\s?work|simple\s?work)\b/gi;
const MENTOR_RE = /(mentor|supervisor|guide|reporting\s?manager|buddy|coach|learning)/i;

function emailDomain(email: string | null): string | null {
  if (!email) return null;
  const at = email.lastIndexOf('@');
  return at > -1 ? email.slice(at + 1).toLowerCase() : null;
}

export function extractEmail(text: string): string | null {
  const m = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  return m ? m[0].toLowerCase() : null;
}

export function assessRisk(input: {
  title: string;
  description: string;
  requirements: string;
  email?: string | null;
  domain?: string | null;
  stipendMin?: number | null;
  stipendMax?: number | null;
  isRemote?: boolean;
  location?: string | null;
}): RiskAssessment {
  const email = input.email ?? extractEmail(`${input.title} ${input.description}`);
  const domain = input.domain ?? emailDomain(email);
  const text = `${input.title}\n${input.description}\n${input.requirements}`.toLowerCase();
  const flags: RiskAssessment['flags'] = [];
  const add = (code: string) => {
    const def = FLAG_DEFS.find((f) => f.code === code);
    if (!def || flags.some((f) => f.code === code)) return;
    flags.push({
      code: def.code,
      label: def.label,
      severity: def.severity,
      explanation: def.explanation({ email, domain, title: input.title, description: input.description, stipendMin: input.stipendMin ?? null, stipendMax: input.stipendMax ?? null, isRemote: input.isRemote ?? false, location: input.location ?? null }),
    });
  };

  if (FEE_RE.test(text)) add('upfront_fee');
  FEE_RE.lastIndex = 0;
  if (PII_RE.test(text)) add('asks_pii');
  PII_RE.lastIndex = 0;
  if (input.stipendMax && input.stipendMax >= 60000) add('unrealistic_pay');
  if (!input.title && !input.description.trim()) add('no_company_info');
  if (email && PERSONAL_EMAIL_DOMAINS.has(emailDomain(email) ?? '')) add('generic_email');
  if (input.description.trim().length < 120) add('vague_role');
  if (!MENTOR_RE.test(text)) add('no_mentorship');
  if (URGENCY_RE.test(text)) add('unprofessional_lang');
  URGENCY_RE.lastIndex = 0;
  if (VAGUE_RE.test(text)) add('copy_paste');
  VAGUE_RE.lastIndex = 0;
  if (input.isRemote && /relocat|must\s?be\s?based|on[-\s]?site\s?only/i.test(text) && /remote/i.test(text)) add('impossible_location');
  if (!input.domain && !input.description.match(/[A-Z][a-zA-Z]+\s?(Inc|LLC|Pvt|Ltd|Technologies|Labs|Studios)/)) {
    if (flags.length < 2) add('no_company_info');
  }

  const severityRank: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  flags.sort((a, b) => severityRank[b.severity] - severityRank[a.severity]);

  const points = flags.reduce((sum, f) => sum + (FLAG_DEFS.find((d) => d.code === f.code)?.points ?? 0), 0);
  const score = Math.max(0, 100 - points);

  let risk_level: RiskAssessment['risk_level'] = 'safe';
  if (score < 40) risk_level = 'critical';
  else if (score < 60) risk_level = 'high';
  else if (score < 80) risk_level = 'caution';

  const summary =
    flags.length === 0
      ? 'No automated red flags detected. The listing looks consistent with legitimate internships.'
      : `Detected ${flags.length} red flag${flags.length > 1 ? 's' : ''}. ` +
        flags.slice(0, 2).map((f) => f.label).join('; ') +
        (flags.length > 2 ? ` and ${flags.length - 2} more.` : '.');

  return { risk_level, score, flags, summary };
}

export interface ImproveResult {
  polished: string;
  suggestions: string[];
  addedSections: string[];
}

export function improveJobDescription(input: {
  title: string;
  description: string;
  requirements: string;
  skills: string[];
  stipendMin?: number | null;
  stipendMax?: number | null;
  durationWeeks?: number | null;
  location?: string | null;
  isRemote?: boolean;
  category?: string | null;
}): ImproveResult {
  const suggestions: string[] = [];
  const addedSections: string[] = [];
  const parts: string[] = [];

  if (input.description.trim().length < 120) {
    suggestions.push('Add a detailed overview of what the intern will work on — concrete projects, not vague "help out" language.');
  }
  if (!MENTOR_RE.test(input.description)) {
    suggestions.push('Name a mentor or supervisor and describe the learning support the intern will receive.');
  }
  if (!/deliver|outcome|learn|grow|goal/i.test(input.description)) {
    suggestions.push('List the deliverables and learning outcomes the intern can expect.');
  }
  if (!input.stipendMin && !input.stipendMax) {
    suggestions.push('State the stipend range clearly. Unpaid or unstated roles deter strong applicants.');
  }

  const polished = `About the role
${input.description.trim().length >= 120 ? input.description.trim() : `We are looking for an enthusiastic ${input.title || 'intern'} to join our team and contribute to real, shipped work. You will be mentored throughout and given ownership of meaningful tasks.`}

What you will do
${input.requirements.trim() || '• Contribute to day-to-day project work alongside the team\n• Take ownership of a defined deliverable each sprint\n• Participate in reviews, stand-ups, and learning sessions'}

What you will learn
• Hands-on experience with ${input.skills.slice(0, 3).join(', ') || 'core industry tools and workflows'}
• Mentorship from experienced team members
• Real-world exposure to how ${input.category || 'this domain'} operates

Requirements
${input.skills.length ? input.skills.map((s) => `• ${s}`).join('\n') : '• Strong willingness to learn and communicate clearly'}

Logistics
• Duration: ${input.durationWeeks ? `${input.durationWeeks} weeks` : '8–12 weeks'}
• Location: ${input.isRemote ? 'Remote (India)' : input.location || 'On-site'}
• Stipend: ${input.stipendMin && input.stipendMax ? `₹${input.stipendMin.toLocaleString()}–₹${input.stipendMax.toLocaleString()} / month` : 'As per industry standards'}
• Mentorship: Yes — every intern is assigned a supervisor`;

  addedSections.push('What you will do', 'What you will learn', 'Logistics');
  return { polished, suggestions, addedSections };
}

export interface ResumeResult {
  resume: string;
  suggestions: string[];
}

export function buildResume(input: {
  name: string;
  email: string;
  phone?: string;
  role: string;
  targetTitle?: string;
  skills: string[];
  experience: string;
  education: string;
  projects: string;
  links?: string;
}): ResumeResult {
  const suggestions: string[] = [];
  const target = input.targetTitle || input.role;
  const skillsLine = input.skills.length ? input.skills.join(' • ') : 'Add your skills for a stronger profile.';

  if (input.experience.trim().length < 40) suggestions.push('Expand your experience with measurable results (e.g. "reduced load time by 30%").');
  if (input.projects.trim().length < 40) suggestions.push('Add at least one project with a one-line impact statement and a link.');
  if (input.skills.length < 3) suggestions.push('List 5–8 skills relevant to the role you are targeting.');
  if (!input.links) suggestions.push('Add a GitHub / portfolio / LinkedIn link so providers can verify your work.');

  const resume = `${input.name}
${input.email}${input.phone ? ` • ${input.phone}` : ''}${input.links ? `\n${input.links}` : ''}

PROFESSIONAL SUMMARY
A motivated ${target.toLowerCase()} seeking an internship to apply ${input.skills.slice(0, 3).join(', ') || 'core skills'} to real-world problems. Eager to contribute while learning from an experienced team.

SKILLS
${skillsLine}

EXPERIENCE
${input.experience.trim() || '• No formal experience yet — see projects below for applied work.'}

PROJECTS
${input.projects.trim() || '• Add a project with the problem, your role, and the outcome.'}

EDUCATION
${input.education.trim() || '• Add your degree, institution, and expected graduation year.'}`;
  return { resume, suggestions };
}

export function analyzeReport(input: { flagCode: string; details: string }): { flags: string[]; summary: string } {
  const flags: string[] = [input.flagCode];
  const text = input.details.toLowerCase();
  if (/money|paid|pay|fee|deposit|transfer/.test(text) && !flags.includes('upfront_fee')) flags.push('upfront_fee');
  if (/id|aadhaar|pan|bank|card|password|otp/.test(text) && !flags.includes('asks_pii')) flags.push('asks_pii');
  if (/rude|threat|abuse|harass|pressur/.test(text) && !flags.includes('unprofessional_lang')) flags.push('unprofessional_lang');
  if (/no\s?response|ghost|disappear|fake|lied|scam/.test(text)) flags.push('no_company_info');

  const summary =
    `The report cites "${input.flagCode}". ` +
    (flags.length > 1 ? `Corroborating signals detected: ${flags.slice(1).join(', ')}.` : 'No additional corroborating signals found in the description.');
  return { flags, summary };
}

export const CATEGORY_OPTIONS = [
  'Software Engineering',
  'Data Science',
  'Design',
  'Marketing',
  'Business / Operations',
  'Content & Writing',
  'Finance',
  'Research',
  'Other',
];
