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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hrApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const EMPLOYMENT_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'CASUAL'];

const employeeSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  phone: z.string().optional(),
  departmentId: z.string().optional(),
  position: z.string().min(1, 'Position is required'),
  employmentType: z.string().min(1),
  startDate: z.string().min(1, 'Start date is required'),
  baseSalary: z.string().min(1, 'Base salary is required'),
  nationalId: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  emergencyPhone: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  departments: any[];
}

export function EmployeeFormDialog({ open, onOpenChange, propertyId, departments }: EmployeeFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '', departmentId: '',
      position: '', employmentType: 'FULL_TIME', startDate: '', baseSalary: '',
      nationalId: '', address: '', emergencyContact: '', emergencyPhone: '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        firstName: '', lastName: '', email: '', phone: '', departmentId: '',
        position: '', employmentType: 'FULL_TIME', startDate: '', baseSalary: '',
        nationalId: '', address: '', emergencyContact: '', emergencyPhone: '',
      });
    }
  }, [open, form]);

  const mutation = useMutation({
    mutationFn: (data: EmployeeForm) =>
      hrApi.createEmployee({
        ...data,
        propertyId,
        email: data.email || undefined,
        departmentId: data.departmentId || undefined,
        baseSalary: Number(data.baseSalary),
        startDate: new Date(data.startDate).toISOString(),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hr-employees'] });
      toast({ title: 'Employee created' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create employee',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: EmployeeForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Employee</DialogTitle>
          <DialogDescription>Create a new employee record.</DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input id="firstName" {...form.register('firstName')} />
              {form.formState.errors.firstName && (
                <p className="text-red-500 text-xs">{form.formState.errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input id="lastName" {...form.register('lastName')} />
              {form.formState.errors.lastName && (
                <p className="text-red-500 text-xs">{form.formState.errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Department</Label>
              <Select
                value={form.watch('departmentId')}
                onValueChange={(v) => form.setValue('departmentId', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Input id="position" {...form.register('position')} />
              {form.formState.errors.position && (
                <p className="text-red-500 text-xs">{form.formState.errors.position.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employment Type</Label>
              <Select
                value={form.watch('employmentType')}
                onValueChange={(v) => form.setValue('employmentType', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input id="startDate" type="date" {...form.register('startDate')} />
              {form.formState.errors.startDate && (
                <p className="text-red-500 text-xs">{form.formState.errors.startDate.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="baseSalary">Base Salary</Label>
              <Input id="baseSalary" type="number" step="0.01" {...form.register('baseSalary')} />
              {form.formState.errors.baseSalary && (
                <p className="text-red-500 text-xs">{form.formState.errors.baseSalary.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nationalId">National ID</Label>
              <Input id="nationalId" {...form.register('nationalId')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...form.register('address')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emergencyContact">Emergency Contact</Label>
              <Input id="emergencyContact" {...form.register('emergencyContact')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emergencyPhone">Emergency Phone</Label>
              <Input id="emergencyPhone" {...form.register('emergencyPhone')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Employee
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
