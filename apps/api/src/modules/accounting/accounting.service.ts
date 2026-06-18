import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  // Chart of Accounts
  async getChartOfAccounts(propertyId: string) {
    return this.prisma.account.findMany({
      where: { propertyId, isActive: true },
      include: { children: true },
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(dto: any) {
    return this.prisma.account.create({ data: dto });
  }

  // Journal Entries
  async createJournalEntry(dto: any, createdById: string) {
    const totalDebit = dto.lines
      .filter((l: any) => l.type === 'DEBIT')
      .reduce((s: number, l: any) => s + Number(l.amount), 0);
    const totalCredit = dto.lines
      .filter((l: any) => l.type === 'CREDIT')
      .reduce((s: number, l: any) => s + Number(l.amount), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException('Journal entry must balance: debits must equal credits');
    }

    const entryNumber = await this.generateEntryNumber(dto.tenantId);

    return this.prisma.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          tenantId: dto.tenantId,
          entryNumber,
          date: new Date(dto.date),
          description: dto.description,
          reference: dto.reference,
          referenceType: dto.referenceType,
          createdById,
          totalDebit,
          totalCredit,
          status: 'DRAFT',
          lines: {
            create: dto.lines.map((l: any) => ({
              accountId: l.accountId,
              type: l.type,
              amount: l.amount,
              description: l.description,
            })),
          },
        },
        include: { lines: { include: { account: true } } },
      });

      return entry;
    });
  }

  async postJournalEntry(id: string) {
    const entry = await this.prisma.journalEntry.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!entry) throw new NotFoundException();
    if (entry.status !== 'DRAFT') throw new BadRequestException('Entry is not in DRAFT status');

    return this.prisma.$transaction(async (tx) => {
      for (const line of entry.lines) {
        const increment = line.type === 'DEBIT' ? Number(line.amount) : -Number(line.amount);
        await tx.account.update({
          where: { id: line.accountId },
          data: { currentBalance: { increment } },
        });
      }

      return tx.journalEntry.update({
        where: { id },
        data: { status: 'POSTED', postedAt: new Date() },
      });
    });
  }

  async getJournalEntries(tenantId: string, query: any = {}) {
    const { page = 1, limit = 20, status, startDate, endDate } = query;
    const where: any = { tenantId };
    if (status) where.status = status;
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };

    const [data, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        orderBy: { date: 'desc' },
        include: { lines: { include: { account: true } } },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
  }

  // Financial Reports
  async getProfitAndLoss(propertyId: string, startDate: Date, endDate: Date) {
    const accounts = await this.prisma.account.findMany({
      where: { propertyId, type: { in: ['REVENUE', 'EXPENSE'] } },
      include: {
        journalLines: {
          where: {
            journalEntry: { date: { gte: startDate, lte: endDate }, status: 'POSTED' },
          },
        },
      },
    });

    const revenue = accounts.filter((a) => a.type === 'REVENUE');
    const expenses = accounts.filter((a) => a.type === 'EXPENSE');

    const totalRevenue = revenue.reduce((sum, a) => {
      const bal = a.journalLines.reduce((s, l) => s + (l.type === 'CREDIT' ? Number(l.amount) : -Number(l.amount)), 0);
      return sum + bal;
    }, 0);

    const totalExpenses = expenses.reduce((sum, a) => {
      const bal = a.journalLines.reduce((s, l) => s + (l.type === 'DEBIT' ? Number(l.amount) : -Number(l.amount)), 0);
      return sum + bal;
    }, 0);

    return {
      period: { startDate, endDate },
      revenue: revenue.map((a) => ({ name: a.name, code: a.code, amount: a.currentBalance })),
      expenses: expenses.map((a) => ({ name: a.name, code: a.code, amount: a.currentBalance })),
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
    };
  }

  async getBalanceSheet(propertyId: string, asOf: Date) {
    const accounts = await this.prisma.account.findMany({
      where: { propertyId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const assets = accounts.filter((a) => a.type === 'ASSET');
    const liabilities = accounts.filter((a) => a.type === 'LIABILITY');
    const equity = accounts.filter((a) => a.type === 'EQUITY');

    return {
      asOf,
      assets: { items: assets, total: assets.reduce((s, a) => s + Number(a.currentBalance), 0) },
      liabilities: { items: liabilities, total: liabilities.reduce((s, a) => s + Number(a.currentBalance), 0) },
      equity: { items: equity, total: equity.reduce((s, a) => s + Number(a.currentBalance), 0) },
    };
  }

  async getTrialBalance(propertyId: string) {
    const accounts = await this.prisma.account.findMany({
      where: { propertyId, isActive: true },
      orderBy: { code: 'asc' },
    });

    return accounts.map((a) => ({
      code: a.code,
      name: a.name,
      type: a.type,
      debit: Number(a.currentBalance) > 0 ? Number(a.currentBalance) : 0,
      credit: Number(a.currentBalance) < 0 ? Math.abs(Number(a.currentBalance)) : 0,
    }));
  }

  async getAgedReceivables(tenantId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] } },
      include: { guest: { select: { firstName: true, lastName: true } } },
    });

    const today = new Date();
    const buckets = { current: 0, days30: 0, days60: 0, days90: 0, over90: 0 };
    const details: any[] = [];

    invoices.forEach((inv) => {
      const daysDiff = Math.floor((today.getTime() - inv.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      const outstanding = Number(inv.totalAmount) - Number(inv.paidAmount);

      if (daysDiff <= 0) buckets.current += outstanding;
      else if (daysDiff <= 30) buckets.days30 += outstanding;
      else if (daysDiff <= 60) buckets.days60 += outstanding;
      else if (daysDiff <= 90) buckets.days90 += outstanding;
      else buckets.over90 += outstanding;

      details.push({ invoiceNumber: inv.invoiceNumber, dueDate: inv.dueDate, outstanding, daysDiff });
    });

    return { buckets, details };
  }

  // Bank Reconciliation
  async getBankAccounts(propertyId: string) {
    return this.prisma.bankAccount.findMany({ where: { propertyId, isActive: true } });
  }

  async getBankTransactions(bankAccountId: string, query: any = {}) {
    const { page = 1, limit = 50, startDate, endDate, reconciled } = query;
    const where: any = { bankAccountId };
    if (startDate) where.date = { gte: new Date(startDate) };
    if (endDate) where.date = { ...where.date, lte: new Date(endDate) };
    if (reconciled !== undefined) where.isReconciled = reconciled === 'true';

    return this.prisma.bankTransaction.findMany({
      where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
      orderBy: { date: 'desc' },
    });
  }

  // Invoices
  async getInvoices(propertyId: string, query: any = {}) {
    const { page = 1, limit = 20, status, search } = query;
    const where: any = { tenantId: propertyId };
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: 'insensitive' } },
        { guest: { firstName: { contains: search, mode: 'insensitive' } } },
        { guest: { lastName: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip: (Number(page) - 1) * Number(limit), take: Number(limit),
        orderBy: { issueDate: 'desc' },
        include: { guest: { select: { firstName: true, lastName: true, email: true } } },
      }),
      this.prisma.invoice.count({ where }),
    ]);
    return { data, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
  }

  async createInvoice(dto: any) {
    const invoiceNumber = await this.generateInvoiceNumber(dto.propertyId ?? dto.tenantId);
    const subtotal = dto.lineItems?.reduce((s: number, l: any) => s + Number(l.quantity) * Number(l.unitPrice), 0) ?? 0;
    const taxAmount = dto.lineItems?.reduce((s: number, l: any) => s + Number(l.quantity) * Number(l.unitPrice) * (Number(l.taxRate ?? 0) / 100), 0) ?? 0;
    const totalAmount = subtotal + taxAmount;

    return this.prisma.invoice.create({
      data: {
        tenantId: dto.propertyId ?? dto.tenantId,
        invoiceNumber,
        guestId: dto.guestId,
        status: 'DRAFT',
        issueDate: dto.issueDate ? new Date(dto.issueDate) : new Date(),
        dueDate: dto.dueDate ? new Date(dto.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: dto.notes,
        terms: dto.terms,
        subtotal,
        taxAmount,
        totalAmount,
        paidAmount: 0,
        lineItems: {
          create: (dto.lineItems ?? []).map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            taxRate: Number(l.taxRate ?? 0),
            amount: Number(l.quantity) * Number(l.unitPrice),
          })),
        },
      },
      include: { guest: { select: { firstName: true, lastName: true } }, lineItems: true },
    });
  }

  async sendInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException();
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be sent');
    return this.prisma.invoice.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
  }

  async markInvoicePaid(id: string, dto: { amount: number }) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new NotFoundException();
    const newPaid = Number(invoice.paidAmount) + Number(dto.amount);
    const status = newPaid >= Number(invoice.totalAmount) ? 'PAID' : 'PARTIALLY_PAID';
    return this.prisma.invoice.update({
      where: { id },
      data: { paidAmount: newPaid, status, ...(status === 'PAID' ? { paidAt: new Date() } : {}) },
    });
  }

  private async generateEntryNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.journalEntry.count({ where: { tenantId } });
    return `JE-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, '0')}`;
  }

  private async generateInvoiceNumber(tenantId: string): Promise<string> {
    const count = await this.prisma.invoice.count({ where: { tenantId } });
    return `INV-${new Date().getFullYear()}-${(count + 1).toString().padStart(4, '0')}`;
  }
}
