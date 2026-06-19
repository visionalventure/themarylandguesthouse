'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { housekeepingApi, roomsApi, hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const BUILT_IN_TASK_TYPES = [
  'CHECKOUT_CLEAN',
  'STAYOVER_CLEAN',
  'DEEP_CLEAN',
  'TURNDOWN',
  'INSPECTION',
];

const STORAGE_KEY = 'mgh-custom-task-types';

function loadCustomTypes(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveCustomTypes(types: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(types));
}

const PRIORITIES = ['HIGH', 'NORMAL', 'LOW'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function HousekeepingTaskDialog({ open, onOpenChange, propertyId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [customTypes, setCustomTypes] = useState<string[]>([]);
  const [addingCustom, setAddingCustom] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    setCustomTypes(loadCustomTypes());
  }, []);

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

  // Rooms API returns a plain array; guests returns { data: [] }
  const rooms: any[] = roomsData?.data ?? (Array.isArray(roomsData) ? roomsData : []);
  const staff: any[] = staffData?.data ?? (Array.isArray(staffData) ? staffData : []);

  const allTaskTypes = [...BUILT_IN_TASK_TYPES, ...customTypes];

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: { roomId: '', taskType: 'CHECKOUT_CLEAN', priority: 'NORMAL', assignedToId: '', scheduledAt: '', notes: '' },
  });

  useEffect(() => {
    if (open) reset({ roomId: '', taskType: 'CHECKOUT_CLEAN', priority: 'NORMAL', assignedToId: '', scheduledAt: '', notes: '' });
  }, [open, reset]);

  function handleAddCustomType() {
    const name = newTypeName.trim().toUpperCase().replace(/\s+/g, '_');
    if (!name || allTaskTypes.includes(name)) return;
    const updated = [...customTypes, name];
    setCustomTypes(updated);
    saveCustomTypes(updated);
    setValue('taskType', name);
    setNewTypeName('');
    setAddingCustom(false);
  }

  function handleRemoveCustomType(type: string) {
    const updated = customTypes.filter(t => t !== type);
    setCustomTypes(updated);
    saveCustomTypes(updated);
    if (watch('taskType') === type) setValue('taskType', 'CHECKOUT_CLEAN');
  }

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
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Housekeeping Task</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(d => mutation.mutate(d))} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Room */}
            <div className="space-y-2">
              <Label>Room *</Label>
              <Select value={watch('roomId')} onValueChange={v => setValue('roomId', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select room" />
                </SelectTrigger>
                <SelectContent>
                  {rooms.length === 0 && (
                    <div className="px-2 py-3 text-sm text-muted-foreground text-center">No rooms found</div>
                  )}
                  {rooms.map(r => (
                    <SelectItem key={r.id} value={r.id}>
                      Room {r.roomNumber}{r.category?.name ? ` — ${r.category.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task Type */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Task Type</Label>
                <button
                  type="button"
                  onClick={() => setAddingCustom(v => !v)}
                  className="text-xs text-primary hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add type
                </button>
              </div>
              <Select value={watch('taskType')} onValueChange={v => setValue('taskType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {allTaskTypes.map(t => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Custom type input */}
              {addingCustom && (
                <div className="flex gap-1">
                  <Input
                    autoFocus
                    placeholder="e.g. PEST CONTROL"
                    value={newTypeName}
                    onChange={e => setNewTypeName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomType(); } }}
                    className="h-8 text-xs uppercase"
                  />
                  <Button type="button" size="sm" className="h-8 px-2" onClick={handleAddCustomType}>Add</Button>
                  <Button type="button" size="sm" variant="ghost" className="h-8 px-2" onClick={() => { setAddingCustom(false); setNewTypeName(''); }}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}

              {/* Custom type badges (removable) */}
              {customTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {customTypes.map(t => (
                    <Badge key={t} variant="secondary" className="text-xs gap-1 cursor-pointer pr-1" onClick={() => handleRemoveCustomType(t)}>
                      {t.replace(/_/g, ' ')}
                      <X className="w-2.5 h-2.5" />
                    </Badge>
                  ))}
                </div>
              )}
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
