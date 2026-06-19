'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ArrowLeft, Printer, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin" /></div>;
  if (!data) return <div className="p-6">Receipt not found</div>;

  const { receipt, guest, reservation, property, summary } = data;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Screen-only actions */}
      <div className="print:hidden flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="font-semibold">Receipt</span>
        <Button size="sm" variant="outline" className="ml-auto" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-1" /> Print / Save PDF
        </Button>
      </div>

      {/* Receipt Document */}
      <div className="bg-white text-gray-900 rounded-lg border shadow-sm p-8 print:shadow-none print:border-none" id="receipt">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            {property?.logoUrl && (
              <img src={property.logoUrl} alt={property.name} className="h-12 mb-2 object-contain" />
            )}
            <h1 className="text-lg font-bold text-gray-900">{property?.name}</h1>
            {property?.address && <p className="text-xs text-gray-500 mt-0.5">{property.address}</p>}
            {property?.phone && <p className="text-xs text-gray-500">{property.phone}</p>}
            {property?.email && <p className="text-xs text-gray-500">{property.email}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">RECEIPT</p>
            <p className="text-sm font-mono font-semibold text-primary mt-1">{receipt?.receiptNumber}</p>
            <p className="text-xs text-gray-500 mt-1">
              {receipt?.date ? format(new Date(receipt.date), 'dd MMMM yyyy, HH:mm') : '—'}
            </p>
          </div>
        </div>

        {/* Guest & Reservation Info */}
        <div className="grid grid-cols-2 gap-6 mb-8 pb-6 border-b">
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Guest</p>
            <p className="font-semibold">{guest?.firstName} {guest?.lastName}</p>
            {guest?.email && <p className="text-xs text-gray-500">{guest.email}</p>}
            {guest?.phone && <p className="text-xs text-gray-500">{guest.phone}</p>}
          </div>
          <div>
            <p className="text-xs font-semibold uppercase text-gray-400 mb-1">Reservation</p>
            <p className="font-semibold">{reservation?.reservationNo}</p>
            <p className="text-xs text-gray-500">
              Room {reservation?.rooms?.join(', ') ?? '—'}
            </p>
            <p className="text-xs text-gray-500">
              {reservation?.checkIn ? format(new Date(reservation.checkIn), 'dd MMM') : ''} – {reservation?.checkOut ? format(new Date(reservation.checkOut), 'dd MMM yyyy') : ''}
            </p>
          </div>
        </div>

        {/* Payment Details */}
        <div className="mb-8">
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b">
                <td className="py-2 text-gray-500">Payment Method</td>
                <td className="py-2 text-right font-medium">{METHOD_LABELS[receipt?.method] ?? receipt?.method}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-500">Amount Paid</td>
                <td className="py-2 text-right font-bold text-lg">${Number(receipt?.amount ?? 0).toFixed(2)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-500">Total Charges</td>
                <td className="py-2 text-right">${Number(summary?.totalCharges ?? 0).toFixed(2)}</td>
              </tr>
              <tr className="border-b">
                <td className="py-2 text-gray-500">Total Paid (all payments)</td>
                <td className="py-2 text-right">${Number(summary?.totalPaid ?? 0).toFixed(2)}</td>
              </tr>
              <tr className={summary?.outstandingBalance > 0 ? 'text-red-600' : 'text-green-700'}>
                <td className="py-2 font-semibold">Outstanding Balance</td>
                <td className="py-2 text-right font-bold">${Number(summary?.outstandingBalance ?? 0).toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Notes */}
        {receipt?.notes && (
          <div className="mb-6 text-sm text-gray-500 italic">
            Notes: {receipt.notes}
          </div>
        )}

        {/* Footer */}
        <div className="border-t pt-6 text-center text-xs text-gray-400 space-y-1">
          <p>Thank you for staying at {property?.name}!</p>
          <p>This is an official receipt. Please retain for your records.</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}</style>
    </div>
  );
}
