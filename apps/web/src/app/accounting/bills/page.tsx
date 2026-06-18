'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BillsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bills</h1>
        <p className="text-muted-foreground text-sm">Supplier bills and payments</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Bills</p>
              <p className="text-sm mt-2">This module needs a dedicated backend endpoint.</p>
              <p className="text-sm">Connect to the NestJS API to activate this feature.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
