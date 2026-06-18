'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Minus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface OrderItem { menuItemId: string; name: string; price: number; quantity: number; }
interface Props { open: boolean; onOpenChange: (v: boolean) => void; restaurantId: string; }

export function OrderDialog({ open, onOpenChange, restaurantId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [tableId, setTableId] = useState('');
  const [items, setItems] = useState<OrderItem[]>([]);

  useEffect(() => {
    if (open) { setTableId(''); setItems([]); }
  }, [open]);

  const { data: tablesData } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => restaurantApi.tables(restaurantId).then(r => r.data),
    enabled: open && !!restaurantId,
  });
  const { data: menuData } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantApi.menu(restaurantId).then(r => r.data),
    enabled: open && !!restaurantId,
  });

  const tables: any[] = (Array.isArray(tablesData) ? tablesData : []).filter(t => t.status === 'AVAILABLE');
  const categories: any[] = menuData?.categories ?? [];

  const addItem = (menuItem: any) => {
    setItems(prev => {
      const existing = prev.find(i => i.menuItemId === menuItem.id);
      if (existing) return prev.map(i => i.menuItemId === menuItem.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { menuItemId: menuItem.id, name: menuItem.name, price: Number(menuItem.price), quantity: 1 }];
    });
  };

  const updateQty = (menuItemId: string, delta: number) => {
    setItems(prev => prev
      .map(i => i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + delta } : i)
      .filter(i => i.quantity > 0));
  };

  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const mutation = useMutation({
    mutationFn: () => restaurantApi.createOrder(restaurantId, {
      tableId: tableId || undefined,
      items: items.map(({ menuItemId, quantity }) => ({ menuItemId, quantity })),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      toast({ title: 'Order created' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Order</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="space-y-2">
            <Label>Table (optional)</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger><SelectValue placeholder="Walk-in / No table" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">Walk-in / No table</SelectItem>
                {tables.map(t => (
                  <SelectItem key={t.id} value={t.id}>Table {t.tableNumber} (Cap: {t.capacity})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="mb-2 block">Add Items</Label>
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {categories.map((cat: any) => (
                <div key={cat.id}>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{cat.name}</p>
                  <div className="grid grid-cols-1 gap-1">
                    {cat.menuItems?.filter((i: any) => i.isAvailable).map((item: any) => {
                      const inOrder = items.find(i => i.menuItemId === item.id);
                      return (
                        <div key={item.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/40 hover:bg-muted/70">
                          <div>
                            <span className="text-sm font-medium">{item.name}</span>
                            <span className="ml-2 text-xs text-muted-foreground">${Number(item.price).toFixed(2)}</span>
                          </div>
                          {inOrder ? (
                            <div className="flex items-center gap-2">
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.id, -1)}>
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm w-4 text-center">{inOrder.quantity}</span>
                              <Button size="icon" variant="outline" className="h-6 w-6" onClick={() => updateQty(item.id, 1)}>
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addItem(item)}>
                              Add
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <p className="text-sm font-semibold">Order Summary</p>
              {items.map(i => (
                <div key={i.menuItemId} className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{i.quantity}× {i.name}</span>
                  <span>${(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span>Total (incl. tax)</span>
                <span>${(total * 1.05).toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={items.length === 0 || mutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Place Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
