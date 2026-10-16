'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, Loader2, UtensilsCrossed, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { menuOfTheDayApi, restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface Props { propertyId: string; }

export function MenuOfTheDayCard({ propertyId }: Props) {
  const { toast } = useToast();

  const { data: restaurants } = useQuery({
    queryKey: ['restaurants', propertyId],
    queryFn: () => restaurantApi.list(propertyId).then((r) => r.data),
    enabled: !!propertyId,
  });
  const restaurant = (Array.isArray(restaurants) ? restaurants : [])[0] ?? null;
  const restaurantId = restaurant?.id ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['menu-of-the-day', restaurantId],
    queryFn: () => menuOfTheDayApi.get(restaurantId).then((r) => r.data),
    enabled: !!restaurantId,
  });
  const entries: any[] = data?.entries ?? [];

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

  if (!restaurant) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UtensilsCrossed className="w-4 h-4" /> Menu of the Day
          <Button
            variant="outline"
            size="sm"
            className="ml-auto h-7 text-xs"
            disabled={entries.length === 0 || sendMutation.isPending}
            onClick={() => sendMutation.mutate()}
          >
            {sendMutation.isPending ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
            Send to Checked-In Guests
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" />Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No menu of the day set yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {entries.map((entry) => (
              <div key={entry.id} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground text-sm">{entry.name}</span>
                    {(entry.isVegan || entry.isVegetarian) && (
                      <Badge variant="outline" className="text-[10px] text-green-600">
                        <Leaf className="w-2.5 h-2.5 mr-1" />{entry.isVegan ? 'Vegan' : 'Vegetarian'}
                      </Badge>
                    )}
                  </div>
                  {entry.description && <p className="text-xs text-muted-foreground mt-0.5">{entry.description}</p>}
                </div>
                <span className="font-semibold text-foreground text-sm whitespace-nowrap">${Number(entry.price).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
