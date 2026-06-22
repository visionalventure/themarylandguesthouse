'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Package, AlertTriangle, DollarSign, ArrowDownToLine, ArrowUpFromLine, ShoppingCart, ArrowUpDown, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { inventoryApi, procurementApi } from '@/lib/api';
import { ItemFormDialog } from './components/item-form-dialog';
import { StockDialog } from './components/stock-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';
import { AnimatedCounter } from '@/components/ui/animated-counter';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';

import { usePageTitle } from '@/hooks/use-page-title';
import { useAuthStore } from '@/store/auth';


export default function InventoryPage() {
  usePageTitle('Inventory');
  const propertyId = useAuthStore((s) => s.propertyId);
  const [search, setSearch] = useState('');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [stockDialog, setStockDialog] = useState<{ mode: 'in' | 'out'; item: any } | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const handleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortOrder('asc'); }
  };

  const SortIcon = ({ col }: { col: string }) => {
    if (sortBy !== col) return <ArrowUpDown className="inline w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === 'asc'
      ? <ChevronUp className="inline w-3 h-3 ml-1 text-primary" />
      : <ChevronDown className="inline w-3 h-3 ml-1 text-primary" />;
  };

  const { data, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory', { propertyId: propertyId, search: debouncedSearch, sortBy, sortOrder }],
    queryFn: () => inventoryApi.list({ propertyId: propertyId, search: debouncedSearch, limit: 50, sortBy, sortOrder }).then((r) => r.data),
  });

  const { data: lowStock } = useQuery({
    queryKey: ['inventory-low-stock', propertyId],
    queryFn: () => inventoryApi.lowStock(propertyId).then((r) => r.data),
  });

  const { data: valuation } = useQuery({
    queryKey: ['inventory-valuation', propertyId],
    queryFn: () => inventoryApi.valuation(propertyId).then((r) => r.data),
  });

  const items: any[] = data?.data ?? [];

  const autoPRMutation = useMutation({
    mutationFn: (item: any) => procurementApi.createPR({
      tenantId: propertyId,
      propertyId: propertyId,
      title: `Auto-reorder: ${item.name}`,
      description: `Stock below reorder point (${item.currentStock} < ${item.reorderPoint}). Requested ${item.reorderPoint * 2} ${item.unit}.`,
      items: [{ name: item.name, quantity: item.reorderPoint * 2, unit: item.unit, estimatedCost: item.unitCost }],
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-requests'] });
      toast({ title: 'Purchase request created' });
    },
    onError: (err: any) => toast({ variant: 'destructive', title: err.response?.data?.message || 'Failed to create PR' }),
  });

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm">Track stock levels, costs and reorder points</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setItemDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Item
        </Button>
      </div>

      {/* Stats */}
      <StaggerGrid className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StaggerItem>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <AnimatedCounter value={data?.total ?? items.length} className="text-2xl font-bold block" />
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
              <div>
                <AnimatedCounter value={lowStock?.length ?? 0} className="text-2xl font-bold block" />
                <p className="text-xs text-muted-foreground">Low Stock Alerts</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card>
            <CardContent className="pt-4 pb-4 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div>
                <AnimatedCounter
                  value={Number(valuation?.totalValue ?? 0)}
                  formatter={(v) => `$${v.toLocaleString()}`}
                  className="text-2xl font-bold block"
                />
                <p className="text-xs text-muted-foreground">Total Valuation</p>
              </div>
            </CardContent>
          </Card>
        </StaggerItem>
      </StaggerGrid>

      {/* Search */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or SKU..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Items table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Items ({items.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {inventoryLoading ? (
            <div className="py-12 text-center text-muted-foreground text-sm">Loading inventory…</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-base font-medium text-foreground">
                {debouncedSearch ? 'No items match your search' : 'No inventory items yet'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {debouncedSearch ? 'Try a different search term.' : 'Add items to track stock levels, costs, and reorder points.'}
              </p>
              {!debouncedSearch && (
                <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setItemDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" /> Add Item
                </Button>
              )}
            </div>
          ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-background">
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">SKU</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('name')}>Name <SortIcon col="name" /></th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('category')}>Category <SortIcon col="category" /></th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Unit</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('currentStock')}>Stock Level <SortIcon col="currentStock" /></th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground">Reorder Pt.</th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('unitCost')}>Unit Cost <SortIcon col="unitCost" /></th>
                  <th className="text-right px-4 py-3 font-medium text-muted-foreground cursor-pointer select-none hover:text-foreground" onClick={() => handleSort('totalValue')}>Total Value <SortIcon col="totalValue" /></th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((item: any) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">{item.sku}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{item.name}</span>
                        {item.isLowStock && (
                          <Badge variant="destructive" className="text-[10px]">Low Stock</Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.category?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unit}</td>
                    <td className="px-4 py-3">
                      {(() => {
                        const stock = Number(item.currentStock);
                        const reorder = Number(item.reorderPoint) || 1;
                        const max = Math.max(stock, reorder * 2);
                        const pct = Math.min(100, Math.round((stock / max) * 100));
                        const isLow = stock <= reorder;
                        return (
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', isLow ? 'bg-red-500' : pct < 60 ? 'bg-amber-500' : 'bg-green-500')}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className={cn('text-xs font-medium min-w-[2rem] text-right', isLow ? 'text-red-600 dark:text-red-400' : 'text-foreground')}>
                              {stock}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{Number(item.reorderPoint).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">${Number(item.unitCost).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      ${Number(item.totalValue ?? item.currentStock * item.unitCost).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setStockDialog({ mode: 'in', item })}
                        >
                          <ArrowDownToLine className="w-3 h-3 mr-1" />
                          In
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => setStockDialog({ mode: 'out', item })}
                        >
                          <ArrowUpFromLine className="w-3 h-3 mr-1" />
                          Out
                        </Button>
                        {item.isLowStock && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                            disabled={autoPRMutation.isPending}
                            onClick={() => autoPRMutation.mutate(item)}
                          >
                            <ShoppingCart className="w-3 h-3 mr-1" />
                            PR
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          )}
        </CardContent>
      </Card>

      <ItemFormDialog open={itemDialogOpen} onOpenChange={setItemDialogOpen} propertyId={propertyId} />
      {stockDialog && (
        <StockDialog
          open={!!stockDialog}
          onOpenChange={(open) => !open && setStockDialog(null)}
          mode={stockDialog.mode}
          item={stockDialog.item}
        />
      )}
    </FadeIn>
  );
}
