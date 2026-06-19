export const FULL_ACCESS = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

export function displayName(guest: any, role: string): string {
  if (!guest) return '—';
  const privacy: string = guest.privacyType ?? 'STANDARD';
  const isRestricted = privacy === 'PRIVATE' || privacy === 'CONFIDENTIAL';
  if (isRestricted && !FULL_ACCESS.includes(role)) {
    return guest.alias ?? `PRIVATE-${(guest.id ?? '').slice(-4).toUpperCase()}`;
  }
  return `${guest.firstName ?? ''} ${guest.lastName ?? ''}`.trim() || '—';
}

export function canRevealIdentity(role: string): boolean {
  return FULL_ACCESS.includes(role);
}

export const PRIVACY_TYPE_LABELS: Record<string, string> = {
  STANDARD:     'Standard',
  PRIVATE:      'Private',
  VIP:          'VIP',
  CONFIDENTIAL: 'Confidential',
};

export const PRIVACY_TYPE_COLORS: Record<string, string> = {
  STANDARD:     '',
  PRIVATE:      'bg-blue-100 text-blue-800',
  VIP:          'bg-amber-100 text-amber-800',
  CONFIDENTIAL: 'bg-red-100 text-red-800',
};
