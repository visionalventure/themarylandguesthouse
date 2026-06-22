import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class HousekeepingService {
  private readonly logger = new Logger(HousekeepingService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  async getTasks(propertyId: string, query: any = {}) {
    const { status, roomId, assignedToId, date, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { propertyId };
    if (status) where.status = status;
    if (roomId) where.roomId = roomId;
    if (assignedToId) where.assignedToId = assignedToId;
    if (date) {
      const d = new Date(date);
      const next = new Date(d);
      next.setDate(next.getDate() + 1);
      where.scheduledAt = { gte: d, lt: next };
    }

    const [data, total] = await Promise.all([
      this.prisma.housekeepingTask.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: [{ priority: 'desc' }, { scheduledAt: 'asc' }],
        include: {
          room: { select: { roomNumber: true, floor: true, category: { select: { name: true } } } },
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.housekeepingTask.count({ where }),
    ]);

    return { data, total };
  }

  async createTask(dto: any) {
    const task = await this.prisma.housekeepingTask.create({
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: {
        room: { select: { roomNumber: true, floor: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    if (dto.assignedToId) {
      this.notifications.createNotification({
        tenantId: task.propertyId,
        userId: task.assignedToId,
        title: 'New Task Assigned',
        body: `You have a new ${(task.taskType ?? '').replace(/_/g, ' ')} for Room ${task.room?.roomNumber ?? ''}`,
        type: 'INFO',
        referenceId: task.id,
        referenceType: 'HOUSEKEEPING_TASK',
      }).catch((err) => this.logger.warn(`Failed to send task-assigned notification: ${err?.message}`));
    }

    return task;
  }

  async updateTask(id: string, dto: any) {
    const task = await this.prisma.housekeepingTask.findUnique({
      where: { id },
      include: {
        room: { select: { roomNumber: true } },
        property: { select: { tenantId: true } },
      },
    });
    if (!task) throw new NotFoundException('Task not found');

    // Validate the new assignee belongs to the same tenant before persisting.
    const isReassign = dto.assignedToId && dto.assignedToId !== task.assignedToId;
    if (isReassign) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
        select: { tenantId: true },
      });
      if (!assignee || assignee.tenantId !== task.property.tenantId) {
        throw new BadRequestException('Assignee does not belong to this property');
      }
    }

    const data: any = { ...dto };
    if (dto.status === 'IN_PROGRESS' && !task.startedAt) data.startedAt = new Date();
    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
      await this.prisma.room.update({
        where: { id: task.roomId },
        data: { status: 'AVAILABLE' },
      });
    }

    const updated = await this.prisma.housekeepingTask.update({
      where: { id },
      data,
      include: {
        room: { select: { roomNumber: true, floor: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Fire notification only after the DB update succeeds.
    if (isReassign) {
      this.notifications.createNotification({
        tenantId: task.propertyId,
        userId: dto.assignedToId,
        title: 'Task Assigned to You',
        body: `You have been assigned a ${(task.taskType ?? '').replace(/_/g, ' ')} for Room ${task.room?.roomNumber ?? ''}`,
        type: 'INFO',
        referenceId: task.id,
        referenceType: 'HOUSEKEEPING_TASK',
      }).catch((err) => this.logger.warn(`Failed to send reassign notification: ${err?.message}`));
    }

    return updated;
  }

  async getDailySchedule(propertyId: string, date?: string) {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const tasks = await this.prisma.housekeepingTask.findMany({
      where: {
        propertyId,
        OR: [
          { scheduledAt: { gte: d, lt: next } },
          { scheduledAt: null, createdAt: { gte: d, lt: next } },
        ],
      },
      orderBy: [{ room: { floor: 'asc' } }, { priority: 'desc' }],
      include: {
        room: { select: { roomNumber: true, floor: true, category: { select: { name: true } } } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    const byFloor = new Map<number, any[]>();
    tasks.forEach((t) => {
      const floor = t.room?.floor ?? 0;
      if (!byFloor.has(floor)) byFloor.set(floor, []);
      byFloor.get(floor)!.push(t);
    });

    return Array.from(byFloor.entries())
      .sort(([a], [b]) => a - b)
      .map(([floor, floorTasks]) => ({ floor, tasks: floorTasks }));
  }

  async getRoomsStatus(propertyId: string) {
    const rooms = await this.prisma.room.findMany({
      where: { propertyId },
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        category: { select: { name: true } },
        housekeepingTasks: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: { assignedTo: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    return rooms.map((room) => ({
      ...room,
      pendingTask: room.housekeepingTasks[0] ?? null,
    }));
  }
}
