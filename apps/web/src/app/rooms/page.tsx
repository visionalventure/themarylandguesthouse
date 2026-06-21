'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BedDouble, CheckCircle2, Sparkles, Wrench, Ban, Pencil, Tag, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { roomsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RoomFormDialog } from './components/room-form-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';
import { format } from 'date-fns';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  AVAILABLE:    { label: 'Available',    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',     icon: CheckCircle2 },
  OCCUPIED:     { label: 'Occupied',     color: 'bg-primary/10 text-primary border-primary/30',                                                                      icon: BedDouble },
  RESERVED:     { label: 'Reserved',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800', icon: BedDouble },
  CLEANING:     { label: 'Cleaning',     color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',       icon: Sparkles },
  MAINTENANCE:  { label: 'Maintenance',  color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800', icon: Wrench },
  OUT_OF_ORDER: { label: 'Out of Order', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',                   icon: Ban },
};

function RoomPricingSheet({ room, open, onClose }: { room: any; open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ name: '', pricePerNight: '', startDate: '', endDate: '', isDefault: false, minNights: '1' });

  const { data: pricing = [], isLoading } = useQuery({
    queryKey: ['room-pricing', room?.id],
    queryFn: () => roomsApi.getPricing(room.id).then(r => r.data),
    enabled: !!room?.id && open,
  });

  const createMutation = useMutation({
    mutationFn: () => roomsApi.createPricing(room.id, { ...form, pricePerNight: Number(form.pricePerNight), minNights: Number(form.minNights) }).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-pricing', room.id] });
      setAddOpen(false);
      setForm({ name: '', pricePerNight: '', startDate: '', endDate: '', isDefault: false, minNights: '1' });
      toast({ title: 'Pricing rule added' });
    },
    onError: (e: any) => toast({ variant: 'destructive', title: e.response?.data?.message ?? 'Failed to add pricing' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (pricingId: string) => roomsApi.deletePricing(pricingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-pricing', room?.id] });
      toast({ title: 'Pricing rule removed' });
    },
  });

  const pricingList: any[] = Array.isArray(pricing) ? pricing : [];

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5" />
              Pricing Rules
              {room && <span className="text-muted-foreground font-normal text-sm">— Room {room.roomNumber}</span>}
            </SheetTitle>
          </SheetHeader>

          {room && (
            <p className="text-xs text-muted-foreground mt-2">
              Category base price: <strong className="text-foreground">${Number(room.category?.basePrice ?? 0).toLocaleString()}/night</strong>
            </p>
          )}

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-foreground">Custom Rates</p>
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Rate
              </Button>
            </div>

            {isLoading ? (
              <div className="py-8 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
            ) : pricingList.length === 0 ? (
              <div className="py-10 text-center">
                <Tag className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground">No custom rates yet</p>
                <p className="text-xs text-muted-foreground mt-1">Add seasonal rates or promotional pricing rules.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pricingList.map((p: any) => (
                  <div key={p.id} className="flex items-start gap-3 p-3 rounded-lg border border-border bg-muted/20">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">{p.name}</span>
                        {p.isDefault && <Badge variant="outline" className="text-[10px] border-primary/30 bg-primary/10 text-primary">Default</Badge>}
                      </div>
                      <p className="text-lg font-bold text-primary mt-0.5">${Number(p.pricePerNight).toLocaleString()}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                      <div className="flex gap-3 mt-1 text-[11px] text-muted-foreground">
                        {p.startDate && <span>From {format(new Date(p.startDate), 'dd MMM yyyy')}</span>}
                        {p.endDate && <span>To {format(new Date(p.endDate), 'dd MMM yyyy')}</span>}
                        {!p.startDate && !p.endDate && <span>Year-round</span>}
                        <span>Min {p.minNights} night{p.minNights !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive/70 hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(p.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add Rate Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Add Pricing Rule</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div className="space-y-1.5">
              <Label>Rate Name</Label>
              <Input placeholder="e.g. Weekend Rate, Peak Season" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Price per Night ($)</Label>
              <Input type="number" placeholder="0.00" value={form.pricePerNight} onChange={e => setForm(p => ({ ...p, pricePerNight: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date (optional)</Label>
                <Input type="date" value={form.startDate} onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date (optional)</Label>
                <Input type="date" value={form.endDate} onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Minimum Nights</Label>
              <Input type="number" min="1" value={form.minNights} onChange={e => setForm(p => ({ ...p, minNights: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                className="rounded border-border"
              />
              <span className="text-sm text-foreground">Set as default rate for this room</span>
            </label>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name || !form.pricePerNight}>
              {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Rate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function RoomsPage() {
  usePageTitle('Rooms');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [pricingRoom, setPricingRoom] = useState<any | null>(null);

  const params: any = { propertyId: propertyId };
  if (statusFilter !== 'ALL') params.status = statusFilter;
  if (floorFilter) params.floor = floorFilter;

  const { data, isLoading } = useQuery({
    queryKey: ['rooms', params],
    queryFn: () => roomsApi.list(params).then((r) => r.data),
  });

  const rooms: any[] = data ?? [];

  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const room of rooms) counts[room.status] = (counts[room.status] || 0) + 1;
    return counts;
  }, [rooms]);

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => roomsApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
      toast({ title: 'Room status updated' });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update status',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (room: any) => {
    setEditTarget(room);
    setDialogOpen(true);
  };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Room Management</h1>
          <p className="text-muted-foreground text-sm">Track room status, pricing and amenities</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Room
        </Button>
      </div>

      {/* Stats */}
      <StaggerGrid className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(statusConfig).map(([status, cfg]) => (
          <StaggerItem key={status}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <cfg.icon className="w-6 h-6 text-muted-foreground" />
                  <div>
                    <AnimatedCounter value={stats[status] || 0} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                {Object.entries(statusConfig).map(([value, { label }]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Floor"
              className="w-full sm:w-32"
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rooms table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Rooms ({rooms.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
          ) : rooms.length === 0 ? (
            <div className="py-16 text-center">
              <BedDouble className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-base font-medium text-foreground">No rooms configured yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first room to start managing your property.</p>
              <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Add Room
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-background">
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Room #</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Floor</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Category</th>
                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Base Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((room: any) => (
                    <tr key={room.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground">Room {room.roomNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{room.floor ?? '—'}</td>
                      <td className="px-4 py-3">{room.category?.name || '—'}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${Number(room.category?.basePrice || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={room.status}
                          onValueChange={(status) => statusMutation.mutate({ id: room.id, status })}
                        >
                          <SelectTrigger
                            className={cn(
                              'h-7 w-44 text-xs px-2 py-1 rounded-full border font-medium',
                              statusConfig[room.status]?.color,
                            )}
                          >
                            <SelectValue>{statusConfig[room.status]?.label || room.status}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(statusConfig).map(([value, { label }]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" title="Pricing rules" onClick={() => setPricingRoom(room)}>
                            <Tag className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(room)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <RoomFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editTarget ? 'edit' : 'create'}
        initialData={editTarget}
        propertyId={propertyId}
      />

      <RoomPricingSheet
        room={pricingRoom}
        open={!!pricingRoom}
        onClose={() => setPricingRoom(null)}
      />
    </FadeIn>
  );
}
