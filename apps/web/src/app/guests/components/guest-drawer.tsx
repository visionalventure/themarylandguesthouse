'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { X, Mail, Phone, Globe, Calendar, DollarSign, Star, FileText, Shield, MapPin, Loader2, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { guestsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { cn } from '@/lib/utils';
import { displayName, canRevealIdentity, PRIVACY_TYPE_LABELS, PRIVACY_TYPE_COLORS } from '@/lib/guest-privacy';

const TIER_COLORS: Record<string, string> = {
  BRONZE: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
  SILVER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  GOLD: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  PLATINUM: 'bg-violet-100 text-violet-800 dark:bg-violet-900/20 dark:text-violet-400',
  VIP: 'bg-rose-100 text-rose-800 dark:bg-rose-900/20 dark:text-rose-400',
};

interface GuestDrawerProps {
  guestId: string | null;
  onClose: () => void;
}

export function GuestDrawer({ guestId, onClose }: GuestDrawerProps) {
  const isOpen = !!guestId;
  const router = useRouter();
  const { user } = useAuthStore();
  const role = user?.role ?? 'FRONT_DESK';

  const { data: guest, isLoading } = useQuery({
    queryKey: ['guest-detail', guestId],
    queryFn: () => guestsApi.get(guestId!).then((r) => r.data),
    enabled: !!guestId,
  });

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Slide-over panel */}
      <div
        className={cn(
          'fixed right-0 top-0 h-full w-full max-w-md bg-background border-l border-border z-50',
          'transition-transform duration-300 shadow-2xl overflow-y-auto',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border sticky top-0 bg-background z-10">
          <h2 className="text-base font-semibold">Guest Profile</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : guest ? (
          <div className="p-5 space-y-6">
            {/* Identity */}
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                  {(guest.privacyType === 'PRIVATE' || guest.privacyType === 'CONFIDENTIAL') && !canRevealIdentity(role) ? '🔒' : `${guest.firstName?.[0] ?? ''}${guest.lastName?.[0] ?? ''}`}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg font-bold text-foreground truncate">
                    {displayName(guest, role)}
                  </h3>
                  {guest.privacyType && guest.privacyType !== 'STANDARD' && (
                    <Badge className={cn('text-[10px] px-1.5 py-0', PRIVACY_TYPE_COLORS[guest.privacyType])}>
                      {PRIVACY_TYPE_LABELS[guest.privacyType]}
                    </Badge>
                  )}
                </div>
                {guest.loyaltyAccount?.tier && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', TIER_COLORS[guest.loyaltyAccount.tier] ?? TIER_COLORS.BRONZE)}>
                    {guest.loyaltyAccount.tier}
                  </span>
                )}
                {guest.isBlacklisted && (
                  <Badge variant="destructive" className="ml-2 text-xs">Blacklisted</Badge>
                )}
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</h4>
              <div className="space-y-1.5">
                {guest.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <a href={`mailto:${guest.email}`} className="text-primary hover:underline truncate">{guest.email}</a>
                  </div>
                )}
                {guest.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{guest.phone}</span>
                  </div>
                )}
                {guest.nationality && (
                  <div className="flex items-center gap-2 text-sm">
                    <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{guest.nationality}</span>
                  </div>
                )}
                {guest.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{guest.address}</span>
                  </div>
                )}
              </div>
            </div>

            <hr className="border-border" />

            {/* Stay Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xl font-bold">{guest.totalStays ?? 0}</p>
                <p className="text-xs text-muted-foreground">Total Stays</p>
              </div>
              <div>
                <p className="text-xl font-bold">${Number(guest.totalSpent ?? 0).toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div>
                <p className="text-xl font-bold text-primary">{guest.loyaltyAccount?.points?.toLocaleString() ?? 0}</p>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
            </div>

            <hr className="border-border" />

            {/* Preferences */}
            {(guest.dietaryPreferences || guest.roomPreferences || guest.specialRequests) && (
              <>
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preferences</h4>
                  {guest.dietaryPreferences && (
                    <p className="text-sm"><span className="text-muted-foreground">Dietary:</span> {guest.dietaryPreferences}</p>
                  )}
                  {guest.roomPreferences && (
                    <p className="text-sm"><span className="text-muted-foreground">Room:</span> {guest.roomPreferences}</p>
                  )}
                  {guest.specialRequests && (
                    <p className="text-sm"><span className="text-muted-foreground">Notes:</span> {guest.specialRequests}</p>
                  )}
                </div>
                <hr className="border-border" />
              </>
            )}

            {/* Loyalty */}
            {guest.loyaltyAccount && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loyalty Account</h4>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono">{guest.loyaltyAccount.memberNumber}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span><strong>{guest.loyaltyAccount.points?.toLocaleString()}</strong> points</span>
                  <span className="text-muted-foreground">Lifetime: <strong>{guest.loyaltyAccount.lifetimePoints?.toLocaleString() ?? 0}</strong></span>
                </div>
              </div>
            )}

            {/* Documents */}
            {(guest.passportNumber || guest.passportExpiry || guest.visaNumber) && (
              <>
                <hr className="border-border" />
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identity Documents</h4>
                  {guest.passportNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Passport: <span className="font-mono">{guest.passportNumber}</span></span>
                    </div>
                  )}
                  {guest.passportExpiry && (
                    <p className="text-sm text-muted-foreground ml-6">
                      Expires: {format(new Date(guest.passportExpiry), 'MMM d, yyyy')}
                    </p>
                  )}
                  {guest.visaNumber && (
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      <span>Visa: <span className="font-mono">{guest.visaNumber}</span></span>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Member since */}
            {guest.createdAt && (
              <>
                <hr className="border-border" />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Guest since {format(new Date(guest.createdAt), 'MMMM yyyy')}
                </div>
              </>
            )}

            {/* Full profile link */}
            <hr className="border-border" />
            <Button
              variant="outline" size="sm" className="w-full"
              onClick={() => { onClose(); router.push(`/guests/${guestId}`); }}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1" /> View Full Profile
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}
