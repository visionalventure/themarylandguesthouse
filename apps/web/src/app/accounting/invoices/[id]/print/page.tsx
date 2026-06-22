'use client';

import { useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { accountingApi, settingsApi } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

export default function InvoicePrintPage() {
  const { id } = useParams<{ id: string }>();
  const propertyId = useAuthStore((s) => s.propertyId);

  const { data: invoiceData, isLoading: loadingInvoice } = useQuery({
    queryKey: ['invoice-print', id],
    queryFn: () => accountingApi.getInvoice(id).then(r => r.data),
    enabled: !!id,
  });

  const { data: propertyData } = useQuery({
    queryKey: ['property-settings', propertyId],
    queryFn: () => settingsApi.getProperty(propertyId).then(r => r.data),
    enabled: !!propertyId,
  });

  const invoice = invoiceData;
  const property = Array.isArray(propertyData) ? propertyData[0] : propertyData;
  const tpl = property?.invoiceTemplate ?? {};
  const brandColor = tpl.primaryColor ?? '#D4AF37';

  useEffect(() => {
    if (!loadingInvoice && invoice) {
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [loadingInvoice, invoice]);

  if (loadingInvoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Preparing invoice…</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">Invoice not found.</p>
      </div>
    );
  }

  const guest = invoice.guest ?? {};
  const lineItems: any[] = invoice.lineItems ?? [];
  const subtotal = Number(invoice.subtotal ?? 0);
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const totalAmount = Number(invoice.totalAmount ?? 0);
  const paidAmount = Number(invoice.paidAmount ?? 0);
  const balanceDue = totalAmount - paidAmount;

  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 15mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; color: #1f2937; background: white; margin: 0; }
        * { box-sizing: border-box; }
      `}</style>

      {/* Print button (hidden on print) */}
      <div className="no-print fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={() => window.print()}
          style={{ background: brandColor, color: 'white', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
        >
          Print / Save PDF
        </button>
        <button
          onClick={() => window.close()}
          style={{ background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontSize: 14 }}
        >
          Close
        </button>
      </div>

      {/* Invoice */}
      <div style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
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
            <p style={{ color: 'white', fontSize: 11, margin: 0, opacity: 0.7 }}>INVOICE</p>
            <p style={{ color: 'white', fontWeight: 700, fontSize: 18, margin: '4px 0 0' }}>{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Body */}
        <div style={{ border: '1px solid #e5e7eb', borderTop: 'none', padding: '32px', borderRadius: '0 0 8px 8px' }}>
          {/* Bill To + Dates row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Bill To</p>
              <p style={{ fontWeight: 600, fontSize: 15, margin: 0 }}>{guest.firstName} {guest.lastName}</p>
              {guest.email && <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>{guest.email}</p>}
              {guest.phone && <p style={{ color: '#6b7280', fontSize: 13, margin: '2px 0 0' }}>{guest.phone}</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <table style={{ borderCollapse: 'collapse', marginLeft: 'auto' }}>
                <tbody>
                  <tr>
                    <td style={{ color: '#6b7280', fontSize: 12, paddingRight: 16, paddingBottom: 4 }}>Issue Date</td>
                    <td style={{ fontWeight: 600, fontSize: 13, paddingBottom: 4 }}>{(() => { const d = invoice.issueDate ? new Date(invoice.issueDate) : null; return d && !isNaN(d.getTime()) ? format(d, 'dd MMM yyyy') : '—'; })()}</td>
                  </tr>
                  <tr>
                    <td style={{ color: '#6b7280', fontSize: 12, paddingRight: 16, paddingBottom: 4 }}>Due Date</td>
                    <td style={{ fontWeight: 600, fontSize: 13, paddingBottom: 4, color: balanceDue > 0 ? '#ef4444' : '#16a34a' }}>
                      {(() => { const d = invoice.dueDate ? new Date(invoice.dueDate) : null; return d && !isNaN(d.getTime()) ? format(d, 'dd MMM yyyy') : '—'; })()}
                    </td>
                  </tr>
                  <tr>
                    <td style={{ color: '#6b7280', fontSize: 12, paddingRight: 16 }}>Status</td>
                    <td style={{ fontWeight: 700, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{invoice.status}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Line Items */}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Description', 'Qty', 'Unit Price', 'Tax %', 'Total'].map((h, i) => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '2px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lineItems.map((line, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', fontSize: 13 }}>{line.description}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>{Number(line.quantity)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>${Number(line.unitPrice).toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13 }}>{Number(line.taxRate ?? 0)}%</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontSize: 13, fontWeight: 600 }}>${Number(line.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: 240 }}>
              <tbody>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', color: '#6b7280', fontSize: 13 }}>Subtotal</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontSize: 13 }}>${subtotal.toFixed(2)}</td>
                </tr>
                <tr>
                  <td style={{ padding: '4px 12px 4px 0', color: '#6b7280', fontSize: 13 }}>Tax</td>
                  <td style={{ padding: '4px 0', textAlign: 'right', fontSize: 13 }}>${taxAmount.toFixed(2)}</td>
                </tr>
                <tr style={{ borderTop: '2px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px 4px 0', fontWeight: 700, fontSize: 15 }}>Total</td>
                  <td style={{ padding: '10px 0 4px', textAlign: 'right', fontWeight: 700, fontSize: 15, color: brandColor }}>${totalAmount.toFixed(2)}</td>
                </tr>
                {paidAmount > 0 && (
                  <tr>
                    <td style={{ padding: '4px 12px 4px 0', color: '#6b7280', fontSize: 13 }}>Amount Paid</td>
                    <td style={{ padding: '4px 0', textAlign: 'right', fontSize: 13, color: '#16a34a' }}>-${paidAmount.toFixed(2)}</td>
                  </tr>
                )}
                <tr style={{ borderTop: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '8px 12px 0 0', fontWeight: 700, fontSize: 14 }}>Balance Due</td>
                  <td style={{ padding: '8px 0 0', textAlign: 'right', fontWeight: 700, fontSize: 16, color: balanceDue > 0 ? '#ef4444' : '#16a34a' }}>
                    ${balanceDue.toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div style={{ marginTop: 24, padding: '12px 16px', background: '#f9fafb', borderRadius: 6, borderLeft: `3px solid ${brandColor}` }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Notes</p>
              <p style={{ fontSize: 13, margin: 0, color: '#374151' }}>{invoice.notes}</p>
            </div>
          )}

          {/* Bank Details */}
          {(tpl.bankName || tpl.bankAccount) && (
            <div style={{ marginTop: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Payment Details</p>
              <div style={{ display: 'flex', gap: 32 }}>
                {tpl.bankName && <div><p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Bank</p><p style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>{tpl.bankName}</p></div>}
                {tpl.bankAccount && <div><p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>Account No.</p><p style={{ fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>{tpl.bankAccount}</p></div>}
                {tpl.swiftCode && <div><p style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>SWIFT</p><p style={{ fontSize: 13, fontWeight: 600, margin: 0, fontFamily: 'monospace' }}>{tpl.swiftCode}</p></div>}
              </div>
            </div>
          )}

          {/* Terms */}
          {(tpl.defaultTerms || invoice.terms) && (
            <div style={{ marginTop: 20, padding: '10px 14px', border: '1px solid #e5e7eb', borderRadius: 6 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Terms & Conditions</p>
              <p style={{ fontSize: 12, margin: 0, color: '#6b7280' }}>{invoice.terms || tpl.defaultTerms}</p>
            </div>
          )}

          {/* Footer */}
          {tpl.footerNote && (
            <p style={{ textAlign: 'center', marginTop: 24, fontSize: 12, color: '#9ca3af' }}>{tpl.footerNote}</p>
          )}
        </div>
      </div>
    </>
  );
}
