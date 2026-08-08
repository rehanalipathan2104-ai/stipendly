import { useEffect, useMemo, useState } from 'react';
import { Sparkles, Loader2, Save, Download, FileText, Plus, Trash2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { buildResume, type ResumeResult } from '@/lib/ai';
import { CopyButton } from '@/components/Logo';
import { downloadText, timeAgo } from '@/lib/utils';
import type { ResumeDraft } from '@/lib/types';

export default function ResumeBuilderPage() {
  const { profile } = useAuth();
  const [form, setForm] = useState({
    name: profile?.full_name ?? '',
    email: profile?.email ?? '',
    phone: '',
    role: '',
    targetTitle: '',
    skills: '',
    experience: '',
    education: '',
    projects: '',
    links: '',
  });
  const [result, setResult] = useState<ResumeResult | null>(null);
  const [generating, setGenerating] = useState(false);
  const [drafts, setDrafts] = useState<ResumeDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      const { data } = await supabase.from('resume_drafts').select('*').eq('student_id', profile.id).order('updated_at', { ascending: false });
      setDrafts((data as ResumeDraft[]) ?? []);
    };
    load();
  }, [profile?.id]);

  const skillsArr = useMemo(() => form.skills.split(',').map((s) => s.trim()).filter(Boolean), [form.skills]);

  const generate = async () => {
    setGenerating(true);
    await new Promise((r) => setTimeout(r, 800));
    setResult(buildResume({
      name: form.name,
      email: form.email,
      phone: form.phone,
      role: form.role,
      targetTitle: form.targetTitle,
      skills: skillsArr,
      experience: form.experience,
      education: form.education,
      projects: form.projects,
      links: form.links,
    }));
    setGenerating(false);
  };

  const save = async () => {
    if (!profile || !result) return;
    setSaving(true);
    await supabase.from('resume_drafts').insert({
      student_id: profile.id,
      title: `${form.targetTitle || form.role || 'Untitled'} resume`,
      content: result.resume,
    });
    const { data } = await supabase.from('resume_drafts').select('*').eq('student_id', profile.id).order('updated_at', { ascending: false });
    setDrafts((data as ResumeDraft[]) ?? []);
    setSaving(false);
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  };

  const removeDraft = async (id: string) => {
    await supabase.from('resume_drafts').delete().eq('id', id);
    setDrafts((d) => d.filter((x) => x.id !== id));
  };

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="container-page py-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-display text-ink-900">AI Resume Builder</h1>
        <p className="text-sm text-ink-500 mt-1">Tell us about yourself. The AI structures it into a clean, recruiter-ready resume.</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="card p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Full name"><input value={form.name} onChange={(e) => set('name', e.target.value)} className="input" /></Field>
            <Field label="Email"><input value={form.email} onChange={(e) => set('email', e.target.value)} className="input" /></Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Phone"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} className="input" placeholder="+91…" /></Field>
            <Field label="Target role"><input value={form.targetTitle} onChange={(e) => set('targetTitle', e.target.value)} className="input" placeholder="Frontend Intern" /></Field>
          </div>
          <Field label="Current role / field"><input value={form.role} onChange={(e) => set('role', e.target.value)} className="input" placeholder="CS student" /></Field>
          <Field label="Skills (comma separated)"><input value={form.skills} onChange={(e) => set('skills', e.target.value)} className="input" placeholder="React, Python, Figma" /></Field>
          <Field label="Experience"><textarea value={form.experience} onChange={(e) => set('experience', e.target.value)} rows={3} className="input resize-none" placeholder="Hackathon lead · Built X for Y…" /></Field>
          <Field label="Projects"><textarea value={form.projects} onChange={(e) => set('projects', e.target.value)} rows={3} className="input resize-none" placeholder="Project name — one-line impact + link" /></Field>
          <Field label="Education"><textarea value={form.education} onChange={(e) => set('education', e.target.value)} rows={2} className="input resize-none" placeholder="B.Tech CSE · IIT Delhi · 2026" /></Field>
          <Field label="Links (GitHub, portfolio, LinkedIn)"><input value={form.links} onChange={(e) => set('links', e.target.value)} className="input" placeholder="github.com/you" /></Field>

          <button onClick={generate} disabled={generating || !form.name} className="btn-primary w-full">
            {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            Generate resume
          </button>
        </div>

        {/* Output */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-ink-900 font-display flex items-center gap-2"><FileText size={16} /> Preview</h3>
              {result && <CopyButton text={result.resume} />}
            </div>
            {!result ? (
              <div className="text-center py-12 text-sm text-ink-400">
                <FileText size={32} className="mx-auto mb-2 text-ink-300" />
                Your generated resume will appear here.
              </div>
            ) : (
              <div className="space-y-3">
                <pre className="text-xs font-mono text-ink-700 whitespace-pre-wrap bg-ink-50 rounded-xl p-4 max-h-96 overflow-y-auto">{result.resume}</pre>
                {result.suggestions.length > 0 && (
                  <div className="rounded-xl bg-accent-50 border border-accent-200 p-3">
                    <p className="text-xs font-semibold text-accent-800 mb-1">Suggestions to strengthen your resume</p>
                    <ul className="space-y-1">
                      {result.suggestions.map((s, i) => <li key={i} className="text-xs text-accent-700">• {s}</li>)}
                    </ul>
                  </div>
                )}
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving} className="btn-secondary flex-1 text-sm">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : savedFlash ? <Check size={14} className="text-brand-600" /> : <Save size={14} />}
                    {savedFlash ? 'Saved' : 'Save draft'}
                  </button>
                  <button onClick={() => downloadText('resume.txt', result.resume)} className="btn-secondary flex-1 text-sm">
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>
            )}
          </div>

          {drafts.length > 0 && (
            <div className="card p-5">
              <h3 className="font-bold text-ink-900 font-display mb-3">Saved drafts</h3>
              <div className="space-y-2">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-ink-200 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-800 truncate">{d.title}</p>
                      <p className="text-xs text-ink-400">{timeAgo(d.updated_at)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => downloadText(`${d.title}.txt`, d.content)} className="btn-ghost p-1.5"><Download size={14} /></button>
                      <button onClick={() => removeDraft(d.id)} className="btn-ghost p-1.5 text-danger-500"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="label">{label}</label>{children}</div>;
}
