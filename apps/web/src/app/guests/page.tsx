'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, Search, Star, Crown, Phone, Mail, Globe, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { guestsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Pagination } from '@/components/ui/pagination';
import { GuestDrawer } from './components/guest-drawer';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { usePageTitle } from '@/hooks/use-page-title';

const loyaltyTierConfig: Record<string, { label: string; color: string; icon: any }> = {
  BRONZE: { label: 'Bronze', color: 'text-amber-700 bg-amber-50', icon: Star },
  SILVER: { label: 'Silver', color: 'text-slate-600 bg-slate-50', icon: Star },
  GOLD: { label: 'Gold', color: 'text-yellow-600 bg-yellow-50', icon: Star },
  PLATINUM: { label: 'Platinum', color: 'text-indigo-600 bg-indigo-50', icon: Crown },
  VIP: { label: 'VIP', color: 'text-purple-600 bg-purple-50', icon: Crown },
};

const demoGuests = [
  {
    id: '1', firstName: 'James', lastName: 'Wilson', email: 'james.wilson@example.com',
    phone: '+231 880 123 456', nationality: 'LR', totalStays: 8, totalSpent: 2400,
    loyaltyAccount: { tier: 'GOLD', points: 2400, memberNumber: 'MGH-00001' },
  },
  {
    id: '2', firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.j@example.com',
    phone: '+1 555 234 5678', nationality: 'US', totalStays: 3, totalSpent: 840,
    loyaltyAccount: { tier: 'SILVER', points: 840, memberNumber: 'MGH-00002' },
  },
  {
    id: '3', firstName: 'Emmanuel', lastName: 'Kamara', email: 'e.kamara@email.com',
    phone: '+231 777 987 654', nationality: 'LR', totalStays: 15, totalSpent: 4200,
    loyaltyAccount: { tier: 'PLATINUM', points: 4200, memberNumber: 'MGH-00003' },
  },
  {
    id: '4', firstName: 'Amara', lastName: 'Sesay', email: 'amara@gmail.com',
    phone: '+232 76 123 456', nationality: 'SL', totalStays: 1, totalSpent: 180,
    loyaltyAccount: { tier: 'BRONZE', points: 180, memberNumber: 'MGH-00004' },
  },
];

export default function GuestsPage() {
  usePageTitle('Guest CRM');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data } = useQuery({
    queryKey: ['guests', debouncedSearch, page],
    queryFn: () => guestsApi.list({ search: debouncedSearch, limit: 24, page }).then((r) => r.data),
    placeholderData: { data: demoGuests, total: 4 },
  });

  const guests = data?.data || demoGuests;
  const totalPages = Math.ceil((data?.total ?? 0) / 24);

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guest CRM</h1>
          <p className="text-muted-foreground text-sm">Manage guest profiles, preferences and loyalty</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
          <Plus className="w-4 h-4 mr-2" />
          Add Guest
        </Button>
      </div>

      {/* Stats */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Guests', value: data?.total, fallback: '1,248', color: 'text-primary' },
          { label: 'Loyalty Members', value: undefined, fallback: '847', color: 'text-purple-600' },
          { label: 'VIP Guests', value: undefined, fallback: '23', color: 'text-yellow-600' },
          { label: 'New This Month', value: undefined, fallback: '34', color: 'text-green-600' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                {typeof s.value === 'number' ? (
                  <AnimatedCounter value={s.value} className={cn('text-3xl font-bold block', s.color)} />
                ) : (
                  <p className={cn('text-3xl font-bold', s.color)}>{s.fallback}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, passport..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Guest Cards Grid */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {guests.map((guest: any) => {
          const tier = guest.loyaltyAccount?.tier || 'BRONZE';
          const tierConfig = loyaltyTierConfig[tier] || loyaltyTierConfig.BRONZE;
          const TierIcon = tierConfig.icon;

          return (
            <StaggerItem key={guest.id}>
            <Card
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedGuestId(guest.id)}
            >
              <CardContent className="pt-5">
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {guest.firstName[0]}{guest.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">
                        {guest.firstName} {guest.lastName}
                      </h3>
                      <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', tierConfig.color)}>
                        <TierIcon className="w-3 h-3" />
                        {tierConfig.label}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1">
                      {guest.email && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{guest.email}</span>
                        </div>
                      )}
                      {guest.phone && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          {guest.phone}
                        </div>
                      )}
                      {guest.nationality && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Globe className="w-3 h-3 flex-shrink-0" />
                          {guest.nationality}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-lg font-bold text-foreground">{guest.totalStays}</p>
                    <p className="text-xs text-muted-foreground">Stays</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-foreground">
                      ${Number(guest.totalSpent).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">Spent</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-purple-600">
                      {guest.loyaltyAccount?.points?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Points</p>
                  </div>
                </div>

                {guest.loyaltyAccount?.memberNumber && (
                  <div className="mt-3 flex items-center gap-2">
                    <Shield className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-mono">
                      {guest.loyaltyAccount.memberNumber}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            </StaggerItem>
          );
        })}
      </StaggerGrid>

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}

      <GuestDrawer
        guestId={selectedGuestId}
        onClose={() => setSelectedGuestId(null)}
      />
    </FadeIn>
  );
}
