import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { format } from 'date-fns';

@Injectable()
export class AccountingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  // Chart of Accounts
  async getChartOfAccounts(propertyId: string) {
    return this.prisma.account.findMany({
      where: { propertyId, isActive: true },
      include: { children: true },
      orderBy: { code: 'asc' },
    });
  }

  async createAccount(dto: any) {
    const VALID_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'];
    if (!dto.code?.trim()) throw new BadRequestException('Account code is required');
    if (!dto.name?.trim()) throw new BadRequestException('Account name is required');
    if (!VALID_TYPES.includes(dto.type)) throw new BadRequestException(`Account type must be one of: ${VALID_TYPES.join(', ')}`);
    const existing = await this.prisma.account.findFirst({ where: { propertyId: dto.propertyId, code: dto.code } });
    if (existing) throw new BadRequestException(`Account code ${dto.code} already exists for this property`);
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

    const revenueAmounts = new Map(
      revenue.map((a) => [a.id, a.journalLines.reduce((s, l) => s + (l.type === 'CREDIT' ? Number(l.amount) : -Number(l.amount)), 0)])
    );
    const expenseAmounts = new Map(
      expenses.map((a) => [a.id, a.journalLines.reduce((s, l) => s + (l.type === 'DEBIT' ? Number(l.amount) : -Number(l.amount)), 0)])
    );

    return {
      period: { startDate, endDate },
      revenue: revenue.map((a) => ({ name: a.name, code: a.code, amount: revenueAmounts.get(a.id) ?? 0 })),
      expenses: expenses.map((a) => ({ name: a.name, code: a.code, amount: expenseAmounts.get(a.id) ?? 0 })),
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
  async getInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true, phone: true } },
        lineItems: { orderBy: { id: 'asc' } },
      },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

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
            total: Number(l.quantity) * Number(l.unitPrice),
          })),
        },
      },
      include: { guest: { select: { firstName: true, lastName: true } }, lineItems: true },
    });
  }

  async sendInvoice(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        guest: { select: { firstName: true, lastName: true, email: true } },
      },
    });
    if (!invoice) throw new NotFoundException();
    if (invoice.status !== 'DRAFT') throw new BadRequestException('Only DRAFT invoices can be sent');
    const updated = await this.prisma.invoice.update({ where: { id }, data: { status: 'SENT', sentAt: new Date() } });
    this.notificationsService
      .createNotification({
        tenantId: invoice.tenantId,
        title: 'Invoice Sent',
        body: `Invoice ${invoice.invoiceNumber} sent to ${invoice.guest ? `${invoice.guest.firstName} ${invoice.guest.lastName}` : 'guest'} — $${Number(invoice.totalAmount).toLocaleString()}`,
        type: 'SUCCESS',
        referenceId: invoice.id,
        referenceType: 'INVOICE',
      })
      .catch(() => {/* fire-and-forget */});
    if (invoice.guest?.email) {
      this.emailService
        .sendInvoiceEmail({
          to: invoice.guest.email,
          guestName: `${invoice.guest.firstName} ${invoice.guest.lastName}`,
          invoiceNumber: invoice.invoiceNumber,
          dueDate: format(new Date(invoice.dueDate), 'dd MMM yyyy'),
          totalAmount: `$${Number(invoice.totalAmount).toLocaleString()}`,
          propertyName: 'Maryland Guesthouse',
        })
        .catch(() => {/* fire-and-forget */});
    }
    return updated;
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

  // ─── Bank Reconciliation ──────────────────────────────────────────────────
  async startReconciliation(bankAccountId: string, closingBalance: number, statementDate: string) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: bankAccountId },
      select: { currentBalance: true },
    });
    const openingBalance = bankAccount ? Number(bankAccount.currentBalance) : 0;
    const recon = await this.prisma.bankReconciliation.create({
      data: {
        bankAccountId,
        statementDate: new Date(statementDate),
        openingBalance,
        closingBalance,
        reconciledBalance: 0,
        difference: closingBalance,
        status: 'IN_PROGRESS',
      },
    });
    const transactions = await this.prisma.bankTransaction.findMany({
      where: { bankAccountId, isReconciled: false },
      orderBy: { date: 'desc' },
    });
    return { reconciliation: recon, transactions };
  }

  async getReconciliation(id: string) {
    const recon = await this.prisma.bankReconciliation.findUnique({ where: { id } });
    if (!recon) throw new NotFoundException('Reconciliation not found');
    const transactions = await this.prisma.bankTransaction.findMany({
      where: { bankAccountId: recon.bankAccountId, isReconciled: false },
      orderBy: { date: 'desc' },
    });
    return { reconciliation: recon, transactions };
  }

  async reconcileTransaction(reconciliationId: string, transactionId: string) {
    const recon = await this.prisma.bankReconciliation.findUnique({
      where: { id: reconciliationId },
      select: { bankAccountId: true },
    });
    if (!recon) throw new NotFoundException('Reconciliation not found');
    const txn = await this.prisma.bankTransaction.findUnique({
      where: { id: transactionId },
      select: { bankAccountId: true },
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    if (txn.bankAccountId !== recon.bankAccountId) {
      throw new BadRequestException('Transaction does not belong to this reconciliation account');
    }
    return this.prisma.bankTransaction.update({
      where: { id: transactionId },
      data: { isReconciled: true, reconciledAt: new Date() },
    });
  }

  async finalizeReconciliation(id: string) {
    const recon = await this.prisma.bankReconciliation.findUnique({ where: { id } });
    if (!recon) throw new NotFoundException('Reconciliation not found');
    const reconciledTxns = await this.prisma.bankTransaction.findMany({
      where: { bankAccountId: recon.bankAccountId, isReconciled: true, reconciledAt: { gte: recon.createdAt } },
    });
    const reconciledBalance = reconciledTxns.reduce((sum, t) => {
      return sum + (t.type === 'CREDIT' ? Number(t.amount) : -Number(t.amount));
    }, 0);
    const difference = Number(recon.closingBalance) - reconciledBalance;
    return this.prisma.bankReconciliation.update({
      where: { id },
      data: { reconciledBalance, difference, status: 'COMPLETED', completedAt: new Date() },
    });
  }

  // ─── Budget Management ────────────────────────────────────────────────────
  async getBudgets(propertyId: string) {
    return this.prisma.budget.findMany({
      where: { propertyId },
      include: { lines: true },
      orderBy: { startDate: 'desc' },
    });
  }

  async createBudget(dto: any) {
    const { propertyId, name, period, startDate, endDate, notes, lines } = dto;
    return this.prisma.budget.create({
      data: {
        propertyId,
        name,
        period,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes,
        status: 'DRAFT',
        lines: {
          create: (lines ?? []).map((l: any) => ({
            accountId: l.accountId ?? null,
            accountName: l.accountName,
            month: l.month ?? null,
            amount: Number(l.amount),
          })),
        },
      },
      include: { lines: true },
    });
  }

  async getBudget(id: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id },
      include: { lines: true },
    });
    if (!budget) throw new NotFoundException('Budget not found');
    // Calculate actual spend per accountId from journal entry lines within the budget period
    const accountIds = budget.lines.map((l) => l.accountId).filter(Boolean) as string[];
    if (accountIds.length > 0) {
      const actuals = await this.prisma.journalLine.groupBy({
        by: ['accountId'],
        where: {
          accountId: { in: accountIds },
          journalEntry: {
            date: { gte: budget.startDate, lte: budget.endDate },
            status: 'POSTED',
          },
        },
        _sum: { amount: true },
      });
      const actualMap = Object.fromEntries(actuals.map((a) => [a.accountId, Number(a._sum.amount ?? 0)]));
      return {
        ...budget,
        lines: budget.lines.map((l) => ({
          ...l,
          actual: l.accountId ? (actualMap[l.accountId] ?? 0) : 0,
          variance: Number(l.amount) - (l.accountId ? (actualMap[l.accountId] ?? 0) : 0),
        })),
      };
    }
    return budget;
  }

  async updateBudgetLine(budgetId: string, lineId: string, dto: { amount: number }) {
    return this.prisma.budgetLine.update({
      where: { id: lineId },
      data: { amount: Number(dto.amount) },
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
