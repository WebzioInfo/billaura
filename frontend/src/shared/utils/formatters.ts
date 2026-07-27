import { formatIndianCurrency } from './currencyFormatter';

export const formatCurrency = (amount: number | string | null | undefined): string => {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0));
  return formatIndianCurrency(isNaN(num) ? 0 : num);
};

export const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
