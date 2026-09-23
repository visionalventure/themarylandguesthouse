'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { shortStayApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { OfferFormDialog } from './offer-form-dialog';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  propertyId: string;
}

export function ManageOffersDialog({ open, onOpenChange, propertyId }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<any | null>(null);
  const [deletingOffer, setDeletingOffer] = useState<any | null>(null);

  const { data: offers, isLoading } = useQuery({
    queryKey: ['short-stay-offers', propertyId],
    queryFn: () => shortStayApi.offers(propertyId).then((r) => r.data),
    enabled: open && !!propertyId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shortStayApi.deleteOffer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-stay-offers'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-eligible-rooms'] });
      toast({ title: 'Offer deleted' });
      setDeletingOffer(null);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to delete offer' }),
  });

  const list: any[] = Array.isArray(offers) ? offers : [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Short Stay Offers</DialogTitle>
            <DialogDescription>Set up named, fixed-price offers and assign them to rooms — front desk just picks a room and duration.</DialogDescription>
          </DialogHeader>

          <div className="flex justify-end">
            <Button size="sm" onClick={() => { setEditingOffer(null); setFormOpen(true); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-3.5 h-3.5 mr-1" /> New Offer
            </Button>
          </div>

          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
          ) : list.length === 0 ? (
            <div className="py-10 text-center">
              <Tag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">No offers yet</p>
              <p className="text-xs text-muted-foreground mt-1">Create one so rooms become eligible for short stay.</p>
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {list.map((o) => (
                <div key={o.id} className="flex items-center justify-between px-3 py-2.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground">{o.name}</p>
                      {!o.isActive && <Badge variant="outline" className="text-[10px]">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ${Number(o.hourlyRate).toFixed(2)}/hr · {(o.rooms ?? []).length} room{(o.rooms ?? []).length === 1 ? '' : 's'}
                      {(o.rooms ?? []).length > 0 && ` (${(o.rooms ?? []).map((r: any) => r.roomNumber).join(', ')})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingOffer(o); setFormOpen(true); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => setDeletingOffer(o)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <OfferFormDialog open={formOpen} onOpenChange={setFormOpen} propertyId={propertyId} offer={editingOffer} />

      <ConfirmDialog
        open={!!deletingOffer}
        onOpenChange={(v) => { if (!v) setDeletingOffer(null); }}
        title="Delete this offer?"
        description={`"${deletingOffer?.name}" will be removed and its rooms will no longer be eligible for short stay until reassigned.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteMutation.isPending}
        onConfirm={() => deleteMutation.mutate(deletingOffer.id)}
      />
    </>
  );
}
