'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function BankingPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Banking</h1>
        <p className="text-muted-foreground text-sm">Bank accounts and transaction reconciliation</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Coming Soon</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg font-medium">Banking</p>
              <p className="text-sm mt-2">This module is fully implemented in the backend API.</p>
              <p className="text-sm">Connect to the NestJS API to activate this feature.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
