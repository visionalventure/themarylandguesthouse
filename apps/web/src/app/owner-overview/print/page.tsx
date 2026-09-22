'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { ownerApi } from '@/lib/api';

const BRAND_COLOR = '#D4AF37';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
      <h2 style={{ fontSize: 15, fontWeight: 700, color: BRAND_COLOR, borderBottom: `2px solid ${BRAND_COLOR}`, paddingBottom: 6, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatGrid({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
      {items.map((it) => (
        <div key={it.label} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: '8px 12px' }}>
          <p style={{ fontSize: 10, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{it.label}</p>
          <p style={{ fontSize: 15, fontWeight: 700, margin: '2px 0 0', color: '#1f2937' }}>{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: (string | number)[][] }) {
  if (!rows.length) return <p style={{ fontSize: 12, color: '#9ca3af' }}>No data.</p>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h} style={{ textAlign: 'left', padding: '6px 8px', borderBottom: '1px solid #e5e7eb', color: '#6b7280', fontWeight: 600 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding: '6px 8px', borderBottom: '1px solid #f3f4f6' }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function OwnerOverviewPrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Preparing report…</p></div>}>
      <OwnerOverviewPrintContent />
    </Suspense>
  );
}

function OwnerOverviewPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get('propertyId') ?? '';

  const { data, isLoading } = useQuery({
    queryKey: ['owner-overview-print', propertyId],
    queryFn: () => ownerApi.overview(propertyId).then((r) => r.data),
    enabled: !!propertyId,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparing report…</p>
      </div>
    );
  }

  const { property, financial, bookings, people, compliance, operations, generatedAt } = data;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #owner-report, #owner-report * { visibility: visible; }
          #owner-report { position: absolute; left: 0; top: 0; width: 100%; }
        }
        body { font-family: Arial, sans-serif; color: #1f2937; background: white; margin: 0; }
        * { box-sizing: border-box; }
      `}</style>

      <div style={{ background: 'white', minHeight: '100vh' }}>
        <div className="no-print fixed top-4 right-4 z-50 flex gap-2 items-center">
          <button
            onClick={() => router.back()}
            style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.print()}
            style={{ background: BRAND_COLOR, color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
        </div>

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#1f2937' }} id="owner-report">
          <div style={{ marginBottom: 28, borderBottom: `3px solid ${BRAND_COLOR}`, paddingBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Owner Overview Report</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 0' }}>{property?.name ?? 'Maryland Guesthouse'}</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
              Generated {generatedAt ? format(new Date(generatedAt), 'dd MMMM yyyy, HH:mm') : ''}
            </p>
          </div>

          <Section title="Financial">
            <StatGrid items={[
              { label: 'Revenue Today', value: `$${Number(financial.revenueToday).toLocaleString()}` },
              { label: 'Revenue This Month', value: `$${Number(financial.revenueThisMonth).toLocaleString()}` },
              { label: 'Net Profit (MTD)', value: `$${Number(financial.profitAndLoss.netProfit).toLocaleString()}` },
              { label: 'Total Expenses (MTD)', value: `$${Number(financial.profitAndLoss.totalExpenses).toLocaleString()}` },
              { label: 'Outstanding Invoices', value: `$${Number(financial.outstandingInvoicesAmount).toLocaleString()} (${financial.outstandingInvoicesCount})` },
              { label: 'Aged Receivables >90d', value: `$${Number(financial.agedReceivables.over90).toLocaleString()}` },
            ]} />
            <Table headers={['Category', 'Amount']} rows={financial.revenueByCategory.map((c: any) => [c.category, `$${Number(c.amount).toLocaleString()}`])} />
          </Section>

          <Section title="Bookings">
            <StatGrid items={[
              { label: 'Room Occupancy', value: `${bookings.occupancyRate}% (${bookings.occupiedRooms}/${bookings.totalRooms})` },
              { label: 'Apartment Occupancy', value: `${bookings.apartmentOccupancyRate}% (${bookings.occupiedApartments}/${bookings.totalApartments})` },
              { label: 'Check-ins Today', value: bookings.checkInsToday },
              { label: 'Check-outs Today', value: bookings.checkOutsToday },
              { label: 'Active Short Stays', value: bookings.activeShortStays },
            ]} />
            <Table headers={['Source', 'Bookings']} rows={bookings.bookingSources.map((s: any) => [s.source, s.count])} />
          </Section>

          <Section title="People">
            <StatGrid items={[
              { label: 'Total Employees', value: people.totalEmployees },
              { label: 'Active', value: people.activeEmployees },
              { label: 'On Leave', value: people.onLeave },
              { label: 'Pending Approvals', value: people.pendingApprovals },
              { label: 'Contracts Expiring (60d)', value: people.contractsExpiring },
              { label: 'Payroll Net Pay (MTD)', value: `$${Number(people.payrollThisPeriod?.netPay ?? 0).toLocaleString()}` },
            ]} />
            <Table headers={['Department', 'Employees']} rows={people.headcountByDepartment.map((d: any) => [d.department, d.employees])} />
          </Section>

          <Section title="Compliance">
            <StatGrid items={[
              { label: 'Compliance Score', value: `${compliance.complianceScore}%` },
              { label: 'Tracked Documents', value: compliance.total },
              { label: 'Valid', value: compliance.validCount },
              { label: 'Expiring 30d', value: compliance.expiring30Count },
              { label: 'Expiring 90d', value: compliance.expiring90Count },
              { label: 'Expired', value: compliance.expiredCount },
            ]} />
            <Table
              headers={['Document', 'Category', 'Expires']}
              rows={compliance.expiring30.map((d: any) => [d.name, d.category, d.expiryDate ? format(new Date(d.expiryDate), 'dd MMM yyyy') : '—'])}
            />
          </Section>

          <Section title="Operations">
            <StatGrid items={[
              { label: 'Housekeeping Completion', value: `${operations.housekeeping.completionRate}%` },
              { label: 'HK Pending', value: operations.housekeeping.pending },
              { label: 'Work Orders', value: operations.maintenance.total },
              { label: 'Low Stock Alerts', value: operations.lowStockAlerts },
              { label: 'Restaurant Revenue (MTD)', value: operations.restaurantRevenue ? `$${Number(operations.restaurantRevenue.total).toLocaleString()}` : 'N/A' },
            ]} />
            <Table headers={['Status', 'Count']} rows={operations.maintenance.byStatus.map((s: any) => [s.status, s.count])} />
          </Section>

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Confidential — for the property owner only.</p>
          </div>
        </div>
      </div>
    </>
  );
}
