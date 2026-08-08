import { useMemo, useState } from 'react';
import { Loader2, Sparkles, Send, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import { assessRisk, improveJobDescription, CATEGORY_OPTIONS, type ImproveResult } from '@/lib/ai';
import AIPanel from '@/components/AIPanel';
import { classNames } from '@/lib/utils';

export default function PostInternshipPage() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [form, setForm] = useState({
    title: '',
    company_name: profile?.company_name ?? '',
    domain: '',
    location: '',
    is_remote: true,
    duration_weeks: 8,
    stipend_min: 5000,
    stipend_max: 15000,
    description: '',
    requirements: '',
    skills: '',
    category: CATEGORY_OPTIONS[0],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const skillsArr = useMemo(() => form.skills.split(',').map((s) => s.trim()).filter(Boolean), [form.skills]);

  const aiInput = {
    title: form.title,
    description: form.description,
    requirements: form.requirements,
    skills: skillsArr,
    stipendMin: form.stipend_min || null,
    stipendMax: form.stipend_max || null,
    durationWeeks: form.duration_weeks || null,
    location: form.location || null,
    isRemote: form.is_remote,
    category: form.category,
  };

  const liveRisk = useMemo(() => (form.title || form.description ? assessRisk(aiInput) : null), [form.title, form.description]);

  const set = (key: keyof typeof form, value: string | number | boolean) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    const assessment = assessRisk(aiInput);
    const { data, error: insErr } = await supabase
      .from('internships')
      .insert({
        provider_id: profile.id,
        title: form.title,
        company_name: form.company_name,
        domain: form.domain || null,
        location: form.location || null,
        is_remote: form.is_remote,
        duration_weeks: form.duration_weeks || null,
        stipend_min: form.stipend_min || null,
        stipend_max: form.stipend_max || null,
        description: form.description,
        requirements: form.requirements,
        skills: skillsArr,
        category: form.category,
        status: 'active',
        risk_assessment: assessment,
        risk_assessed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }
    const newRow = data as { id: string };
    if (assessment.score < 100) {
      const totalDelta = assessment.score - 100;
      await supabase.from('honour_events').insert({
        internship_id: newRow.id,
        delta: totalDelta,
        reason: `AI review: ${assessment.flags.length} red flag${assessment.flags.length > 1 ? 's' : ''} at posting`,
        severity: assessment.risk_level === 'critical' ? 'critical' : assessment.risk_level === 'high' ? 'high' : 'medium',
        source: 'ai',
      });
    }
    await refreshProfile();
    setSuccessId(newRow.id);
    setSubmitting(false);
  };

  if (successId) {
    return (
      <div className="container-narrow py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-brand-100 text-brand-700 mx-auto flex items-center justify-center mb-4">
          <CheckCircle2 size={28} />
        </div>
        <h1 className="text-2xl font-bold font-display text-ink-900">Internship posted</h1>
        <p className="text-ink-500 mt-2">Your listing is live and has been scored by the AI trust engine.</p>
        <div className="flex justify-center gap-3 mt-6">
          <button onClick={() => navigate({ name: 'internship', id: successId })} className="btn-primary">View listing</button>
          <button onClick={() => navigate({ name: 'provider' })} className="btn-secondary">Go to my listings</button>
        </div>
      </div>
    );
  }

  const applyImproved = (res: ImproveResult) => setForm((f) => ({ ...f, description: res.polished }));

  return (
    <div className="container-page py-8 max-w-4xl">
      <h1 className="text-2xl font-bold font-display text-ink-900">Post an internship</h1>
      <p className="text-sm text-ink-500 mt-1">The AI trust engine scores your listing as you write. A higher honour score attracts more students.</p>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-6">
        <div className="card p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Job title">
              <input value={form.title} onChange={(e) => set('title', e.target.value)} className="input" placeholder="Frontend Intern" />
            </Field>
            <Field label="Company name">
              <input value={form.company_name} onChange={(e) => set('company_name', e.target.value)} className="input" placeholder="Acme Labs" />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Company domain" hint="Used for domain verification">
              <input value={form.domain} onChange={(e) => set('domain', e.target.value)} className="input" placeholder="acmelabs.com" />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => set('category', e.target.value)} className="input">
                {CATEGORY_OPTIONS.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Field label="Location">
              <input value={form.location} onChange={(e) => set('location', e.target.value)} className="input" placeholder="Bengaluru" disabled={form.is_remote} />
            </Field>
            <Field label="Duration (weeks)">
              <input type="number" value={form.duration_weeks} onChange={(e) => set('duration_weeks', Number(e.target.value))} className="input" min={1} />
            </Field>
            <Field label="Remote">
              <label className="flex items-center gap-2 h-[42px] text-sm text-ink-700">
                <input type="checkbox" checked={form.is_remote} onChange={(e) => set('is_remote', e.target.checked)} className="accent-brand-600 h-4 w-4" />
                Work from anywhere
              </label>
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Stipend min (₹/month)">
              <input type="number" value={form.stipend_min} onChange={(e) => set('stipend_min', Number(e.target.value))} className="input" min={0} />
            </Field>
            <Field label="Stipend max (₹/month)">
              <input type="number" value={form.stipend_max} onChange={(e) => set('stipend_max', Number(e.target.value))} className="input" min={0} />
            </Field>
          </div>
          <Field label="Skills (comma separated)">
            <input value={form.skills} onChange={(e) => set('skills', e.target.value)} className="input" placeholder="React, TypeScript, Tailwind" />
          </Field>
          <Field label="Description">
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={6} className="input resize-none" placeholder="Describe the role, what the intern will work on, and the mentorship they'll receive." />
          </Field>
          <Field label="Requirements">
            <textarea value={form.requirements} onChange={(e) => set('requirements', e.target.value)} rows={3} className="input resize-none" placeholder="What should the intern know or be willing to learn?" />
          </Field>

          {liveRisk && liveRisk.flags.length > 0 && (
            <div className="rounded-xl bg-accent-50 border border-accent-200 p-4">
              <p className="text-sm font-semibold text-accent-800 flex items-center gap-1.5 mb-2"><AlertTriangle size={15} /> Live trust preview</p>
              <ul className="space-y-1 text-xs text-accent-700">
                {liveRisk.flags.slice(0, 3).map((f) => <li key={f.code}>• {f.label}</li>)}
              </ul>
            </div>
          )}

          {error && <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-2 pt-2 border-t border-ink-100">
            <button onClick={() => navigate({ name: 'provider' })} className="btn-secondary">Cancel</button>
            <button onClick={submit} disabled={submitting || !form.title || !form.description} className="btn-primary">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Publish internship
            </button>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-ink-400 font-semibold mb-3">Live honour score</p>
            {liveRisk ? (
              <div className="flex items-center gap-4">
                <div className={classNames('h-16 w-16 rounded-full flex items-center justify-center font-bold text-xl font-display',
                  liveRisk.score >= 80 ? 'bg-brand-100 text-brand-700' :
                  liveRisk.score >= 60 ? 'bg-accent-100 text-accent-700' :
                  liveRisk.score >= 40 ? 'bg-orange-100 text-orange-700' : 'bg-danger-100 text-danger-700')}>
                  {liveRisk.score}
                </div>
                <div>
                  <p className={classNames('font-semibold text-sm',
                    liveRisk.score >= 80 ? 'text-brand-700' :
                    liveRisk.score >= 60 ? 'text-accent-700' :
                    liveRisk.score >= 40 ? 'text-orange-700' : 'text-danger-700')}>
                    {liveRisk.risk_level === 'safe' ? 'Trusted' : liveRisk.risk_level === 'caution' ? 'Caution' : liveRisk.risk_level === 'high' ? 'High risk' : 'Critical'}
                  </p>
                  <p className="text-xs text-ink-400 mt-0.5">{liveRisk.flags.length} flag{liveRisk.flags.length !== 1 ? 's' : ''} detected</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-400">Start writing to see a live trust score.</p>
            )}
          </div>

          <AIPanel mode="improve" input={aiInput} onApply={applyImproved} />
          <AIPanel mode="review" input={aiInput} />

          <div className="card p-4 text-xs text-ink-500 leading-relaxed">
            <p className="font-semibold text-ink-700 mb-1 flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-600" /> Domain verification</p>
            Enter your company domain. After posting, you can trigger verification from your listings dashboard.
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{hint && <span className="ml-1.5 text-xs font-normal text-ink-400">{hint}</span>}</label>
      {children}
    </div>
  );
}
