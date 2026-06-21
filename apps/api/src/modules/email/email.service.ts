import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly resend: Resend;
  private readonly from: string;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get('RESEND_API_KEY');
    // Resend throws if key is empty string — pass a placeholder so the instance builds;
    // the send() method skips delivery when no real key is configured.
    this.resend = new Resend(apiKey || 'placeholder_no_email');
    this.from = this.config.get('EMAIL_FROM') ?? 'noreply@marylandguesthouse.com';
  }

  private async send(to: string, subject: string, html: string) {
    if (!this.config.get('RESEND_API_KEY')) {
      this.logger.warn(`[Email skipped — no RESEND_API_KEY] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      await this.resend.emails.send({ from: this.from, to, subject, html });
    } catch (err) {
      this.logger.error(`Email send failed to ${to}: ${err?.message}`);
    }
  }

  async sendBookingConfirmation(opts: {
    to: string;
    guestName: string;
    reservationNo: string;
    checkIn: string;
    checkOut: string;
    roomNumbers: string[];
    propertyName: string;
  }) {
    const rooms = opts.roomNumbers.join(', ');
    await this.send(
      opts.to,
      `Booking Confirmation — ${opts.reservationNo}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <div style="background:#D4AF37;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">${opts.propertyName}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
          <h2 style="color:#1f2937">Booking Confirmed!</h2>
          <p>Dear ${opts.guestName},</p>
          <p>Your reservation has been confirmed. Here are your details:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Reservation No.</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.reservationNo}</td></tr>
            <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Check-In</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.checkIn}</td></tr>
            <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Check-Out</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.checkOut}</td></tr>
            <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Room(s)</td><td style="padding:12px;border:1px solid #e5e7eb">${rooms}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px">If you have any questions, please contact us directly. We look forward to welcoming you!</p>
          <p>Warm regards,<br><strong>${opts.propertyName}</strong></p>
        </div>
      </body></html>`,
    );
  }

  async sendInvoiceEmail(opts: {
    to: string;
    guestName: string;
    invoiceNumber: string;
    dueDate: string;
    totalAmount: string;
    propertyName: string;
  }) {
    await this.send(
      opts.to,
      `Invoice ${opts.invoiceNumber} from ${opts.propertyName}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <div style="background:#D4AF37;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">${opts.propertyName}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
          <h2 style="color:#1f2937">Invoice ${opts.invoiceNumber}</h2>
          <p>Dear ${opts.guestName},</p>
          <p>Please find your invoice details below:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Invoice No.</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.invoiceNumber}</td></tr>
            <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Amount Due</td><td style="padding:12px;border:1px solid #e5e7eb;font-size:18px;color:#D4AF37"><strong>${opts.totalAmount}</strong></td></tr>
            <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Due Date</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.dueDate}</td></tr>
          </table>
          <p style="color:#6b7280;font-size:14px">Please contact us if you have any questions about this invoice.</p>
          <p>Thank you,<br><strong>${opts.propertyName}</strong></p>
        </div>
      </body></html>`,
    );
  }

  async sendPaymentReceipt(opts: {
    to: string;
    guestName: string;
    amount: string;
    method: string;
    date: string;
    balanceRemaining: string;
    propertyName: string;
  }) {
    await this.send(
      opts.to,
      `Payment Receipt — ${opts.propertyName}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <div style="background:#16a34a;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">Payment Received</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
          <p>Dear ${opts.guestName},</p>
          <p>We have received your payment. Here are the details:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0">
            <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Amount Paid</td><td style="padding:12px;border:1px solid #e5e7eb;color:#16a34a;font-size:18px"><strong>${opts.amount}</strong></td></tr>
            <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Payment Method</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.method}</td></tr>
            <tr style="background:#f9fafb"><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Date</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.date}</td></tr>
            <tr><td style="padding:12px;font-weight:bold;border:1px solid #e5e7eb">Balance Remaining</td><td style="padding:12px;border:1px solid #e5e7eb">${opts.balanceRemaining}</td></tr>
          </table>
          <p>Thank you,<br><strong>${opts.propertyName}</strong></p>
        </div>
      </body></html>`,
    );
  }

  async sendPasswordReset(opts: { to: string; name: string; resetUrl: string; propertyName: string }) {
    await this.send(
      opts.to,
      `Reset Your Password — ${opts.propertyName}`,
      `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
        <div style="background:#1f2937;padding:20px;text-align:center;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:24px">${opts.propertyName}</h1>
        </div>
        <div style="background:#fff;border:1px solid #e5e7eb;border-top:none;padding:30px;border-radius:0 0 8px 8px">
          <h2 style="color:#1f2937">Password Reset Request</h2>
          <p>Hi ${opts.name},</p>
          <p>We received a request to reset your password. Click the button below to choose a new password:</p>
          <div style="text-align:center;margin:30px 0">
            <a href="${opts.resetUrl}" style="background:#D4AF37;color:#fff;padding:14px 28px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block">Reset Password</a>
          </div>
          <p style="color:#6b7280;font-size:14px">This link expires in 1 hour. If you didn't request this, you can safely ignore this email.</p>
        </div>
      </body></html>`,
    );
  }
}
