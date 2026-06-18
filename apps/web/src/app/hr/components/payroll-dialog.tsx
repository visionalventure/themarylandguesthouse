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
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const payrollSchema = z.object({
  periodStart: z.string().min(1, 'Period start is required'),
  periodEnd: z.string().min(1, 'Period end is required'),
});

type PayrollForm = z.infer<typeof payrollSchema>;

interface PayrollDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
}

export function PayrollDialog({ open, onOpenChange, propertyId }: PayrollDialogProps) {
  const { toast } = useToast();

  const form = useForm<PayrollForm>({
    resolver: zodResolver(payrollSchema),
    defaultValues: { periodStart: '', periodEnd: '' },
  });

  useEffect(() => {
    if (open) form.reset({ periodStart: '', periodEnd: '' });
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data: PayrollForm) => hrApi.runPayroll(propertyId, data.periodStart, data.periodEnd),
    onSuccess: (res: any) => {
      const { generated, status } = res.data || {};
      toast({ title: 'Payroll run complete', description: `Generated ${generated} payroll record(s) — status: ${status}` });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to run payroll',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: PayrollForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run Payroll</DialogTitle>
          <DialogDescription>
            Generates DRAFT payroll records for all active employees in this property for the selected period.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodStart">Period Start</Label>
              <Input id="periodStart" type="date" {...form.register('periodStart')} />
              {form.formState.errors.periodStart && (
                <p className="text-red-500 text-xs">{form.formState.errors.periodStart.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="periodEnd">Period End</Label>
              <Input id="periodEnd" type="date" {...form.register('periodEnd')} />
              {form.formState.errors.periodEnd && (
                <p className="text-red-500 text-xs">{form.formState.errors.periodEnd.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Run Payroll
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
