'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, UtensilsCrossed, ShoppingBag, DollarSign, TrendingUp, X, ArrowRightLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { restaurantApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { OrderDialog } from './components/order-dialog';
import { MenuItemDialog } from './components/menu-item-dialog';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400',
  PREPARING: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-primary/20 dark:text-primary',
  READY:     'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400',
  SERVED:    'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400',
};

const TABLE_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-green-500/15 border-green-500/40 text-green-600 dark:text-green-400',
  OCCUPIED:  'bg-primary/15 border-primary/40 text-primary',
  RESERVED:  'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400',
};

const STATUS_NEXT: Record<string, string> = {
  PENDING: 'PREPARING',
  PREPARING: 'READY',
  READY: 'SERVED',
};

export default function RestaurantPage() {
  usePageTitle('Restaurant & Bar');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [orderDialogOpen, setOrderDialogOpen] = useState(false);
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<any | null>(null);
  const [moveTableMode, setMoveTableMode] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: restaurants } = useQuery({
    queryKey: ['restaurants', propertyId],
    queryFn: () => restaurantApi.list(propertyId).then(r => r.data),
  });

  const restaurantList: any[] = Array.isArray(restaurants) ? restaurants : [];
  const restaurant = restaurantList[0] ?? null;
  const restaurantId = restaurant?.id ?? '';

  const { data: tablesData } = useQuery({
    queryKey: ['tables', restaurantId],
    queryFn: () => restaurantApi.tables(restaurantId).then(r => r.data),
    enabled: !!restaurantId,
  });

  const { data: ordersData } = useQuery({
    queryKey: ['orders', restaurantId],
    queryFn: () => restaurantApi.orders(restaurantId, { status: 'PENDING,PREPARING,READY,SERVED' }).then(r => r.data),
    enabled: !!restaurantId,
    refetchInterval: 30000,
  });

  const { data: menuData } = useQuery({
    queryKey: ['menu', restaurantId],
    queryFn: () => restaurantApi.menu(restaurantId).then(r => r.data),
    enabled: !!restaurantId,
  });

  const tables: any[] = Array.isArray(tablesData) ? tablesData : [];
  const orders: any[] = ordersData?.data ?? [];
  const activeOrders = orders.filter(o => ['PENDING', 'PREPARING', 'READY'].includes(o.status));

  const stats = {
    tablesOccupied: tables.filter(t => t.status === 'OCCUPIED').length,
    activeOrders: activeOrders.length,
    todayRevenue: orders.filter(o => o.status === 'SERVED').reduce((s, o) => s + Number(o.totalAmount), 0),
    avgOrder: activeOrders.length > 0
      ? activeOrders.reduce((s, o) => s + Number(o.totalAmount), 0) / activeOrders.length
      : 0,
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      restaurantApi.updateOrderStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      setSelectedTable(null);
      toast({ title: 'Order updated' });
    },
  });

  const moveTableMutation = useMutation({
    mutationFn: ({ orderId, tableId }: { orderId: string; tableId: string }) =>
      restaurantApi.moveTable(orderId, tableId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tables'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setSelectedTable(null);
      setMoveTableMode(false);
      toast({ title: 'Table moved successfully' });
    },
  });

  const handleTableClick = (table: any) => {
    if (table.status === 'OCCUPIED' && table.orders?.[0]) {
      setSelectedTable(table);
      setMoveTableMode(false);
    }
  };

  const activeOrder = selectedTable?.orders?.[0];

  if (!restaurant) {
    return (
      <FadeIn className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Restaurant & Bar</h1>
          <p className="text-muted-foreground text-sm">Point of sale, table management, and menu</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            No restaurant configured for this property. Add one via the API or database seeder.
          </CardContent>
        </Card>
      </FadeIn>
    );
  }

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{restaurant.name}</h1>
          <p className="text-muted-foreground text-sm">Restaurant & Bar — Point of Sale</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMenuDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" /> Add Menu Item
          </Button>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setOrderDialogOpen(true)}>
            <ShoppingBag className="w-4 h-4 mr-2" /> New Order
          </Button>
        </div>
      </div>

      <StaggerGrid className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Tables Occupied', value: stats.tablesOccupied, icon: UtensilsCrossed, color: 'text-primary' },
          { label: 'Active Orders', value: stats.activeOrders, icon: ShoppingBag, color: 'text-amber-500' },
          { label: "Today's Revenue", value: stats.todayRevenue, icon: DollarSign, color: 'text-green-500', formatter: (v: number) => `$${v.toFixed(0)}` },
          { label: 'Avg Order', value: stats.avgOrder, icon: TrendingUp, color: 'text-muted-foreground', formatter: (v: number) => `$${v.toFixed(0)}` },
        ].map(stat => (
          <StaggerItem key={stat.label}>
            <Card>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center gap-3">
                  <stat.icon className={cn('w-8 h-8', stat.color)} />
                  <div>
                    <AnimatedCounter value={stat.value} formatter={stat.formatter} className="text-2xl font-bold block" />
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </StaggerGrid>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables">Table View</TabsTrigger>
          <TabsTrigger value="orders">Active Orders</TabsTrigger>
          <TabsTrigger value="menu">Menu</TabsTrigger>
        </TabsList>

        {/* Table Grid */}
        <TabsContent value="tables">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
            {tables.length === 0 ? (
              <div className="col-span-full py-12 text-center text-muted-foreground text-sm">
                No tables configured yet.
              </div>
            ) : (
              tables.map(table => (
                <div
                  key={table.id}
                  onClick={() => handleTableClick(table)}
                  className={cn('border rounded-xl p-4 text-center space-y-1 transition-all',
                    TABLE_STATUS_COLORS[table.status] ?? 'bg-muted border-border',
                    table.status === 'OCCUPIED' ? 'cursor-pointer hover:ring-2 hover:ring-primary/50 hover:scale-[1.02]' : 'cursor-default')}
                >
                  <p className="text-xl font-bold">{table.tableNumber}</p>
                  <p className="text-[10px] font-medium capitalize">{table.status.toLowerCase()}</p>
                  <p className="text-[9px] opacity-60">Cap: {table.capacity}</p>
                  {table.orders?.[0] && (
                    <p className="text-[9px] opacity-70 truncate">
                      {table.orders[0].items?.length ?? 0} items
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        {/* Active Orders */}
        <TabsContent value="orders">
          <Card className="mt-4">
            <CardContent className="p-0">
              {activeOrders.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground text-sm">No active orders right now.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10 bg-background">
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Order #</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Table</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Items</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Total</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground">Time</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeOrders.map(order => (
                      <tr key={order.id} className="border-b border-border hover:bg-muted/30">
                        <td className="px-4 py-3 font-mono text-xs text-primary">{order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm">{order.table?.tableNumber ?? order.roomNumber ?? '—'}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {order.items?.map((i: any) => `${i.quantity}× ${i.menuItem?.name}`).join(', ')}
                        </td>
                        <td className="px-4 py-3 font-medium">${Number(order.totalAmount).toFixed(2)}</td>
                        <td className="px-4 py-3">
                          <Badge className={cn('text-xs border', ORDER_STATUS_COLORS[order.status] ?? '')}>
                            {order.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(order.createdAt), 'HH:mm')}
                        </td>
                        <td className="px-4 py-3">
                          {STATUS_NEXT[order.status] && (
                            <Button size="sm" variant="outline" className="h-7 text-xs"
                              onClick={() => statusMutation.mutate({ id: order.id, status: STATUS_NEXT[order.status] })}>
                              → {STATUS_NEXT[order.status]}
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Menu */}
        <TabsContent value="menu">
          <div className="mt-4 space-y-4">
            {(menuData?.categories ?? []).map((cat: any) => (
              <Card key={cat.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{cat.name}</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <tbody>
                      {cat.menuItems?.map((item: any) => (
                        <tr key={item.id} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-2 font-medium text-foreground">{item.name}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{item.description}</td>
                          <td className="px-4 py-2 text-right font-semibold text-foreground">${Number(item.price).toFixed(2)}</td>
                          <td className="px-4 py-2">
                            <Badge variant="outline" className={cn('text-xs', item.isAvailable ? 'text-green-600' : 'text-red-600')}>
                              {item.isAvailable ? 'Available' : 'Unavailable'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ))}
            {(!menuData?.categories || menuData.categories.length === 0) && (
              <div className="py-12 text-center text-muted-foreground text-sm">
                No menu items yet. Add some using the "Add Menu Item" button.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <OrderDialog open={orderDialogOpen} onOpenChange={setOrderDialogOpen} restaurantId={restaurantId} />
      <MenuItemDialog open={menuDialogOpen} onOpenChange={setMenuDialogOpen} restaurantId={restaurantId} />

      {/* Bill Detail Dialog */}
      <Dialog open={!!selectedTable} onOpenChange={(v) => { if (!v) { setSelectedTable(null); setMoveTableMode(false); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UtensilsCrossed className="w-4 h-4 text-primary" />
              Table {selectedTable?.tableNumber} — Current Order
            </DialogTitle>
          </DialogHeader>

          {activeOrder ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-mono">{activeOrder.orderNumber}</span>
                <span>{format(new Date(activeOrder.createdAt), 'HH:mm')}</span>
              </div>

              {/* Order items */}
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium text-muted-foreground">Item</th>
                      <th className="text-center px-3 py-2 font-medium text-muted-foreground">Qty</th>
                      <th className="text-right px-3 py-2 font-medium text-muted-foreground">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(activeOrder.items ?? []).map((item: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2">{item.menuItem?.name}</td>
                        <td className="px-3 py-2 text-center text-muted-foreground">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">${Number(item.totalPrice).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-muted/30">
                    <tr>
                      <td colSpan={2} className="px-3 py-2 font-semibold">Total</td>
                      <td className="px-3 py-2 text-right font-bold text-primary">${Number(activeOrder.totalAmount).toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Move table picker */}
              {moveTableMode && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">Select destination table:</p>
                  <div className="grid grid-cols-4 gap-2">
                    {tables.filter(t => t.id !== selectedTable?.id && t.status === 'AVAILABLE').map(t => (
                      <button
                        key={t.id}
                        className="border border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400 rounded-lg p-2 text-center text-sm font-bold hover:ring-2 hover:ring-green-500/50 transition-all"
                        onClick={() => moveTableMutation.mutate({ orderId: activeOrder.id, tableId: t.id })}
                        disabled={moveTableMutation.isPending}
                      >
                        {t.tableNumber}
                      </button>
                    ))}
                  </div>
                  {tables.filter(t => t.id !== selectedTable?.id && t.status === 'AVAILABLE').length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">No available tables.</p>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground text-sm">No active order for this table.</div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {activeOrder && !moveTableMode && (
              <>
                <Button
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => setMoveTableMode(true)}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  Move Table
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  disabled={statusMutation.isPending}
                  onClick={() => statusMutation.mutate({ id: activeOrder.id, status: 'SERVED' })}
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Close Bill
                </Button>
              </>
            )}
            {moveTableMode && (
              <Button variant="outline" onClick={() => setMoveTableMode(false)}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancel Move
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FadeIn>
  );
}
