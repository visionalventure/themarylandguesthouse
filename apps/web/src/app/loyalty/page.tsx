'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Users, Star, Award, Gift } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { loyaltyApi } from '@/lib/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const TIER_COLORS: Record<string, string> = {
  BRONZE:   'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400',
  SILVER:   'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/60 dark:text-slate-300',
  GOLD:     'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400',
  PLATINUM: 'bg-violet-100 text-violet-800 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400',
  VIP:      'bg-primary/15 text-primary border-primary/40',
};

const TXN_COLORS: Record<string, string> = {
  EARN:   'text-green-600 dark:text-green-400',
  REDEEM: 'text-red-600 dark:text-red-400',
  EXPIRE: 'text-muted-foreground',
  ADJUST: 'text-primary',
};

export default function LoyaltyPage() {
  usePageTitle('Loyalty Program');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [search, setSearch] = useState('');
  const { toast } = useToast();
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data: statsData } = useQuery({
    queryKey: ['loyalty-stats', propertyId],
    queryFn: () => loyaltyApi.stats(propertyId).then(r => r.data),
  });

  const { data: membersData } = useQuery({
    queryKey: ['loyalty-members', debouncedSearch],
    queryFn: () => loyaltyApi.members({ search: debouncedSearch || undefined, limit: 50 }).then(r => r.data),
  });

  const { data: rulesData } = useQuery({
    queryKey: ['loyalty-rules'],
    queryFn: () => loyaltyApi.rules().then(r => r.data),
  });

  const members: any[] = membersData?.data ?? [];
  const rules: any[] = Array.isArray(rulesData) ? rulesData : [];

  const tierCounts = statsData?.tierCounts ?? {};
  const totalMembers = Object.values(tierCounts).reduce((a: number, b: unknown) => a + Number(b), 0);

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Loyalty Program</h1>
          <p className="text-muted-foreground text-sm">Points, tiers, rewards and member management</p>
        </div>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total Members', value: totalMembers, icon: Users, color: 'text-primary' },
          { label: 'Bronze', value: tierCounts.BRONZE ?? 0, color: 'text-amber-600', icon: Star },
          { label: 'Silver', value: tierCounts.SILVER ?? 0, color: 'text-slate-500', icon: Star },
          { label: 'Gold', value: tierCounts.GOLD ?? 0, color: 'text-yellow-500', icon: Award },
          { label: 'Platinum / VIP', value: (tierCounts.PLATINUM ?? 0) + (tierCounts.VIP ?? 0), color: 'text-violet-500', icon: Gift },
        ].map(stat => (
          <StaggerItem key={stat.label}>
            <Card>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-2">
                  <stat.icon className={cn('w-6 h-6 shrink-0', stat.color)} />
                  <div>
                    <AnimatedCounter value={stat.value} className="text-xl font-bold block" />
                    <p className="text-[11px] text-muted-foreground leading-tight">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="rules">Earning Rules</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <div className="mt-4 space-y-3">
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="max-w-sm"
            />
            <Card>
              <CardContent className="p-0">
                {members.length === 0 ? (
                  <div className="py-16 text-center text-muted-foreground text-sm">
                    No loyalty members yet. Members are created automatically on first booking.
                  </div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 z-10 bg-background">
                      <tr className="border-b border-border bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Member</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tier</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Points</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Lifetime Pts</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Stays</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map(m => {
                        const acct = m.loyaltyAccount ?? m;
                        const guest = m.guest ?? m;
                        return (
                          <tr key={m.id} className="border-b border-border hover:bg-muted/30">
                            <td className="px-4 py-3">
                              <p className="font-medium text-foreground">
                                {guest.firstName} {guest.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{guest.email}</p>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={cn('text-xs border', TIER_COLORS[acct.tier] ?? '')}>
                                {acct.tier}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-semibold">{(acct.points ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-muted-foreground">{(acct.lifetimePoints ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-muted-foreground">{acct.totalStays ?? 0}</td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {acct.createdAt ? format(new Date(acct.createdAt), 'MMM d, yyyy') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <Card className="mt-4">
            <CardContent className="p-0">
              {rules.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground text-sm">
                  No earning rules configured. Add rules via the API.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Rule Name</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Points / $1</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Min Tier</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(r => (
                      <tr key={r.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium text-foreground">{r.name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{r.ruleType}</td>
                        <td className="px-4 py-3 font-semibold">{r.pointsPerDollar ?? r.pointsAwarded ?? '—'}</td>
                        <td className="px-4 py-3">
                          {r.minTier ? (
                            <Badge className={cn('text-xs border', TIER_COLORS[r.minTier] ?? '')}>{r.minTier}</Badge>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn('text-xs', r.isActive ? 'text-green-600' : 'text-muted-foreground')}>
                            {r.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
