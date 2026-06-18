'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { maintenanceApi, roomsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }

export function WorkOrderDialog({ open, onOpenChange, propertyId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => roomsApi.list({ propertyId, limit: 200 }).then(r => r.data),
    enabled: open,
  });
  const rooms: any[] = roomsData?.data ?? [];

  const { register, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { title: '', description: '', priority: 'MEDIUM', roomId: '', scheduledDate: '', estimatedHours: '' },
  });

  useEffect(() => {
    if (open) reset({ title: '', description: '', priority: 'MEDIUM', roomId: '', scheduledDate: '', estimatedHours: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: any) => maintenanceApi.createWorkOrder({
      tenantId: propertyId,
      propertyId,
      ...values,
      roomId: values.roomId || undefined,
      scheduledDate: values.scheduledDate ? new Date(values.scheduledDate).toISOString() : undefined,
      estimatedHours: values.estimatedHours ? Number(values.estimatedHours) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-orders'] });
      toast({ title: 'Work order created' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New Work Order</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input placeholder="e.g. AC not cooling in Room 205" {...register('title', { required: true })} />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea rows={3} placeholder="Describe the issue..." {...register('description')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={watch('priority')} onValueChange={v => setValue('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Room (optional)</Label>
              <Select value={watch('roomId')} onValueChange={v => setValue('roomId', v)}>
                <SelectTrigger><SelectValue placeholder="General area" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => <SelectItem key={r.id} value={r.id}>Room {r.roomNumber}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Scheduled Date</Label>
              <Input type="date" {...register('scheduledDate')} />
            </div>
            <div className="space-y-2">
              <Label>Est. Hours</Label>
              <Input type="number" min="0" step="0.5" placeholder="2.5" {...register('estimatedHours')} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Work Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
