import { formatIndianCurrency } from './currencyFormatter';

export const formatCurrency = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  return formatIndianCurrency(isNaN(num) ? 0 : num);
};

export const isValidDate = (date: Date | string | number | null | undefined): boolean => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
};

export const formatDate = (
  date: Date | string | number | null | undefined,
  fallback = '—'
): string => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatLongDate = (
  date: Date | string | number | null | undefined,
  fallback = '—'
): string => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

export const formatDateTime = (
  date: Date | string | number | null | undefined,
  fallback = '—'
): string => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatTime = (
  date: Date | string | number | null | undefined,
  fallback = '—'
): string => {
  if (!date) return fallback;
  const d = new Date(date);
  if (isNaN(d.getTime())) return fallback;
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};
