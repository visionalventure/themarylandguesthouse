'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus, Send, Trash2, Loader2, UtensilsCrossed, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { menuOfTheDayApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth';
import { AddMenuOfTheDayEntryDialog } from './add-menu-of-the-day-entry-dialog';

interface Props { restaurantId: string; }

export function MenuOfTheDayTab({ restaurantId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const canEdit = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(currentUser?.role ?? '');

  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deletingEntry, setDeletingEntry] = useState<any | null>(null);
  const [activeMenuOfTheDayId, setActiveMenuOfTheDayId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['menu-of-the-day', restaurantId, date],
    queryFn: () => menuOfTheDayApi.get(restaurantId, date).then((r) => r.data),
    enabled: !!restaurantId,
  });

  const entries: any[] = data?.entries ?? [];

  const ensureMutation = useMutation({
    mutationFn: () => menuOfTheDayApi.upsert(restaurantId, { date }).then((r) => r.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['menu-of-the-day', restaurantId, date] }),
  });

  const removeMutation = useMutation({
    mutationFn: (entryId: string) => menuOfTheDayApi.removeEntry(entryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menu-of-the-day', restaurantId, date] });
      toast({ title: 'Removed from menu of the day' });
      setDeletingEntry(null);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to remove item' }),
  });

  const sendMutation = useMutation({
    mutationFn: () => menuOfTheDayApi.send(data.id).then((r) => r.data),
    onSuccess: (res: any) => {
      toast({
        title: res.whatsappConfigured
          ? `Sent to ${res.sent} of ${res.totalCheckedIn} checked-in guests`
          : `WhatsApp isn't configured yet — would reach ${res.withPhone} of ${res.totalCheckedIn} checked-in guests`,
        description: res.noPhone > 0 ? `${res.noPhone} had no phone number on file` : undefined,
      });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to send' }),
  });

  const handleAddItemClick = async () => {
    let id = data?.id;
    if (!id) {
      const created = await ensureMutation.mutateAsync();
      id = created.id;
    }
    setActiveMenuOfTheDayId(id);
    setAddDialogOpen(true);
  };

  return (
    <div className="mt-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={entries.length === 0 || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Send to Checked-In Guests
          </Button>
          {canEdit && (
            <Button
              disabled={ensureMutation.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
              onClick={handleAddItemClick}
            >
              {ensureMutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
              Add Item
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center">
              <UtensilsCrossed className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No menu of the day set for this date</p>
              {canEdit && <p className="text-xs text-muted-foreground mt-1">Add items to build today's menu.</p>}
            </div>
          ) : (
            <table className="w-full text-sm">
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id} className="border-t border-border first:border-t-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-foreground">{entry.name}</span>
                        {!entry.menuItemId && <Badge variant="outline" className="text-[10px]">Special</Badge>}
                        {entry.isVegan && <Badge variant="outline" className="text-[10px] text-green-600"><Leaf className="w-2.5 h-2.5 mr-1" />Vegan</Badge>}
                        {!entry.isVegan && entry.isVegetarian && <Badge variant="outline" className="text-[10px] text-green-600"><Leaf className="w-2.5 h-2.5 mr-1" />Vegetarian</Badge>}
                      </div>
                      {entry.description && <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>}
                      {entry.allergens?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Contains: {entry.allergens.join(', ')}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground whitespace-nowrap">${Number(entry.price).toFixed(2)}</td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-red-600 hover:text-red-700" onClick={() => setDeletingEntry(entry)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <AddMenuOfTheDayEntryDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          restaurantId={restaurantId}
          menuOfTheDayId={activeMenuOfTheDayId ?? data?.id ?? null}
        />
      )}

      <ConfirmDialog
        open={!!deletingEntry}
        onOpenChange={(v) => { if (!v) setDeletingEntry(null); }}
        title="Remove this item?"
        description={`"${deletingEntry?.name}" will be removed from today's menu of the day.`}
        confirmLabel="Remove"
        variant="danger"
        loading={removeMutation.isPending}
        onConfirm={() => removeMutation.mutate(deletingEntry.id)}
      />
    </div>
  );
}
