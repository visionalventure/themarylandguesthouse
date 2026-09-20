import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { LoyaltyService } from './loyalty.service';
import {
  MembersQueryDto, EarnPointsDto, RedeemPointsDto, CreateLoyaltyRuleDto, UpdateLoyaltyRuleDto,
} from './dto/loyalty.dto';

@ApiTags('loyalty')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'loyalty', version: '1' })
export class LoyaltyController {
  constructor(private readonly service: LoyaltyService) {}

  @Get('members')
  @ApiOperation({ summary: 'List loyalty members' })
  getMembers(@Query() query: MembersQueryDto, @Request() req: any) {
    return this.service.getMembers(req.user.tenantId, query);
  }

  @Get('members/:guestId')
  @ApiOperation({ summary: 'Get member detail with transaction history' })
  getMember(@Param('guestId') guestId: string, @Request() req: any) {
    return this.service.getMember(guestId, req.user.tenantId);
  }

  @Post('earn')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Manually earn points for a guest' })
  earnPoints(@Body() dto: EarnPointsDto, @Request() req: any) {
    return this.service.earnPoints(dto, req.user.tenantId);
  }

  @Post('redeem')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FRONT_DESK')
  @ApiOperation({ summary: 'Redeem points for a reward' })
  redeemPoints(@Body() dto: RedeemPointsDto, @Request() req: any) {
    return this.service.redeemPoints(dto, req.user.tenantId);
  }

  @Get('rules')
  @ApiOperation({ summary: 'List loyalty earning rules' })
  getRules(@Request() req: any) {
    return this.service.getRules(req.user.tenantId);
  }

  @Post('rules')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create loyalty rule' })
  createRule(@Body() dto: CreateLoyaltyRuleDto, @Request() req: any) {
    return this.service.createRule(dto, req.user.tenantId);
  }

  @Put('rules/:id')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update loyalty rule' })
  updateRule(@Param('id') id: string, @Body() dto: UpdateLoyaltyRuleDto, @Request() req: any) {
    return this.service.updateRule(id, dto, req.user.tenantId);
  }

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Program overview stats' })
  getStats(@Request() req: any) {
    return this.service.getStats(req.user.tenantId);
  }
}
