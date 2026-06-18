'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ATTENDANCE_STATUSES = ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_LEAVE'];

const attendanceSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  date: z.string().min(1, 'Date is required'),
  clockIn: z.string().optional(),
  clockOut: z.string().optional(),
  status: z.string().min(1),
  notes: z.string().optional(),
});

type AttendanceForm = z.infer<typeof attendanceSchema>;

interface AttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
}

export function AttendanceDialog({ open, onOpenChange, employees }: AttendanceDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<AttendanceForm>({
    resolver: zodResolver(attendanceSchema),
    defaultValues: { employeeId: '', date: today, clockIn: '', clockOut: '', status: 'PRESENT', notes: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ employeeId: '', date: today, clockIn: '', clockOut: '', status: 'PRESENT', notes: '' });
    }
  }, [open, form, today]);

  const mutation = useMutation({
    mutationFn: (data: AttendanceForm) =>
      hrApi.attendance({
        ...data,
        clockIn: data.clockIn ? new Date(`${data.date}T${data.clockIn}:00`).toISOString() : undefined,
        clockOut: data.clockOut ? new Date(`${data.date}T${data.clockOut}:00`).toISOString() : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-attendance-report'] });
      toast({ title: 'Attendance recorded' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to record attendance',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: AttendanceForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Record Attendance</DialogTitle>
          <DialogDescription>Log clock-in/out and status for an employee.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Select value={form.watch('employeeId')} onValueChange={(v) => form.setValue('employeeId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.firstName} {e.lastName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.employeeId && (
              <p className="text-red-500 text-xs">{form.formState.errors.employeeId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" type="date" {...form.register('date')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clockIn">Clock In</Label>
              <Input id="clockIn" type="time" {...form.register('clockIn')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockOut">Clock Out</Label>
              <Input id="clockOut" type="time" {...form.register('clockOut')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={form.watch('status')} onValueChange={(v) => form.setValue('status', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...form.register('notes')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Attendance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
