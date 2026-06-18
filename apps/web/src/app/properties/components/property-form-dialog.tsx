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
import { propertiesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const propertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  code: z.string().min(1, 'Code is required'),
  type: z.string().min(1, 'Type is required'),
  description: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  starRating: z.string().optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
});

type PropertyForm = z.infer<typeof propertySchema>;

const PROPERTY_TYPES = ['GUESTHOUSE', 'HOTEL', 'LODGE', 'RESORT', 'APARTMENT'];

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: any;
}

export function PropertyFormDialog({ open, onOpenChange, mode, initialData }: PropertyFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<PropertyForm>({
    resolver: zodResolver(propertySchema),
    defaultValues: {
      name: '', code: '', type: 'GUESTHOUSE', description: '', address: '',
      city: '', country: 'Liberia', phone: '', email: '', starRating: '',
      checkInTime: '14:00', checkOutTime: '12:00',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        initialData
          ? {
              name: initialData.name || '',
              code: initialData.code || '',
              type: initialData.type || 'GUESTHOUSE',
              description: initialData.description || '',
              address: initialData.address || '',
              city: initialData.city || '',
              country: initialData.country || 'Liberia',
              phone: initialData.phone || '',
              email: initialData.email || '',
              starRating: initialData.starRating ? String(initialData.starRating) : '',
              checkInTime: initialData.checkInTime || '14:00',
              checkOutTime: initialData.checkOutTime || '12:00',
            }
          : {
              name: '', code: '', type: 'GUESTHOUSE', description: '', address: '',
              city: '', country: 'Liberia', phone: '', email: '', starRating: '',
              checkInTime: '14:00', checkOutTime: '12:00',
            },
      );
    }
  }, [open, initialData, form]);

  const mutation = useMutation({
    mutationFn: (data: PropertyForm) => {
      const payload: any = {
        ...data,
        starRating: data.starRating ? Number(data.starRating) : undefined,
        email: data.email || undefined,
      };
      return mode === 'create'
        ? propertiesApi.create(payload)
        : propertiesApi.update(initialData.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      toast({ title: mode === 'create' ? 'Property created' : 'Property updated' });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to save property',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: PropertyForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Add Property' : 'Edit Property'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? 'Create a new property under your tenant.' : 'Update property details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...form.register('name')} />
              {form.formState.errors.name && (
                <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input id="code" placeholder="MGH-002" {...form.register('code')} />
              {form.formState.errors.code && (
                <p className="text-red-500 text-xs">{form.formState.errors.code.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={form.watch('type')}
                onValueChange={(v) => form.setValue('type', v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="starRating">Star Rating</Label>
              <Input id="starRating" type="number" min={1} max={5} {...form.register('starRating')} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" {...form.register('description')} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" {...form.register('address')} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...form.register('city')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input id="country" {...form.register('country')} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...form.register('phone')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...form.register('email')} />
              {form.formState.errors.email && (
                <p className="text-red-500 text-xs">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="checkInTime">Check-in Time</Label>
              <Input id="checkInTime" type="time" {...form.register('checkInTime')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checkOutTime">Check-out Time</Label>
              <Input id="checkOutTime" type="time" {...form.register('checkOutTime')} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {mode === 'create' ? 'Create Property' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
