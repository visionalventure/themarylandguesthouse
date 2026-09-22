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
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { roomsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const ROOM_TYPES: { value: string; label: string }[] = [
  { value: 'SINGLE', label: 'Single' },
  { value: 'DOUBLE', label: 'Double' },
  { value: 'TWIN', label: 'Twin' },
  { value: 'TRIPLE', label: 'Triple' },
  { value: 'SUITE', label: 'Suite' },
  { value: 'EXECUTIVE_SUITE', label: 'Executive Suite' },
  { value: 'PRESIDENTIAL_SUITE', label: 'Presidential Suite' },
  { value: 'FAMILY_ROOM', label: 'Family Room' },
  { value: 'CONFERENCE_ROOM', label: 'Conference Room' },
  { value: 'APARTMENT', label: 'Apartment' },
];

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.string().min(1, 'Type is required'),
  basePrice: z.string().min(1, 'Base price is required'),
  maxOccupancy: z.string().min(1, 'Max occupancy is required'),
  bedCount: z.string().optional(),
  description: z.string().optional(),
  hourlyRate: z.string().optional(),
  isShortStayEligible: z.boolean().optional(),
});

type CategoryForm = z.infer<typeof categorySchema>;

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propertyId: string;
  category?: any | null;
  defaultType?: string;
}

const blankCategoryDefaults: CategoryForm = {
  name: '', type: '', basePrice: '', maxOccupancy: '', bedCount: '1', description: '',
  hourlyRate: '', isShortStayEligible: false,
};

export function CategoryFormDialog({ open, onOpenChange, propertyId, category, defaultType }: CategoryFormDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isEdit = !!category?.id;

  const form = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: blankCategoryDefaults,
  });

  useEffect(() => {
    if (!open) return;
    if (category) {
      form.reset({
        name: category.name ?? '',
        type: category.type ?? '',
        basePrice: category.basePrice != null ? String(category.basePrice) : '',
        maxOccupancy: category.maxOccupancy != null ? String(category.maxOccupancy) : '',
        bedCount: category.bedCount != null ? String(category.bedCount) : '1',
        description: category.description ?? '',
        hourlyRate: category.hourlyRate != null ? String(category.hourlyRate) : '',
        isShortStayEligible: category.isShortStayEligible ?? false,
      });
    } else {
      form.reset({ ...blankCategoryDefaults, type: defaultType ?? '' });
    }
  }, [open, category, defaultType, form]);

  const mutation = useMutation({
    mutationFn: (data: CategoryForm) => {
      const payload = {
        name: data.name,
        type: data.type,
        basePrice: Number(data.basePrice),
        maxOccupancy: Number(data.maxOccupancy),
        bedCount: Number(data.bedCount || 1),
        description: data.description || undefined,
        hourlyRate: data.hourlyRate ? Number(data.hourlyRate) : undefined,
        isShortStayEligible: !!data.isShortStayEligible,
      };
      return isEdit
        ? roomsApi.updateCategory(category.id, payload)
        : roomsApi.createCategory({ ...payload, propertyId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['room-categories', propertyId] });
      toast({ title: isEdit ? 'Category updated' : 'Category created' });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: isEdit ? 'Failed to update category' : 'Failed to create category',
        description: error.response?.data?.message || 'Something went wrong',
      });
    },
  });

  const onSubmit = (data: CategoryForm) => mutation.mutate(data);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) form.reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Room Category' : 'New Room Category'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this room type, including short-stay settings.' : 'Define a new room type for this property.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cat-name">Name *</Label>
            <Input id="cat-name" placeholder="e.g. Deluxe King" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-red-500 text-xs">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Type *</Label>
            <Select
              value={form.watch('type')}
              onValueChange={(v) => form.setValue('type', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select room type" />
              </SelectTrigger>
              <SelectContent>
                {ROOM_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.type && (
              <p className="text-red-500 text-xs">{form.formState.errors.type.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cat-price">Base Price / Night *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="cat-price"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  {...form.register('basePrice')}
                />
              </div>
              {form.formState.errors.basePrice && (
                <p className="text-red-500 text-xs">{form.formState.errors.basePrice.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-occupancy">Max Occupancy *</Label>
              <Input
                id="cat-occupancy"
                type="number"
                min="1"
                placeholder="2"
                {...form.register('maxOccupancy')}
              />
              {form.formState.errors.maxOccupancy && (
                <p className="text-red-500 text-xs">{form.formState.errors.maxOccupancy.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-beds">Bed Count</Label>
            <Input
              id="cat-beds"
              type="number"
              min="1"
              placeholder="1"
              {...form.register('bedCount')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-desc">Description</Label>
            <Textarea
              id="cat-desc"
              placeholder="Optional description…"
              {...form.register('description')}
            />
          </div>

          <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
            <div className="flex items-center gap-2">
              <Checkbox
                id="cat-short-stay"
                checked={form.watch('isShortStayEligible')}
                onCheckedChange={(v: boolean) => form.setValue('isShortStayEligible', v)}
              />
              <Label htmlFor="cat-short-stay" className="text-sm font-medium">Eligible for Short Stay</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cat-hourly-rate">Hourly Rate</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="cat-hourly-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="15.00"
                  className="pl-7"
                  {...form.register('hourlyRate')}
                />
              </div>
              <p className="text-xs text-muted-foreground">Pre-fills the rate when this category's rooms are picked for a short stay.</p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { form.reset(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
