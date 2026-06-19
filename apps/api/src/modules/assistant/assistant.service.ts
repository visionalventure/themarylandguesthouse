import { Injectable } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';

const ERP_KNOWLEDGE = `
Maryland Guesthouse ERP is a hospitality management platform. You help staff navigate and use it.

MODULES:
- Front Desk: daily operations, check-ins, check-outs, arrivals, departures
- Reservations: booking management, reservation board (Gantt), room assignment, check-in/check-out
- Guests/CRM: guest profiles, loyalty program, stay history, privacy levels
- Rooms: room categories, status management (Available, Occupied, Vacant Dirty, Cleaning, Maintenance, Blocked)
- Guest Folio: per-reservation charges (Room, F&B, Bar, Laundry, Spa, etc.), payments, running balance, receipts
- Night Audit: end-of-day process — posts nightly room charges, marks no-shows, closes the business day
- Accounting: chart of accounts, journal entries, invoices, payments
- Inventory: stock items, categories, transactions
- Procurement: purchase orders, suppliers, approvals
- HR: employees, payroll, leave management
- Maintenance: work orders, assets, maintenance schedules
- Reports: occupancy, revenue, KPIs

KEY HOSPITALITY TERMS:
- ADR (Average Daily Rate): total room revenue divided by number of rooms sold
- RevPAR (Revenue Per Available Room): ADR × occupancy rate; measures revenue performance
- Occupancy Rate: percentage of available rooms occupied on a given night
- GOP (Gross Operating Profit): total revenue minus operating expenses
- REVPAC (Revenue Per Available Customer): total revenue divided by guests
- No-Show: guest with reservation who doesn't arrive
- Walk-In: guest without prior reservation
- Folio: running account of charges and payments for a reservation

NAVIGATION:
- Dashboard: overview KPIs
- Front Desk (/front-desk): today's arrivals, departures, room status board
- Reservations (/reservations): visual Gantt board + list
- Guests (/guests): CRM with loyalty tiers
- Night Audit (/nightaudit): run and close the nightly audit

WORKFLOWS:
Check-In: Go to Reservations → find reservation → click Check In (or use reservation detail page)
Check-Out: Go to Folio → verify balance → click Check Out
Collect Payment: Go to Folio → Collect Payment → choose method → print receipt
Post Charge: Go to Folio → Post Charge → select type, enter amount
Run Night Audit: Go to Night Audit → select date → Run Night Audit → review summary → Close Day

PRIVACY LEVELS:
- Standard: full details visible to all staff
- Private: alias shown to housekeeping and maintenance
- VIP: elevated service, full details to Front Desk+
- Confidential: alias only, real identity requires Manager+ authorization (audit logged)
`;

@Injectable()
export class AssistantService {
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async chat(dto: { message: string; context?: { page?: string } }, user: any) {
    const systemPrompt = this.buildSystemPrompt(user.role, dto.context?.page);

    const response = await this.client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: dto.message }],
    });

    const text = response.content.find(c => c.type === 'text');
    return { reply: text ? text.text : 'I could not generate a response.' };
  }

  private buildSystemPrompt(role: string, page?: string): string {
    const roleGuidance: Record<string, string> = {
      HOUSEKEEPING: 'You are assisting housekeeping staff. Focus on room status, cleaning tasks, and room readiness. Do not discuss payroll, HR records, or financial data.',
      MAINTENANCE:  'You are assisting maintenance staff. Focus on work orders, assets, room repairs. Do not discuss guest personal data, payroll, or financial records.',
      ACCOUNTANT:   'You are assisting accounting staff. Focus on invoices, payments, journal entries, and financial reports. Do not discuss HR disciplinary records.',
      FRONT_DESK:   'You are assisting front desk staff. Focus on reservations, check-in/check-out, guest profiles, folios, and payments.',
      HR_MANAGER:   'You are assisting HR staff. Focus on employee management, payroll, and leave. Do not discuss guest personal data.',
      PROCUREMENT_OFFICER: 'You are assisting procurement staff. Focus on purchase orders, suppliers, and inventory.',
    };

    const guidance = roleGuidance[role] ?? 'You are assisting hotel management staff with full system access.';

    return `You are Maryland Assistant, the AI helper built into Maryland Guesthouse ERP.
${guidance}
Current page: ${page ?? 'unknown'}.
Be concise, practical, and friendly. Use bullet points for step-by-step instructions.
If asked about something outside your role's scope, politely explain you cannot help with that topic.

${ERP_KNOWLEDGE}`;
  }
}
