'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { shortStayApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const HOUR_PRESETS = [1, 2, 3];

interface Props { booking: any | null; onOpenChange: (v: boolean) => void; }

export function ExtendStayDialog({ booking, onOpenChange }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [hours, setHours] = useState(1);

  useEffect(() => {
    if (booking) setHours(1);
  }, [booking]);

  const mutation = useMutation({
    mutationFn: () => shortStayApi.extend(booking.id, hours),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['short-stays'] });
      queryClient.invalidateQueries({ queryKey: ['short-stay-stats'] });
      toast({ title: `Extended by ${hours}h` });
      onOpenChange(false);
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to extend stay' }),
  });

  const additionalAmount = booking ? hours * Number(booking.hourlyRate) : 0;

  return (
    <Dialog open={!!booking} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Extend Stay</DialogTitle>
          <DialogDescription>Room {booking?.room?.roomNumber} — add more time to this booking.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Additional Hours</Label>
            <div className="flex flex-wrap gap-2">
              {HOUR_PRESETS.map((h) => (
                <Button
                  key={h}
                  type="button"
                  size="sm"
                  variant={hours === h ? 'default' : 'outline'}
                  className={cn(hours === h && 'bg-primary text-primary-foreground')}
                  onClick={() => setHours(h)}
                >
                  +{h}h
                </Button>
              ))}
              <Input
                type="number"
                min="1"
                className="w-24 h-9"
                value={hours}
                onChange={(e) => setHours(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm flex justify-between">
            <span className="text-muted-foreground">Additional charge</span>
            <span className="font-semibold">${additionalAmount.toFixed(2)}</span>
          </div>
          <p className="text-xs text-muted-foreground">Added to the balance due at checkout — nothing is collected now.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            disabled={mutation.isPending}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Extend
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
