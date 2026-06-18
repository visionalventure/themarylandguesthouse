import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async getNotifications(tenantId: string, userId?: string, onlyUnread = false) {
    const where: any = { tenantId, channel: 'IN_APP' };
    if (userId) where.userId = userId;
    if (onlyUnread) where.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      this.prisma.notification.count({ where: { ...where, isRead: false } }),
    ]);

    return { notifications, unreadCount };
  }

  async markRead(tenantId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, tenantId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllRead(tenantId: string, userId?: string) {
    const where: any = { tenantId, isRead: false };
    if (userId) where.userId = userId;
    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true, readAt: new Date() },
    });
  }

  async createNotification(data: {
    tenantId: string;
    userId?: string;
    title: string;
    body: string;
    type?: string;
    referenceId?: string;
    referenceType?: string;
  }) {
    return this.prisma.notification.create({
      data: {
        tenantId: data.tenantId,
        userId: data.userId,
        title: data.title,
        body: data.body,
        type: data.type ?? 'INFO',
        channel: 'IN_APP',
        referenceId: data.referenceId,
        referenceType: data.referenceType,
      },
    });
  }
}
