'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Plus, Search, Star, Crown, Phone, Mail, Globe, Shield, Loader2, Users, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { guestsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { displayName, PRIVACY_TYPE_LABELS } from '@/lib/guest-privacy';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { Pagination } from '@/components/ui/pagination';
import { GuestDrawer } from './components/guest-drawer';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { usePageTitle } from '@/hooks/use-page-title';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';

const loyaltyTierConfig: Record<string, { label: string; color: string; icon: any }> = {
  BRONZE:   { label: 'Bronze',   color: 'border-amber-500/30 bg-amber-500/15 text-amber-400',  icon: Star },
  SILVER:   { label: 'Silver',   color: 'border-white/10 bg-white/5 text-muted-foreground',     icon: Star },
  GOLD:     { label: 'Gold',     color: 'border-primary/30 bg-primary/15 text-primary',         icon: Star },
  PLATINUM: { label: 'Platinum', color: 'border-violet-500/30 bg-violet-500/15 text-violet-400', icon: Crown },
  VIP:      { label: 'VIP',      color: 'border-rose-500/30 bg-rose-500/15 text-rose-400',      icon: Crown },
};

const NATIONALITIES = [
  { code: 'LR', label: 'Liberia' }, { code: 'SL', label: 'Sierra Leone' }, { code: 'GH', label: 'Ghana' },
  { code: 'NG', label: 'Nigeria' }, { code: 'US', label: 'United States' }, { code: 'GB', label: 'United Kingdom' },
  { code: 'CN', label: 'China' }, { code: 'IN', label: 'India' }, { code: 'FR', label: 'France' },
  { code: 'DE', label: 'Germany' }, { code: 'ZA', label: 'South Africa' }, { code: 'KE', label: 'Kenya' },
  { code: 'GN', label: 'Guinea' }, { code: 'CI', label: "Côte d'Ivoire" }, { code: 'SN', label: 'Senegal' },
];


