import { useEffect, useState } from 'react';
import { Plus, Briefcase, ShieldCheck, Loader2, Mail, Building2, CheckCircle2, XCircle, Users, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Internship, Application, Profile } from '@/lib/types';
import HonourScore from '@/components/HonourScore';
import { classNames, rupee, statusColor, timeAgo } from '@/lib/utils';

export default function ProviderDashboardPage() {
  const { profile, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [students, setStudents] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [companyForm, setCompanyForm] = useState({ company_name: '', website: '', domain: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Internship | null>(null);

  const load = async () => {
    if (!profile) return;
    setLoading(true);
    const { data: jobs } = await supabase.from('internships').select('*').eq('provider_id', profile.id).order('created_at', { ascending: false });
    setInternships((jobs as Internship[]) ?? []);
    const { data: applications } = await supabase
      .from('applications')
      .select('*, internship:internships(*)')
      .in('internship_id', (jobs as Internship[])?.map((j) => j.id) ?? []);
    const appList = (applications as unknown as Application[]) ?? [];
    setApps(appList);
    const studentIds = [...new Set(appList.map((a) => a.student_id))];
    if (studentIds.length) {
      const { data: studs } = await supabase.from('profiles').select('*').in('id', studentIds);
      const map: Record<string, Profile> = {};
      (studs as Profile[])?.forEach((s) => { map[s.id] = s; });
      setStudents(map);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [profile?.id]);

  useEffect(() => {
    if (profile) setCompanyForm({ company_name: profile.company_name ?? '', website: profile.website ?? '', domain: '' });
  }, [profile]);

  const verifyDomain = async (job: Internship) => {
    setVerifying(job.id);
    const rawDomain = job.domain || companyForm.website || companyForm.domain;
    const clean = (rawDomain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
    const email = profile?.email ?? '';
    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-domain`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ domain: clean, internship_id: job.id, email }),
      });
      if (!res.ok) throw new Error(`Verification failed (${res.status})`);
      const data = await res.json();
      if (!data.verified) {
        alert(`Domain could not be fully verified (${data.score ?? '0/0'}). Checks: ${(data.checks ?? []).map((c: { check: string; detail: string }) => `${c.check}: ${c.detail}`).join(', ')}`);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Domain verification failed');
    } finally {
      setVerifying(null);
      load();
    }
  };

  const updateAppStatus = async (appId: string, status: 'accepted' | 'rejected') => {
    await supabase.from('applications').update({ status }).eq('id', appId);
    load();
  };

  const saveProfile = async () => {
    if (!profile) return;
    setSavingProfile(true);
    await supabase.from('profiles').update({
      company_name: companyForm.company_name,
      website: companyForm.website,
    }).eq('id', profile.id);
    await refreshProfile();
    setSavingProfile(false);
  };

  if (profile?.is_banned) {
    return (
      <div className="container-narrow py-16 text-center">
        <div className="h-14 w-14 rounded-full bg-danger-100 text-danger-600 mx-auto flex items-center justify-center mb-4">
          <XCircle size={28} />
        </div>
        <h1 className="text-xl font-bold font-display text-ink-900">Your account is suspended</h1>
        <p className="text-sm text-ink-500 mt-2 max-w-md mx-auto">
          Repeated red flags brought your honour score below the threshold. Contact support if you believe this is an error.
        </p>
      </div>
    );
  }

  const filteredApps = selectedJob ? apps.filter((a) => a.internship_id === selectedJob.id) : apps;

  return (
    <div className="container-page py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900">Provider dashboard</h1>
          <p className="text-sm text-ink-500 mt-1">Manage your listings, honour score, and applicants.</p>
        </div>
        <button onClick={() => navigate({ name: 'post' })} className="btn-primary">
          <Plus size={16} /> Post internship
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Active listings" value={internships.filter((i) => i.status === 'active').length} icon={Briefcase} />
        <StatCard label="Total applicants" value={apps.length} icon={Users} />
        <StatCard label="Avg honour" value={internships.length ? Math.round(internships.reduce((s, i) => s + i.honour_score, 0) / internships.length) : '—'} icon={ShieldCheck} />
        <StatCard label="Verified domains" value={internships.filter((i) => i.domain_verified).length} icon={CheckCircle2} />
      </div>

      <div className="grid lg:grid-cols-[1fr_320px] gap-6">
        {/* Listings */}
        <div className="space-y-4">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-ink-900 font-display">Your listings</h2>
              <button onClick={load} className="btn-ghost text-xs"><RefreshCw size={13} /> Refresh</button>
            </div>
            {loading ? (
              <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
            ) : internships.length === 0 ? (
              <div className="text-center py-10">
                <Briefcase size={32} className="text-ink-300 mx-auto mb-2" />
                <p className="text-sm text-ink-500">You haven't posted any internships yet.</p>
                <button onClick={() => navigate({ name: 'post' })} className="btn-primary mt-3">Post your first</button>
              </div>
            ) : (
              <div className="space-y-2">
                {internships.map((job) => (
                  <div key={job.id} className="rounded-xl border border-ink-200 p-4 hover:border-ink-300 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <button onClick={() => navigate({ name: 'internship', id: job.id })} className="text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={classNames('chip', statusColor(job.status))}>{job.status}</span>
                          {job.domain_verified && <span className="chip bg-brand-100 text-brand-700"><ShieldCheck size={10} /> Verified</span>}
                        </div>
                        <p className="font-semibold text-ink-900 truncate">{job.title}</p>
                        <p className="text-xs text-ink-400">{job.application_count} applicants · {timeAgo(job.created_at)}</p>
                      </button>
                      <HonourScore score={job.honour_score} size="sm" showLabel={false} />
                    </div>
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-ink-100">
                      {!job.domain_verified && (
                        <button onClick={() => verifyDomain(job)} disabled={verifying === job.id} className="btn-ghost text-xs">
                          {verifying === job.id ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                          Verify domain
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                        className={classNames('btn-ghost text-xs', selectedJob?.id === job.id && 'bg-brand-50 text-brand-700')}
                      >
                        <Users size={13} /> {apps.filter((a) => a.internship_id === job.id).length} applicants
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applicants */}
          {filteredApps.length > 0 && (
            <div className="card p-5">
              <h2 className="font-bold text-ink-900 font-display mb-3">
                Applicants {selectedJob && <span className="text-ink-400 font-normal">· {selectedJob.title}</span>}
              </h2>
              <div className="space-y-3">
                {filteredApps.map((a) => {
                  const student = students[a.student_id];
                  return (
                    <div key={a.id} className="rounded-xl border border-ink-200 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-9 w-9 rounded-lg bg-ink-100 text-ink-600 flex items-center justify-center font-bold text-sm">
                            {(student?.full_name || '?')[0]}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-900 truncate">{student?.full_name ?? 'Applicant'}</p>
                            <p className="text-xs text-ink-400 truncate flex items-center gap-1"><Mail size={10} /> {student?.email}</p>
                          </div>
                        </div>
                        <span className={classNames('chip', statusColor(a.status))}>{a.status}</span>
                      </div>
                      {a.cover_letter && <p className="text-xs text-ink-500 mt-2 italic">"{a.cover_letter}"</p>}
                      {a.status === 'pending' && (
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => updateAppStatus(a.id, 'accepted')} className="btn-primary text-xs py-1.5">
                            <CheckCircle2 size={13} /> Accept
                          </button>
                          <button onClick={() => updateAppStatus(a.id, 'rejected')} className="btn-secondary text-xs py-1.5">
                            <XCircle size={13} /> Reject
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Profile sidebar */}
        <aside className="space-y-4">
          <div className="card p-5">
            <h3 className="font-bold text-ink-900 font-display mb-3 flex items-center gap-2"><Building2 size={16} /> Company profile</h3>
            <div className="space-y-3">
              <div>
                <label className="label">Company name</label>
                <input value={companyForm.company_name} onChange={(e) => setCompanyForm((f) => ({ ...f, company_name: e.target.value }))} className="input" />
              </div>
              <div>
                <label className="label">Website</label>
                <input value={companyForm.website} onChange={(e) => setCompanyForm((f) => ({ ...f, website: e.target.value }))} className="input" placeholder="acmelabs.com" />
              </div>
              <button onClick={saveProfile} disabled={savingProfile} className="btn-secondary w-full text-sm">
                {savingProfile ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Save profile
              </button>
            </div>
          </div>
          <div className="card p-5 text-sm text-ink-500">
            <p className="font-semibold text-ink-700 mb-1">Stipend snapshot</p>
            {internships.length ? (
              <p>Your listings offer {rupee(Math.min(...internships.map((i) => i.stipend_min ?? 0)))}–{rupee(Math.max(...internships.map((i) => i.stipend_max ?? 0)))} / month.</p>
            ) : <p>No stipend data yet.</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Briefcase }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-ink-400 font-semibold uppercase tracking-wide">{label}</p>
        <Icon size={15} className="text-ink-300" />
      </div>
      <p className="text-2xl font-bold font-display text-ink-900">{value}</p>
    </div>
  );
}
