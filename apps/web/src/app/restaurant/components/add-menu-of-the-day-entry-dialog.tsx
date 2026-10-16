'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { menuOfTheDayApi, restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  restaurantId: string;
  menuOfTheDayId: string | null;
}

export function AddMenuOfTheDayEntryDialog({ open, onOpenChange, restaurantId, menuOfTheDayId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      mode: 'fromMenu', menuItemId: '', name: '', description: '', price: '', allergens: '', isVegetarian: false, isVegan: false,
    },
  });

  useEffect(() => {
    if (open) reset({ mode: 'fromMenu', menuItemId: '', name: '', description: '', price: '', allergens: '', isVegetarian: false, isVegan: false });
  }, [open, reset]);

  const { data: menuData } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantApi.menu(restaurantId).then((r) => r.data),
    enabled: open && !!restaurantId,
  });
  const menuItems: any[] = [
    ...(menuData?.categories ?? []).flatMap((c: any) => c.items ?? []),
    ...(menuData?.uncategorised ?? []),
  ].filter((i: any) => i.isAvailable);

  const mode = watch('mode');

  const mutation = useMutation({
    mutationFn: (values: any) => {
      const payload = mode === 'fromMenu'
        ? { menuItemId: values.menuItemId }
        : {
          name: values.name,
          description: values.description || undefined,
          price: Number(values.price),
          allergens: values.allergens ? values.allergens.split(',').map((a: string) => a.trim()).filter(Boolean) : [],
          isVegetarian: values.isVegetarian,
          isVegan: values.isVegan,
        };
      return menuOfTheDayApi.addEntry(menuOfTheDayId as string, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-of-the-day', restaurantId] });
      toast({ title: 'Added to menu of the day' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to add item' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Menu of the Day</DialogTitle>
          <DialogDescription>Pick an existing dish, or add a one-off special not on the regular menu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((v) => mutation.mutate(v))} className="space-y-4">
          <Tabs value={mode} onValueChange={(v) => setValue('mode', v as any)}>
            <TabsList className="w-full">
              <TabsTrigger value="fromMenu" className="flex-1">From Menu</TabsTrigger>
              <TabsTrigger value="freeform" className="flex-1">Freeform Special</TabsTrigger>
            </TabsList>

            <TabsContent value="fromMenu" className="space-y-1.5 mt-3">
              <Label className="text-xs">Dish *</Label>
              <Controller name="menuItemId" control={control} rules={{ required: mode === 'fromMenu' }} render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue placeholder="Select a dish…" /></SelectTrigger>
                  <SelectContent>
                    {menuItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name} — ${Number(item.price).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )} />
              {mode === 'fromMenu' && errors.menuItemId && <p className="text-xs text-destructive">Pick a dish</p>}
              {menuItems.length === 0 && <p className="text-xs text-muted-foreground">No available dishes on the menu yet.</p>}
            </TabsContent>

            <TabsContent value="freeform" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name *</Label>
                <Input {...register('name', { required: mode === 'freeform' })} placeholder="e.g. Chef's Jollof Special" />
                {mode === 'freeform' && errors.name && <p className="text-xs text-destructive">Name is required</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Description</Label>
                <Textarea rows={2} {...register('description')} placeholder="Optional description…" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Price ($) *</Label>
                <Input type="number" min="0" step="0.01" {...register('price', { required: mode === 'freeform', min: 0 })} placeholder="0.00" />
                {mode === 'freeform' && errors.price && <p className="text-xs text-destructive">Enter a valid price</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Allergens (comma-separated)</Label>
                <Input {...register('allergens')} placeholder="e.g. nuts, dairy" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={watch('isVegetarian')} onCheckedChange={(v: boolean) => setValue('isVegetarian', v)} />
                  Vegetarian
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox checked={watch('isVegan')} onCheckedChange={(v: boolean) => setValue('isVegan', v)} />
                  Vegan
                </label>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
