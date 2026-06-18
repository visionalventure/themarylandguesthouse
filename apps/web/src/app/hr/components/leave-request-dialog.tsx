'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
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

const LEAVE_TYPES = ['ANNUAL', 'SICK', 'MATERNITY', 'PATERNITY', 'UNPAID', 'COMPASSIONATE', 'STUDY'];

const leaveSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  leaveType: z.string().min(1),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  totalDays: z.string().min(1, 'Total days is required'),
  reason: z.string().optional(),
});

type LeaveForm = z.infer<typeof leaveSchema>;

interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employees: any[];
}

export function LeaveRequestDialog({ open, onOpenChange, employees }: LeaveRequestDialogProps) {
  const { toast } = useToast();

  const form = useForm<LeaveForm>({
    resolver: zodResolver(leaveSchema),
    defaultValues: { employeeId: '', leaveType: 'ANNUAL', startDate: '', endDate: '', totalDays: '', reason: '' },
  });

  useEffect(() => {
    if (open) {
      form.reset({ employeeId: '', leaveType: 'ANNUAL', startDate: '', endDate: '', totalDays: '', reason: '' });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data: LeaveForm) =>
      hrApi.createLeaveRequest({
        ...data,
        totalDays: Number(data.totalDays),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
      }),
    onSuccess: () => {
      toast({ title: 'Leave request submitted' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to submit leave request',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: LeaveForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Leave Request</DialogTitle>
          <DialogDescription>Submit a leave request on behalf of an employee.</DialogDescription>
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
            <Label>Leave Type</Label>
            <Select value={form.watch('leaveType')} onValueChange={(v) => form.setValue('leaveType', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
              {form.formState.errors.startDate && (
                <p className="text-red-500 text-xs">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input id="endDate" type="date" {...form.register('endDate')} />
              {form.formState.errors.endDate && (
                <p className="text-red-500 text-xs">{form.formState.errors.endDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalDays">Total Days</Label>
              <Input id="totalDays" type="number" {...form.register('totalDays')} />
              {form.formState.errors.totalDays && (
                <p className="text-red-500 text-xs">{form.formState.errors.totalDays.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea id="reason" {...form.register('reason')} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
