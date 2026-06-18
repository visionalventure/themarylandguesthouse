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
import { housekeepingApi, roomsApi, hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const TASK_TYPES = ['CHECKOUT_CLEAN', 'STAYOVER_CLEAN', 'DEEP_CLEAN', 'TURNDOWN', 'INSPECTION'];
const PRIORITIES = ['HIGH', 'NORMAL', 'LOW'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function HousekeepingTaskDialog({ open, onOpenChange, propertyId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: roomsData } = useQuery({
    queryKey: ['rooms', propertyId],
    queryFn: () => roomsApi.list({ propertyId, limit: 200 }).then(r => r.data),
    enabled: open,
  });

  const { data: staffData } = useQuery({
    queryKey: ['employees', propertyId],
    queryFn: () => hrApi.employees({ propertyId, status: 'ACTIVE', limit: 100 }).then(r => r.data),
    enabled: open,
  });

  const rooms: any[] = roomsData?.data ?? [];
  const staff: any[] = staffData?.data ?? [];

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: { roomId: '', taskType: 'CHECKOUT_CLEAN', priority: 'NORMAL', assignedToId: '', scheduledAt: '', notes: '' },
  });

  useEffect(() => {
    if (open) reset({ roomId: '', taskType: 'CHECKOUT_CLEAN', priority: 'NORMAL', assignedToId: '', scheduledAt: '', notes: '' });
  }, [open, reset]);

  const mutation = useMutation({
    mutationFn: (values: any) =>
      housekeepingApi.createTask({
        propertyId,
        roomId: values.roomId,
        taskType: values.taskType,
        priority: values.priority,
        assignedToId: values.assignedToId || undefined,
        scheduledAt: values.scheduledAt ? new Date(values.scheduledAt).toISOString() : undefined,
        notes: values.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['housekeeping-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['housekeeping-rooms'] });
      toast({ title: 'Task created' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to create task' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Housekeeping Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select value={watch('roomId')} onValueChange={v => setValue('roomId', v)}>
                <SelectTrigger><SelectValue placeholder="Select room" /></SelectTrigger>
                <SelectContent>
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>Room {r.roomNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Task Type</Label>
              <Select value={watch('taskType')} onValueChange={v => setValue('taskType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TASK_TYPES.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={watch('priority')} onValueChange={v => setValue('priority', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select value={watch('assignedToId')} onValueChange={v => setValue('assignedToId', v)}>
                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => (
                    <SelectItem key={s.id} value={s.userId || s.id}>
                      {s.firstName} {s.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Scheduled Time</Label>
            <Input type="datetime-local" {...register('scheduledAt')} />
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Any special instructions..." {...register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
