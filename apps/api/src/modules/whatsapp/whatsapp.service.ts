import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class WhatsAppService {
  private client: ReturnType<typeof twilio> | null = null;
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return !!(
      this.config.get('TWILIO_ACCOUNT_SID') &&
      this.config.get('TWILIO_AUTH_TOKEN') &&
      this.config.get('TWILIO_WHATSAPP_FROM')
    );
  }

  private getClient() {
    if (!this.client) {
      this.client = twilio(this.config.get('TWILIO_ACCOUNT_SID'), this.config.get('TWILIO_AUTH_TOKEN'));
    }
    return this.client;
  }

  // Twilio's WhatsApp API needs "whatsapp:+<E.164 digits>" - guest phone
  // numbers here are free-text (Guest.phone / ShortStayBooking.guestPhone
  // are unvalidated), so strip everything but digits before sending.
  private normalizePhone(phone: string): string {
    return `whatsapp:+${phone.replace(/\D/g, '')}`;
  }

  private async send(to: string, body: string): Promise<{ sent: boolean; reason?: string }> {
    if (!this.isConfigured()) {
      this.logger.warn(`[WhatsApp skipped — Twilio not configured] To: ${to}`);
      return { sent: false, reason: 'not_configured' };
    }
    try {
      await this.getClient().messages.create({
        from: this.config.get('TWILIO_WHATSAPP_FROM'),
        to: this.normalizePhone(to),
        body,
      });
      return { sent: true };
    } catch (err: any) {
      this.logger.error(`WhatsApp send failed to ${to}: ${err?.message}`);
      return { sent: false, reason: err?.message };
    }
  }

  async sendMenuOfTheDay(opts: {
    to: string;
    restaurantName: string;
    date: string;
    entries: { name: string; description?: string | null; price: number }[];
  }): Promise<{ sent: boolean; reason?: string }> {
    const lines = opts.entries.map((e) => {
      const priceStr = `$${e.price.toFixed(2)}`;
      return e.description ? `• ${e.name} — ${priceStr}\n  ${e.description}` : `• ${e.name} — ${priceStr}`;
    });
    const body = `🍽️ ${opts.restaurantName} — Menu of the Day (${opts.date})\n\n${lines.join('\n')}`;
    return this.send(opts.to, body);
  }
}
