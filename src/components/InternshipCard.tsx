import type { Internship } from '@/lib/types';
import { classNames, rupee, statusColor, timeAgo } from '@/lib/utils';
import { MapPin, Clock, Users, ShieldCheck, ShieldAlert } from 'lucide-react';
import HonourScore from './HonourScore';

interface InternshipCardProps {
  internship: Internship;
  onClick: () => void;
}

export default function InternshipCard({ internship, onClick }: InternshipCardProps) {
  const honour = internship.honour_score;
  const risky = honour < 60;

  return (
    <button
      onClick={onClick}
      className="card card-hover p-5 text-left w-full flex flex-col gap-3 group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={classNames('chip', statusColor(internship.status))}>{internship.status}</span>
            {internship.domain_verified && (
              <span className="chip bg-brand-100 text-brand-700">
                <ShieldCheck size={11} /> Domain verified
              </span>
            )}
          </div>
          <h3 className="font-bold text-ink-900 font-display text-base group-hover:text-brand-700 transition-colors line-clamp-1">
            {internship.title}
          </h3>
          <p className="text-sm text-ink-500 mt-0.5">{internship.company_name}</p>
        </div>
        <HonourScore score={honour} size="sm" showLabel={false} />
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
        <span className="flex items-center gap-1"><MapPin size={13} />{internship.is_remote ? 'Remote' : internship.location || '—'}</span>
        {internship.duration_weeks && <span className="flex items-center gap-1"><Clock size={13} />{internship.duration_weeks}w</span>}
        <span className="flex items-center gap-1"><Users size={13} />{internship.application_count} applied</span>
        {(internship.stipend_min || internship.stipend_max) && (
          <span className="font-semibold text-ink-700">
            {rupee(internship.stipend_min)}{internship.stipend_min && internship.stipend_max ? '–' : ''}{rupee(internship.stipend_max)}
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {internship.skills.slice(0, 4).map((s) => (
          <span key={s} className="chip bg-ink-100 text-ink-600">{s}</span>
        ))}
        {internship.skills.length > 4 && <span className="chip bg-ink-100 text-ink-500">+{internship.skills.length - 4}</span>}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-ink-100">
        <span className="text-xs text-ink-400">{timeAgo(internship.created_at)}</span>
        {risky ? (
          <span className="flex items-center gap-1 text-xs font-semibold text-danger-600">
            <ShieldAlert size={13} /> High risk
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs font-semibold text-brand-600">
            <ShieldCheck size={13} /> Trusted
          </span>
        )}
      </div>
    </button>
  );
}
