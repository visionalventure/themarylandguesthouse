import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDateTime(date: Date | string): string {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export function calculateNights(checkIn: Date | string, checkOut: Date | string): number {
  const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function generateInitials(firstName: string, lastName: string): string {
  return `${firstName[0]}${lastName[0]}`.toUpperCase();
}

export function truncate(str: string, length = 30): string {
  return str.length > length ? `${str.substring(0, length)}...` : str;
}

// Deterministic color per category id — same category always gets the same
// color everywhere it's rendered (menu list, order picker, etc.) without
// needing a color field on the category record itself.
// Tailwind's JIT scanner needs each class name to appear literally in source,
// so every variant is spelled out here rather than built with string concatenation.
const CATEGORY_PALETTE = [
  { badge: 'bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400',     dot: 'bg-blue-500', leftBorder: 'border-blue-500' },
  { badge: 'bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400', dot: 'bg-green-500', leftBorder: 'border-green-500' },
  { badge: 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400', dot: 'bg-amber-500', leftBorder: 'border-amber-500' },
  { badge: 'bg-violet-500/10 text-violet-600 border-violet-500/30 dark:text-violet-400', dot: 'bg-violet-500', leftBorder: 'border-violet-500' },
  { badge: 'bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400',     dot: 'bg-rose-500', leftBorder: 'border-rose-500' },
  { badge: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/30 dark:text-cyan-400',     dot: 'bg-cyan-500', leftBorder: 'border-cyan-500' },
  { badge: 'bg-orange-500/10 text-orange-600 border-orange-500/30 dark:text-orange-400', dot: 'bg-orange-500', leftBorder: 'border-orange-500' },
  { badge: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/30 dark:text-indigo-400', dot: 'bg-indigo-500', leftBorder: 'border-indigo-500' },
];

export function getCategoryAccent(id: string): { badge: string; dot: string; leftBorder: string } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return CATEGORY_PALETTE[Math.abs(hash) % CATEGORY_PALETTE.length];
}
