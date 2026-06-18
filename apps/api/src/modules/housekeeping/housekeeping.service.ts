import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class HousekeepingService {
  constructor(private prisma: PrismaService) {}

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
    return this.prisma.housekeepingTask.create({
      data: {
        ...dto,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      },
      include: {
        room: { select: { roomNumber: true, floor: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async updateTask(id: string, dto: any) {
    const task = await this.prisma.housekeepingTask.findUnique({ where: { id } });
    if (!task) throw new NotFoundException('Task not found');

    const data: any = { ...dto };
    if (dto.status === 'IN_PROGRESS' && !task.startedAt) data.startedAt = new Date();
    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
      await this.prisma.room.update({
        where: { id: task.roomId },
        data: { status: 'AVAILABLE' },
      });
    }

    return this.prisma.housekeepingTask.update({
      where: { id },
      data,
      include: {
        room: { select: { roomNumber: true, floor: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
      },
    });
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
