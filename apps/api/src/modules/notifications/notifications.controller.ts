import { Controller, Get, Patch, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller({ path: 'notifications', version: '1' })
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getNotifications(
    @Request() req: any,
    @Query('unread') unread?: string,
  ) {
    return this.notificationsService.getNotifications(
      req.user.tenantId,
      req.user.sub,
      unread === 'true',
    );
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.notificationsService.markRead(req.user.tenantId, id);
  }

  @Post('mark-all-read')
  markAllRead(@Request() req: any) {
    return this.notificationsService.markAllRead(req.user.tenantId, req.user.sub);
  }
}
