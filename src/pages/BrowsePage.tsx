import { useEffect, useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ShieldCheck, ShieldAlert, X, Inbox } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { Internship } from '@/lib/types';
import InternshipCard from '@/components/InternshipCard';
import { useRouter } from '@/lib/router';
import { classNames } from '@/lib/utils';
import { CATEGORY_OPTIONS } from '@/lib/ai';

export default function BrowsePage() {
  const { navigate } = useRouter();
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [trustOnly, setTrustOnly] = useState(false);
  const [sort, setSort] = useState<'recent' | 'honour' | 'stipend'>('recent');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      let q = supabase
        .from('internships')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      const { data, error } = await q;
      if (error) console.error(error);
      setInternships((data as Internship[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = internships.filter((i) => {
      if (query) {
        const q = query.toLowerCase();
        if (!i.title.toLowerCase().includes(q) && !i.company_name.toLowerCase().includes(q) && !i.skills.some((s) => s.toLowerCase().includes(q))) return false;
      }
      if (category && i.category !== category) return false;
      if (remoteOnly && !i.is_remote) return false;
      if (trustOnly && i.honour_score < 80) return false;
      return true;
    });
    if (sort === 'honour') list = [...list].sort((a, b) => b.honour_score - a.honour_score);
    else if (sort === 'stipend') list = [...list].sort((a, b) => (b.stipend_max ?? 0) - (a.stipend_max ?? 0));
    return list;
  }, [internships, query, category, remoteOnly, trustOnly, sort]);

  const hasFilters = query || category || remoteOnly || trustOnly;
  const clearFilters = () => {
    setQuery('');
    setCategory(null);
    setRemoteOnly(false);
    setTrustOnly(false);
  };

  return (
    <div className="container-page py-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900">Browse internships</h1>
          <p className="text-sm text-ink-500 mt-1">
            {filtered.length} vetted {filtered.length === 1 ? 'listing' : 'listings'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, company, skill…"
              className="input pl-9 w-64"
            />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="input w-36">
            <option value="recent">Most recent</option>
            <option value="honour">Highest honour</option>
            <option value="stipend">Top stipend</option>
          </select>
        </div>
      </div>

      <div className="grid lg:grid-cols-[220px_1fr] gap-6">
        {/* Filters */}
        <aside className="space-y-4">
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                <SlidersHorizontal size={15} /> Filters
              </span>
              {hasFilters && (
                <button onClick={clearFilters} className="text-xs text-ink-400 hover:text-ink-700 flex items-center gap-1">
                  <X size={12} /> Clear
                </button>
              )}
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
                <input type="checkbox" checked={remoteOnly} onChange={(e) => setRemoteOnly(e.target.checked)} className="accent-brand-600" />
                Remote only
              </label>
              <label className="flex items-center gap-2 text-sm text-ink-600 cursor-pointer">
                <input type="checkbox" checked={trustOnly} onChange={(e) => setTrustOnly(e.target.checked)} className="accent-brand-600" />
                Trusted only (80+)
              </label>
            </div>
          </div>
          <div className="card p-4">
            <p className="text-sm font-semibold text-ink-800 mb-3">Category</p>
            <div className="space-y-1">
              <button
                onClick={() => setCategory(null)}
                className={classNames('block w-full text-left px-2.5 py-1.5 rounded-lg text-sm', !category ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-ink-100')}
              >
                All categories
              </button>
              {CATEGORY_OPTIONS.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={classNames('block w-full text-left px-2.5 py-1.5 rounded-lg text-sm', category === c ? 'bg-brand-50 text-brand-700 font-semibold' : 'text-ink-600 hover:bg-ink-100')}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div className="card p-4 text-xs text-ink-500 leading-relaxed">
            <p className="font-semibold text-ink-700 mb-1 flex items-center gap-1.5"><ShieldCheck size={14} className="text-brand-600" /> How trust works</p>
            Each listing carries an honour score from 0–100. It decays with verified red flags and auto-bans the provider below 40.
          </div>
        </aside>

        {/* Results */}
        <div>
          {loading ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => <div key={i} className="card p-5 space-y-3"><div className="skeleton h-4 w-2/3" /><div className="skeleton h-3 w-1/3" /><div className="skeleton h-20 w-full" /></div>)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card p-12 text-center">
              <Inbox size={36} className="text-ink-300 mx-auto mb-3" />
              <p className="font-semibold text-ink-800">No internships match your filters</p>
              <p className="text-sm text-ink-500 mt-1">Try widening your search or clearing filters.</p>
              {hasFilters && <button onClick={clearFilters} className="btn-secondary mt-4">Clear filters</button>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {filtered.map((i) => (
                <InternshipCard key={i.id} internship={i} onClick={() => navigate({ name: 'internship', id: i.id })} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
