export function timeAgo(iso: string): string {
  const date = new Date(iso).getTime();
  const diff = Date.now() - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function classNames(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0 || !parts[0]) return '?';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

export function rupee(n: number | null | undefined): string {
  if (n == null) return '—';
  return `₹${n.toLocaleString('en-IN')}`;
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function severityColor(sev: 'low' | 'medium' | 'high' | 'critical'): string {
  switch (sev) {
    case 'critical':
      return 'bg-danger-100 text-danger-700 border-danger-200';
    case 'high':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'medium':
      return 'bg-accent-100 text-accent-700 border-accent-200';
    case 'low':
      return 'bg-ink-100 text-ink-600 border-ink-200';
  }
}

export function scoreColor(score: number): { text: string; bg: string; ring: string; label: string } {
  if (score >= 80) return { text: 'text-brand-700', bg: 'bg-brand-500', ring: 'text-brand-600', label: 'Excellent' };
  if (score >= 60) return { text: 'text-accent-700', bg: 'bg-accent-500', ring: 'text-accent-600', label: 'Caution' };
  if (score >= 40) return { text: 'text-orange-700', bg: 'bg-orange-500', ring: 'text-orange-600', label: 'High risk' };
  return { text: 'text-danger-700', bg: 'bg-danger-500', ring: 'text-danger-600', label: 'Critical' };
}

export function statusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'accepted':
    case 'resolved':
      return 'bg-brand-100 text-brand-700';
    case 'pending':
    case 'open':
      return 'bg-ink-100 text-ink-600';
    case 'reviewing':
      return 'bg-accent-100 text-accent-700';
    case 'dismissed':
    case 'rejected':
    case 'withdrawn':
      return 'bg-ink-100 text-ink-500';
    case 'banned':
    case 'closed':
      return 'bg-danger-100 text-danger-700';
    default:
      return 'bg-ink-100 text-ink-600';
  }
}
