import { useEffect, useState } from 'react';
import { FileText, Send, Clock, CheckCircle2, XCircle, ChevronRight, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Application, Internship } from '@/lib/types';
import { classNames, rupee, statusColor, timeAgo } from '@/lib/utils';

export default function StudentDashboardPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [apps, setApps] = useState<(Application & { internship?: Internship })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!profile) return;
      setLoading(true);
      const { data } = await supabase
        .from('applications')
        .select('*, internship:internships(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });
      setApps((data as (Application & { internship?: Internship })[]) ?? []);
      setLoading(false);
    };
    load();
  }, [profile?.id]);

  const pending = apps.filter((a) => a.status === 'pending');
  const accepted = apps.filter((a) => a.status === 'accepted');

  return (
    <div className="container-page py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900">Your dashboard</h1>
          <p className="text-sm text-ink-500 mt-1">Track applications and build your resume.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => navigate({ name: 'browse' })} className="btn-secondary"><Send size={16} /> Browse internships</button>
          <button onClick={() => navigate({ name: 'resume' })} className="btn-primary"><FileText size={16} /> Resume builder</button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <StatBox label="Total applications" value={apps.length} icon={Send} />
        <StatBox label="Pending" value={pending.length} icon={Clock} />
        <StatBox label="Accepted" value={accepted.length} icon={CheckCircle2} />
      </div>

      <div className="card p-5">
        <h2 className="font-bold text-ink-900 font-display mb-4">Applications</h2>
        {loading ? (
          <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="skeleton h-20 w-full" />)}</div>
        ) : apps.length === 0 ? (
          <div className="text-center py-10">
            <Send size={32} className="text-ink-300 mx-auto mb-2" />
            <p className="text-sm text-ink-500">No applications yet.</p>
            <button onClick={() => navigate({ name: 'browse' })} className="btn-primary mt-3">Find an internship</button>
          </div>
        ) : (
          <div className="space-y-2">
            {apps.map((a) => (
              <button
                key={a.id}
                onClick={() => a.internship && navigate({ name: 'internship', id: a.internship.id })}
                className="w-full text-left rounded-xl border border-ink-200 p-4 hover:border-ink-300 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-ink-900 truncate">{a.internship?.title ?? 'Listing removed'}</p>
                  <p className="text-xs text-ink-400">{a.internship?.company_name} · applied {timeAgo(a.created_at)}</p>
                  {a.internship?.stipend_max && <p className="text-xs text-ink-500 mt-0.5">{rupee(a.internship.stipend_min)}–{rupee(a.internship.stipend_max)} / month</p>}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={classNames('chip', statusColor(a.status))}>{a.status}</span>
                  <ChevronRight size={16} className="text-ink-300" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Send }) {
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
