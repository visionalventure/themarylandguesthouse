import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { LoyaltyService } from './loyalty.service';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'loyalty', version: '1' })
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('members')
  @ApiOperation({ summary: 'List loyalty members' })
  getMembers(@Query() query: any) {
    return this.service.getMembers(query);
  }

  @Get('members/:guestId')
  @ApiOperation({ summary: 'Get member detail with transaction history' })
  getMember(@Param('guestId') guestId: string) {
    return this.service.getMember(guestId);
  }

  @Post('earn')
  @ApiOperation({ summary: 'Manually earn points for a guest' })
  earnPoints(@Body() dto: any) {
    return this.service.earnPoints(dto);
  }

  @Post('redeem')
  @ApiOperation({ summary: 'Redeem points for a reward' })
  redeemPoints(@Body() dto: any) {
    return this.service.redeemPoints(dto);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List loyalty earning rules' })
  getRules() {
    return this.service.getRules();
  }

  @Post('rules')
  @ApiOperation({ summary: 'Create loyalty rule' })
  createRule(@Body() dto: any) {
    return this.service.createRule(dto);
  }

  @Put('rules/:id')
  @ApiOperation({ summary: 'Update loyalty rule' })
  updateRule(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateRule(id, dto);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Program overview stats' })
  getStats(@Query('propertyId') propertyId: string) {
    return this.service.getStats(propertyId);
  }
}
