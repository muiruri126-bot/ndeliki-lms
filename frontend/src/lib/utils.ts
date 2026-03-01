import { clsx } from 'clsx';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-KE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: 'badge-green',
    APPROVED: 'badge-blue',
    PENDING: 'badge-yellow',
    OVERDUE: 'badge-red',
    DEFAULTED: 'badge-red',
    CLOSED: 'badge-gray',
    REJECTED: 'badge-red',
    WRITTEN_OFF: 'badge-gray',
    COMPLETED: 'badge-green',
    REVERSED: 'badge-red',
    PAID: 'badge-green',
    PARTIALLY_PAID: 'badge-yellow',
    DISBURSED: 'badge-blue',
  };
  return map[status] || 'badge-gray';
}

export { clsx as cn };
