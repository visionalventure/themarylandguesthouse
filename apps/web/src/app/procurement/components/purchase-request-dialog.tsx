'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { procurementApi, settingsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface LineItem { itemName: string; quantity: number; unit: string; estimatedCost: number; }
interface Props { open: boolean; onOpenChange: (v: boolean) => void; propertyId: string; }

export function PurchaseRequestDialog({ open, onOpenChange, propertyId }: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [department, setDepartment] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ itemName: '', quantity: 1, unit: 'pcs', estimatedCost: 0 }]);

  const { data: deptData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => settingsApi.getDepartments().then(r => r.data),
    enabled: open,
  });
  const departments: any[] = Array.isArray(deptData) ? deptData : (deptData?.data ?? []);

  useEffect(() => {
    if (open) { setDepartment(''); setNotes(''); setItems([{ itemName: '', quantity: 1, unit: 'pcs', estimatedCost: 0 }]); }
  }, [open]);

  const addItem = () => setItems(p => [...p, { itemName: '', quantity: 1, unit: 'pcs', estimatedCost: 0 }]);
  const removeItem = (i: number) => setItems(p => p.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string | number) =>
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: value } : it));

  const mutation = useMutation({
    mutationFn: () => procurementApi.createPR({ propertyId, department, notes, items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase request created' });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed' }),
  });

  const canSubmit = items.every(i => i.itemName.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New Purchase Request</DialogTitle></DialogHeader>
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Department</Label>
              {departments.length > 0 ? (
                <Select value={department} onValueChange={setDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department…" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input placeholder="e.g. Housekeeping" value={department} onChange={e => setDepartment(e.target.value)} />
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Items *</Label>
              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={addItem}>
                <Plus className="w-3 h-3 mr-1" /> Add Item
              </Button>
            </div>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <Input className="col-span-4 h-8 text-sm" placeholder="Item name" value={item.itemName}
                    onChange={e => updateItem(idx, 'itemName', e.target.value)} />
                  <Input className="col-span-2 h-8 text-sm" type="number" min="1" placeholder="Qty" value={item.quantity}
                    onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                  <Input className="col-span-2 h-8 text-sm" placeholder="Unit" value={item.unit}
                    onChange={e => updateItem(idx, 'unit', e.target.value)} />
                  <Input className="col-span-3 h-8 text-sm" type="number" min="0" step="0.01" placeholder="Est. cost"
                    value={item.estimatedCost || ''}
                    onChange={e => updateItem(idx, 'estimatedCost', Number(e.target.value))} />
                  <Button size="icon" variant="ghost" className="col-span-1 h-8 w-8 text-muted-foreground hover:text-red-500"
                    onClick={() => removeItem(idx)} disabled={items.length === 1}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea rows={2} placeholder="Additional context..." value={notes} onChange={e => setNotes(e.target.value)} />
          </div>

          <div className="text-sm text-muted-foreground text-right">
            Estimated total: <span className="font-semibold text-foreground">
              ${items.reduce((s, i) => s + i.estimatedCost * i.quantity, 0).toFixed(2)}
            </span>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
