import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Request, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { AccountingService } from './accounting.service';

@ApiTags('accounting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'accounting', version: '1' })
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('chart-of-accounts')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get chart of accounts hierarchy' })
  getChartOfAccounts(@Query('propertyId') propertyId: string) {
    return this.service.getChartOfAccounts(propertyId);
  }

  @Post('accounts')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create account in chart of accounts' })
  createAccount(@Body() dto: any) {
    return this.service.createAccount(dto);
  }

  @Get('journal-entries')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List journal entries' })
  getJournalEntries(@Request() req: any, @Query() query: any) {
    return this.service.getJournalEntries(req.user.tenantId, query);
  }

  @Post('journal-entries')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create journal entry (double-entry)' })
  createJournalEntry(@Body() dto: any, @Request() req: any) {
    return this.service.createJournalEntry({ ...dto, tenantId: req.user.tenantId }, req.user.sub);
  }

  @Patch('journal-entries/:id/post')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Post journal entry to ledger' })
  postEntry(@Param('id') id: string) {
    return this.service.postJournalEntry(id);
  }

  @Get('reports/profit-and-loss')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Generate Profit & Loss statement' })
  getProfitAndLoss(@Query() query: any) {
    return this.service.getProfitAndLoss(query.propertyId, new Date(query.startDate), new Date(query.endDate));
  }

  @Get('reports/balance-sheet')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Generate Balance Sheet' })
  getBalanceSheet(@Query() query: any) {
    return this.service.getBalanceSheet(query.propertyId, new Date(query.asOf || new Date()));
  }

  @Get('reports/trial-balance')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Generate Trial Balance' })
  getTrialBalance(@Query('propertyId') propertyId: string) {
    return this.service.getTrialBalance(propertyId);
  }

  @Get('reports/aged-receivables')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get aged receivables report' })
  getAgedReceivables(@Request() req: any) {
    return this.service.getAgedReceivables(req.user.tenantId);
  }

  @Get('invoices')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FRONT_DESK')
  @ApiOperation({ summary: 'List invoices' })
  getInvoices(@Query('propertyId') propertyId: string, @Query() query: any) {
    return this.service.getInvoices(propertyId, query);
  }

  @Get('invoices/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FRONT_DESK')
  @ApiOperation({ summary: 'Get invoice by ID with line items' })
  getInvoice(@Param('id') id: string) {
    return this.service.getInvoice(id);
  }

  @Post('invoices')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create invoice' })
  createInvoice(@Body() dto: any, @Request() req: any) {
    return this.service.createInvoice({ ...dto, propertyId: dto.propertyId ?? req.user.tenantId });
  }

  @Patch('invoices/:id/send')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'FRONT_DESK')
  @ApiOperation({ summary: 'Send invoice to guest' })
  sendInvoice(@Param('id') id: string) {
    return this.service.sendInvoice(id);
  }

  @Patch('invoices/:id/mark-paid')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Record payment against invoice' })
  markInvoicePaid(@Param('id') id: string, @Body() dto: any) {
    return this.service.markInvoicePaid(id, dto);
  }

  @Get('bank-accounts')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List bank accounts' })
  getBankAccounts(@Query('propertyId') propertyId: string) {
    return this.service.getBankAccounts(propertyId);
  }

  @Get('bank-accounts/:id/transactions')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get bank account transactions' })
  getBankTransactions(@Param('id') id: string, @Query() query: any) {
    return this.service.getBankTransactions(id, query);
  }

  @Post('reconciliation/start')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Start bank reconciliation session' })
  startReconciliation(@Body() dto: { bankAccountId: string; closingBalance: number; statementDate: string }) {
    return this.service.startReconciliation(dto.bankAccountId, dto.closingBalance, dto.statementDate);
  }

  @Get('reconciliation/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get reconciliation session and unreconciled transactions' })
  getReconciliation(@Param('id') id: string) {
    return this.service.getReconciliation(id);
  }

  @Patch('reconciliation/:id/transaction/:txnId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Mark transaction as reconciled' })
  reconcileTransaction(@Param('id') reconId: string, @Param('txnId') txnId: string) {
    return this.service.reconcileTransaction(reconId, txnId);
  }

  @Patch('reconciliation/:id/finalize')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Finalize reconciliation session' })
  finalizeReconciliation(@Param('id') id: string) {
    return this.service.finalizeReconciliation(id);
  }

  @Get('budgets')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'List budgets for a property' })
  getBudgets(@Query('propertyId') propertyId: string) {
    return this.service.getBudgets(propertyId);
  }

  @Post('budgets')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Create a budget with line items' })
  createBudget(@Body() dto: any, @Request() req: any) {
    return this.service.createBudget({ ...dto, propertyId: dto.propertyId ?? req.user.tenantId });
  }

  @Get('budgets/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get budget with actuals vs. budget comparison' })
  getBudget(@Param('id') id: string) {
    return this.service.getBudget(id);
  }

  @Patch('budgets/:id/lines/:lineId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Update a budget line amount' })
  updateBudgetLine(@Param('id') budgetId: string, @Param('lineId') lineId: string, @Body() dto: { amount: number }) {
    return this.service.updateBudgetLine(budgetId, lineId, dto);
  }
}