export default function GuestsPage() {
  usePageTitle('Guest CRM');
  const propertyId = useAuthStore((s) => s.propertyId);
  const currentUser = useAuthStore((s) => s.user);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [nationality, setNationality] = useState('');
  const [privacyType, setPrivacyType] = useState('STANDARD');
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading } = useQuery({
    queryKey: ['guests', debouncedSearch, page],
    queryFn: () => guestsApi.list({ tenantId: propertyId, search: debouncedSearch, limit: 24, page }).then((r) => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ['guest-stats'],
    queryFn: () => guestsApi.stats().then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const guests: any[] = data?.data ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / 24);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { firstName: '', lastName: '', email: '', phone: '', passportNumber: '' },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => guestsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      queryClient.invalidateQueries({ queryKey: ['guest-stats'] });
      toast({ title: 'Guest deleted', description: 'The guest profile has been removed.' });
      setDeleteTarget(null);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to delete guest' }),
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => guestsApi.create({ ...values, nationality, privacyType, propertyId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] });
      toast({ title: 'Guest added successfully' });
      setDialogOpen(false);
      reset();
      setNationality('');
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to add guest' }),
  });

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Guest CRM</h1>
          <p className="text-muted-foreground text-sm">Manage guest profiles, preferences and loyalty</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add Guest
        </Button>
      </div>

      {/* Stats */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Guests',    value: stats?.total,          color: 'text-primary' },
          { label: 'Loyalty Members', value: stats?.loyaltyMembers, color: 'text-violet-400' },
          { label: 'VIP Guests',      value: stats?.vipGuests,      color: 'text-amber-400' },
          { label: 'New This Month',  value: stats?.newThisMonth,   color: 'text-green-400' },
        ].map((s) => (
          <StaggerItem key={s.label}>
            <Card>
              <CardContent className="pt-4 pb-4 text-center">
                <AnimatedCounter value={s.value ?? 0} className={cn('text-3xl font-bold block', s.color)} />
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
            <Input placeholder="Search by name, email, phone, passport..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {/* Guest Cards */}
      {guests.length === 0 && !isLoading && (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-base font-medium text-foreground">
              {debouncedSearch ? 'No guests match your search' : 'No guests yet'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {debouncedSearch ? 'Try a different search term.' : 'Add your first guest to start tracking stays and loyalty points.'}
            </p>
            {!debouncedSearch && (
              <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Guest
              </Button>
            )}
          </CardContent>
        </Card>
      )}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {guests.map((guest: any) => {
          const tier = guest.loyaltyAccount?.tier || 'BRONZE';
          const tierConfig = loyaltyTierConfig[tier] || loyaltyTierConfig.BRONZE;
          const TierIcon = tierConfig.icon;
          return (
            <StaggerItem key={guest.id}>
              <Card className="cursor-pointer hover:border-primary/30 relative" onClick={() => setSelectedGuestId(guest.id)}>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <button
                    type="button"
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(guest); }}
                    title="Delete guest"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <CardContent className="pt-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {guest.firstName[0]}{guest.lastName[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{guest.firstName} {guest.lastName}</h3>
                        <span className={cn('flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium border', tierConfig.color)}>
                          <TierIcon className="w-3 h-3" />{tierConfig.label}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {guest.email && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="w-3 h-3 flex-shrink-0" /><span className="truncate">{guest.email}</span></div>}
                        {guest.phone && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Phone className="w-3 h-3 flex-shrink-0" />{guest.phone}</div>}
                        {guest.nationality && <div className="flex items-center gap-2 text-xs text-muted-foreground"><Globe className="w-3 h-3 flex-shrink-0" />{guest.nationality}</div>}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
                    <div><p className="text-lg font-bold text-foreground">{guest.totalStays}</p><p className="text-xs text-muted-foreground">Stays</p></div>
                    <div><p className="text-lg font-bold text-foreground">${Number(guest.totalSpent).toLocaleString()}</p><p className="text-xs text-muted-foreground">Spent</p></div>
                    <div><p className="text-lg font-bold text-primary">{guest.loyaltyAccount?.points?.toLocaleString() || 0}</p><p className="text-xs text-muted-foreground">Points</p></div>
                  </div>
                  {guest.loyaltyAccount?.memberNumber && (
                    <div className="mt-3 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-mono">{guest.loyaltyAccount.memberNumber}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </StaggerItem>
          );
        })}
      </StaggerGrid>

      {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />}

      <GuestDrawer guestId={selectedGuestId} onClose={() => setSelectedGuestId(null)} />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Guest</DialogTitle>
            <DialogDescription>
              Delete <span className="font-semibold text-foreground">{deleteTarget?.firstName} {deleteTarget?.lastName}</span>? This cannot be undone. All stay history and financial records are preserved but the guest profile will no longer be accessible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(deleteTarget?.id)}
            >
              {deleteMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Guest Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) { reset(); setNationality(''); setPrivacyType('STANDARD'); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add New Guest</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>First Name *</Label>
                <Input placeholder="James" {...register('firstName', { required: true })} />
                {errors.firstName && <p className="text-xs text-destructive">Required</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Last Name *</Label>
                <Input placeholder="Wilson" {...register('lastName', { required: true })} />
                {errors.lastName && <p className="text-xs text-destructive">Required</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" placeholder="guest@example.com" {...register('email')} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input placeholder="+231 880 123 456" {...register('phone')} />
            </div>
            <div className="space-y-1.5">
              <Label>Nationality</Label>
              <Select value={nationality} onValueChange={setNationality}>
                <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                <SelectContent>
                  {NATIONALITIES.map(n => <SelectItem key={n.code} value={n.code}>{n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Passport / ID Number</Label>
              <Input placeholder="A12345678" {...register('passportNumber')} />
            </div>
            <div className="space-y-1.5">
              <Label>Privacy Level</Label>
              <Select value={privacyType} onValueChange={setPrivacyType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIVACY_TYPE_LABELS).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {privacyType !== 'STANDARD' && (
                <p className="text-xs text-muted-foreground">An alias will be auto-generated to protect the guest's identity.</p>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Add Guest
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
