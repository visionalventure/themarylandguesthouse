'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, BedDouble, CheckCircle2, Sparkles, Wrench, Ban, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roomsApi } from '@/lib/api';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { RoomFormDialog } from './components/room-form-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  AVAILABLE:    { label: 'Available',    color: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800',     icon: CheckCircle2 },
  OCCUPIED:     { label: 'Occupied',     color: 'bg-primary/10 text-primary border-primary/30',                                                                      icon: BedDouble },
  RESERVED:     { label: 'Reserved',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-800', icon: BedDouble },
  CLEANING:     { label: 'Cleaning',     color: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',       icon: Sparkles },
  MAINTENANCE:  { label: 'Maintenance',  color: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800', icon: Wrench },
  OUT_OF_ORDER: { label: 'Out of Order', color: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',                   icon: Ban },
};


export default function RoomsPage() {
  usePageTitle('Rooms');
  const propertyId = useAuthStore((s) => s.propertyId);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [floorFilter, setFloorFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

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
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(room)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <RoomFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editTarget ? 'edit' : 'create'}
        initialData={editTarget}
        propertyId={propertyId}
      />
    </FadeIn>
  );
}
