'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Plus, MapPin, Phone, Mail, Star, BedDouble, Users2, CalendarDays, Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { propertiesApi } from '@/lib/api';
import { PropertyFormDialog } from './components/property-form-dialog';
import { FadeIn } from '@/components/ui/fade-in';
import { StaggerGrid, StaggerItem } from '@/components/ui/stagger-grid';

import { usePageTitle } from '@/hooks/use-page-title';


export default function PropertiesPage() {
  usePageTitle('Properties');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => propertiesApi.list().then((r) => r.data),
  });

  const properties: any[] = data ?? [];

  const openCreate = () => {
    setEditTarget(null);
    setDialogOpen(true);
  };

  const openEdit = (property: any) => {
    setEditTarget(property);
    setDialogOpen(true);
  };

  return (
    <FadeIn className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Properties</h1>
          <p className="text-muted-foreground text-sm">Manage properties under your organization</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Property
        </Button>
      </div>

      {isLoading && !data ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-5 space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : properties.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg font-medium text-foreground">No properties yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first property to get started.</p>
            <Button className="mt-4 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </CardContent>
        </Card>
      ) : (
        <StaggerGrid className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {properties.map((property: any) => (
            <StaggerItem key={property.id}>
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="pt-5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{property.name}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{property.code}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">{property.type}</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => openEdit(property)}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5">
                  {(property.address || property.city) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {[property.address, property.city, property.country].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                  {property.phone && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Phone className="w-3 h-3 flex-shrink-0" />
                      {property.phone}
                    </div>
                  )}
                  {property.email && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{property.email}</span>
                    </div>
                  )}
                  {property.starRating && (
                    <div className="flex items-center gap-1">
                      {Array.from({ length: property.starRating }).map((_, i) => (
                        <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-border grid grid-cols-3 gap-3 text-center">
                  <div>
                    <BedDouble className="w-4 h-4 mx-auto text-primary" />
                    <p className="text-sm font-bold text-foreground mt-1">{property._count?.rooms ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Rooms</p>
                  </div>
                  <div>
                    <Users2 className="w-4 h-4 mx-auto text-[hsl(var(--chart-2))]" />
                    <p className="text-sm font-bold text-foreground mt-1">{property._count?.employees ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Staff</p>
                  </div>
                  <div>
                    <CalendarDays className="w-4 h-4 mx-auto text-[hsl(var(--chart-3))]" />
                    <p className="text-sm font-bold text-foreground mt-1">{property._count?.reservations ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Bookings</p>
                  </div>
                </div>

                {(property.checkInTime || property.checkOutTime) && (
                  <div className="mt-3 text-xs text-muted-foreground">
                    Check-in {property.checkInTime} · Check-out {property.checkOutTime}
                  </div>
                )}
              </CardContent>
            </Card>
            </StaggerItem>
          ))}
        </StaggerGrid>
      )}

      <PropertyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={editTarget ? 'edit' : 'create'}
        initialData={editTarget}
      />
    </FadeIn>
  );
}
