'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { nightAuditApi } from '@/lib/api';

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

export default function DailyReportPrintPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Preparing report…</p></div>}>
      <DailyReportPrintContent />
    </Suspense>
  );
}

function DailyReportPrintContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const propertyId = searchParams.get('propertyId') ?? '';
  const date = searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['nightaudit-daily-report', propertyId, date],
    queryFn: () => nightAuditApi.dailyReport(propertyId, date).then((r) => r.data),
    enabled: !!propertyId && !!date,
  });

  if (isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparing report…</p>
      </div>
    );
  }

  const { property, nightAudit, housekeeping, maintenance, restaurant, staffAttendance } = data;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #daily-report, #daily-report * { visibility: visible; }
          #daily-report { position: absolute; left: 0; top: 0; width: 100%; }
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

        <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px', color: '#1f2937' }} id="daily-report">
          <div style={{ marginBottom: 28, borderBottom: `3px solid ${BRAND_COLOR}`, paddingBottom: 16 }}>
            <p style={{ fontSize: 11, color: '#6b7280', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Daily Full Report — Day &amp; Night</p>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 0' }}>{property?.name ?? 'Maryland Guesthouse'}</h1>
            <p style={{ fontSize: 12, color: '#6b7280', margin: '6px 0 0' }}>
              {format(new Date(date), 'dd MMMM yyyy')}
            </p>
          </div>

          <Section title="Night Audit Summary">
            <StatGrid items={[
              { label: 'Arrivals', value: nightAudit.arrivals },
              { label: 'Departures', value: nightAudit.departures },
              { label: 'No-Shows', value: nightAudit.noShows },
              { label: 'Occupancy', value: `${nightAudit.occupancyRate}%` },
              { label: 'Rooms Occupied', value: nightAudit.roomsOccupied },
              { label: 'Revenue', value: `$${Number(nightAudit.totalRevenue).toFixed(2)}` },
              { label: 'Payments', value: `$${Number(nightAudit.totalPayments).toFixed(2)}` },
              { label: 'Room Charges to Post', value: nightAudit.nightlyChargesPosted },
            ]} />
          </Section>

          <Section title="Housekeeping & Maintenance">
            <StatGrid items={[
              { label: 'HK Completion', value: `${housekeeping.completionRate}%` },
              { label: 'HK Completed', value: housekeeping.completed },
              { label: 'HK Pending', value: housekeeping.pending },
              { label: 'HK In Progress', value: housekeeping.inProgress },
              { label: 'Work Orders', value: maintenance.total },
            ]} />
            <Table
              headers={['Status', 'Count']}
              rows={maintenance.byStatus.map((s: any) => [s.status, s._count?.id ?? s.count ?? 0])}
            />
          </Section>

          <Section title="Restaurant & Bar Revenue">
            {restaurant ? (
              <>
                <StatGrid items={[
                  { label: 'Revenue', value: `$${Number(restaurant.total).toLocaleString()}` },
                  { label: 'Orders Served', value: restaurant.orderCount },
                ]} />
                <Table
                  headers={['Item', 'Qty', 'Revenue']}
                  rows={restaurant.topItems.map((i: any) => [i.name, i.quantity, `$${Number(i.revenue).toFixed(2)}`])}
                />
              </>
            ) : (
              <p style={{ fontSize: 12, color: '#9ca3af' }}>No restaurant configured for this property.</p>
            )}
          </Section>

          <Section title="Staff Attendance">
            <StatGrid items={[
              { label: 'Present', value: staffAttendance.present },
              { label: 'Absent', value: staffAttendance.absent },
              { label: 'Late', value: staffAttendance.late },
              { label: 'Half Day', value: staffAttendance.halfDay },
              { label: 'On Leave', value: staffAttendance.onLeave },
              { label: 'Total Records', value: staffAttendance.total },
            ]} />
            <Table
              headers={['Employee', 'Department', 'Status', 'Clock In', 'Clock Out']}
              rows={staffAttendance.records.map((r: any) => [
                `${r.employee?.firstName ?? ''} ${r.employee?.lastName ?? ''}`.trim() || '—',
                r.employee?.department?.name ?? '—',
                r.status,
                r.clockIn ? format(new Date(r.clockIn), 'HH:mm') : '—',
                r.clockOut ? format(new Date(r.clockOut), 'HH:mm') : '—',
              ])}
            />
          </Section>

          <div style={{ marginTop: 28, paddingTop: 16, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: '#9ca3af', margin: 0 }}>Generated {format(new Date(), 'dd MMM yyyy, HH:mm')}</p>
          </div>
        </div>
      </div>
    </>
  );
}
