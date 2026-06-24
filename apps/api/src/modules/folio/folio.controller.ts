import { Controller, Get, Post, Patch, Delete, Param, Body, Request, UseGuards, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FolioService } from './folio.service';

@ApiTags('folio')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'folio', version: '1' })
export class FolioController {
  constructor(private readonly service: FolioService) {}

  @Get(':reservationId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get guest folio — all charges, payments, running balance' })
  getFolio(@Param('reservationId') reservationId: string) {
    return this.service.getFolio(reservationId);
  }

  @Post(':reservationId/charges')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Post a charge to the folio' })
  postCharge(@Param('reservationId') reservationId: string, @Body() dto: any) {
    return this.service.postCharge(reservationId, dto);
  }

  @Delete(':reservationId/charges/:chargeId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Void / delete a charge' })
  voidCharge(
    @Param('reservationId') reservationId: string,
    @Param('chargeId') chargeId: string,
  ) {
    return this.service.voidCharge(reservationId, chargeId);
  }

  @Post(':reservationId/payments')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Collect a payment — auto-generates receipt and journal entry' })
  collectPayment(
    @Param('reservationId') reservationId: string,
    @Body() dto: any,
    @Request() req: any,
  ) {
    return this.service.collectPayment(reservationId, { ...dto, tenantId: req.user.tenantId }, req.user.sub);
  }

  @Get(':reservationId/receipt/:paymentId')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK', 'ACCOUNTANT')
  @ApiOperation({ summary: 'Get receipt data for a payment' })
  getReceipt(
    @Param('reservationId') reservationId: string,
    @Param('paymentId') paymentId: string,
  ) {
    return this.service.getReceipt(reservationId, paymentId);
  }

  @Patch(':reservationId/discount')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Apply a discount to a reservation folio' })
  applyDiscount(
    @Param('reservationId') reservationId: string,
    @Body() dto: { discountType: 'PERCENTAGE' | 'FIXED'; value: number; reason?: string },
  ) {
    return this.service.applyDiscount(reservationId, dto);
  }

  @Delete(':reservationId/discount')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove the discount from a reservation folio' })
  removeDiscount(@Param('reservationId') reservationId: string) {
    return this.service.removeDiscount(reservationId);
  }
}
