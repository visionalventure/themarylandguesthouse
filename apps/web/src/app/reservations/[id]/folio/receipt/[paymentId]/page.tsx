'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';
import { api } from '@/lib/api';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Cash',
  VISA: 'Visa Card',
  MASTERCARD: 'Mastercard',
  BANK_TRANSFER: 'Bank Transfer',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOBILE_MONEY: 'MTN Mobile Money',
  CHECK: 'Cheque',
};

export default function ReceiptPage() {
  const { id, paymentId } = useParams<{ id: string; paymentId: string }>();
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ['receipt', id, paymentId],
    queryFn: () => api.get(`/v1/folio/${id}/receipt/${paymentId}`).then(r => r.data),
    enabled: !!id && !!paymentId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparing receipt…</p>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Receipt not found.</p>
      </div>
    );
  }

  const { receipt, guest, reservation, property, summary } = data;
  const tpl = property?.receiptTemplate ?? {};
  const brandColor = tpl.primaryColor ?? '#D4AF37';
  const outstanding = Number(summary?.outstandingBalance ?? 0);

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
        body { font-family: Arial, sans-serif; color: #1f2937; background: white; margin: 0; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Full-page white background, independent of the app's dark theme */}
      <div style={{ background: 'white', minHeight: '100vh' }}>

      {/* Screen-only actions */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2 items-center">
        <button
          onClick={() => router.back()}
          style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => window.print()}
          style={{ background: brandColor, color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Receipt */}
      <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 20px', color: '#1f2937' }} id="receipt">
        {/* Header */}
        <div style={{ background: brandColor, padding: '24px 32px', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {property?.logoUrl && /^https?:\/\//i.test(property.logoUrl) && (
              <img src={property.logoUrl} alt="" style={{ height: 48, marginBottom: 8, objectFit: 'contain' }} />
            )}
            <h1 style={{ color: 'white', margin: 0, fontSize: 22, fontWeight: 700 }}>{tpl.companyHeader ?? property?.name ?? 'Maryland Guesthouse'}</h1>
            {tpl.tagline && <p style={{ color: 'rgba(255,255,255,0.8)', margin: '4px 0 0', fontSize: 12 }}>{tpl.tagline}</p>}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ color: 'white', fontSize: 11, margin: 0, opacity: 0.7 }}>RECEIPT</p>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{receipt?.receiptNumber}</p>
            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, margin: '4px 0 0' }}>
              {receipt?.date ? format(new Date(receipt.date), 'dd MMMM yyyy, HH:mm') : '—'}
            </p>
          </div>
        </div>

        {/* Body */}
        <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', padding: '32px', borderRadius: '0 0 8px 8px' }}>
          {property?.address && <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 2px' }}>{property.address}</p>}
          {(property?.phone || property?.email) && (
            <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 20px' }}>
              {[property?.phone, property?.email].filter(Boolean).join(' · ')}
            </p>
          )}

          {/* Guest & Reservation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #e5e7eb' }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Guest</p>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{guest?.firstName} {guest?.lastName}</p>
              {guest?.email && <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>{guest.email}</p>}
              {guest?.phone && <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>{guest.phone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Reservation</p>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{reservation?.reservationNo}</p>
              <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>Room {reservation?.rooms?.join(', ') ?? '—'}</p>
              <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>
                {reservation?.checkIn ? format(new Date(reservation.checkIn), 'dd MMM') : ''} – {reservation?.checkOut ? format(new Date(reservation.checkOut), 'dd MMM yyyy') : ''}
              </p>
            </div>
          </div>

          {/* Payment details */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 0', fontSize: 13, color: '#6b7280' }}>Payment Method</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>{METHOD_LABELS[receipt?.method] ?? receipt?.method}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 0', fontSize: 13, color: '#6b7280' }}>Amount Paid</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 18, fontWeight: 700, color: brandColor }}>${Number(receipt?.amount ?? 0).toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 0', fontSize: 13, color: '#6b7280' }}>Total Charges</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 13 }}>${Number(summary?.totalCharges ?? 0).toFixed(2)}</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '10px 0', fontSize: 13, color: '#6b7280' }}>Total Paid (all payments)</td>
                <td style={{ padding: '10px 0', textAlign: 'right', fontSize: 13 }}>${Number(summary?.totalPaid ?? 0).toFixed(2)}</td>
              </tr>
              <tr>
                <td style={{ padding: '10px 0 0', fontSize: 14, fontWeight: 700 }}>Outstanding Balance</td>
                <td style={{ padding: '10px 0 0', textAlign: 'right', fontSize: 16, fontWeight: 700, color: outstanding > 0 ? '#ef4444' : '#16a34a' }}>
                  ${outstanding.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Notes */}
          {receipt?.notes && (
            <div style={{ marginTop: 8, padding: '12px 16px', background: '#f9fafb', borderRadius: 6, borderLeft: `3px solid ${brandColor}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</p>
              <p style={{ fontSize: 13, margin: 0, color: '#374151' }}>{receipt.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
              {tpl.footerNote || `Thank you for staying at ${property?.name ?? 'us'}!`}
            </p>
            <p style={{ fontSize: 11, color: '#d1d5db', margin: '4px 0 0' }}>This is an official receipt. Please retain for your records.</p>
          </div>
        </div>
      </div>

      </div>
    </>
  );
}
