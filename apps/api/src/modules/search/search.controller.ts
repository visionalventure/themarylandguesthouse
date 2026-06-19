import { Controller, Get, Query, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PrismaService } from '../../common/prisma/prisma.service';

const FULL_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Global search across guests, reservations, and rooms' })
  async globalSearch(
    @Query('q') q: string,
    @Query('types') types: string = 'guests,reservations,rooms',
    @Query('propertyId') propertyId: string,
    @Request() req: any,
  ) {
    if (!q || q.length < 2) return [];

    const { tenantId } = req.user;
    const results: any[] = [];
    const typeList = types.split(',').map(t => t.trim());

    // Require propertyId when searching reservations or rooms
    const needsProperty = typeList.includes('reservations') || typeList.includes('rooms');
    if (needsProperty && !propertyId) {
      throw new BadRequestException('propertyId is required when searching reservations or rooms');
    }

    const canSee = FULL_ACCESS_ROLES.includes(req.user.role);

    if (typeList.includes('guests')) {
      const guests = await this.prisma.guest.findMany({
        where: {
          tenantId,
          OR: [
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
            { email:     { contains: q, mode: 'insensitive' } },
            { alias:     { contains: q, mode: 'insensitive' } },
          ],
        },
        take: 5,
        select: { id: true, firstName: true, lastName: true, email: true, privacyType: true, alias: true },
      });
      guests.forEach(g => {
        const isPrivate = g.privacyType === 'PRIVATE' || g.privacyType === 'CONFIDENTIAL';
        results.push({
          type: 'guest',
          id: g.id,
          label: (isPrivate && !canSee) ? (g.alias ?? 'Private Guest') : `${g.firstName} ${g.lastName}`,
          sub: (isPrivate && !canSee) ? undefined : g.email,
          href: `/guests/${g.id}`,
        });
      });
    }

    if (typeList.includes('reservations') && propertyId) {
      const reservations = await this.prisma.reservation.findMany({
        where: {
          propertyId,
          property: { tenantId },
          OR: [
            { reservationNo: { contains: q, mode: 'insensitive' } },
            { guest: { firstName: { contains: q, mode: 'insensitive' } } },
            { guest: { lastName:  { contains: q, mode: 'insensitive' } } },
          ],
        },
        take: 5,
        include: { guest: { select: { firstName: true, lastName: true, privacyType: true, alias: true } } },
      });
      reservations.forEach(r => {
        const g = r.guest as any;
        const isPrivate = g?.privacyType === 'PRIVATE' || g?.privacyType === 'CONFIDENTIAL';
        const guestLabel = g
          ? (isPrivate && !canSee) ? (g.alias ?? 'Private Guest') : `${g.firstName} ${g.lastName}`
          : undefined;
        results.push({
          type: 'reservation',
          id: r.id,
          label: r.reservationNo,
          sub: guestLabel,
          href: `/reservations/${r.id}`,
        });
      });
    }

    if (typeList.includes('rooms') && propertyId) {
      const rooms = await this.prisma.room.findMany({
        where: {
          propertyId,
          property: { tenantId },
          roomNumber: { contains: q, mode: 'insensitive' },
        },
        take: 5,
        select: { id: true, roomNumber: true, status: true },
      });
      rooms.forEach(r => {
        results.push({
          type: 'room',
          id: r.id,
          label: `Room ${r.roomNumber}`,
          sub: r.status,
          href: `/rooms/${r.id}`,
        });
      });
    }

    return results;
  }
}
