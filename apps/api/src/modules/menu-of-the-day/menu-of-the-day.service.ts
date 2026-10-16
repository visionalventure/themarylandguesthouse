import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { WhatsAppService } from '../whatsapp/whatsapp.service';
import { UpsertMenuOfTheDayDto, CreateMenuOfTheDayEntryDto, UpdateMenuOfTheDayEntryDto } from './dto/menu-of-the-day.dto';

@Injectable()
export class MenuOfTheDayService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly whatsapp: WhatsAppService,
  ) {}

  private async assertRestaurantInTenant(restaurantId: string, tenantId: string) {
    const restaurant = await this.prisma.restaurant.findFirst({
      where: { id: restaurantId, property: { tenantId } },
      select: { id: true, name: true, propertyId: true },
    });
    if (!restaurant) throw new NotFoundException('Restaurant not found');
    return restaurant;
  }

  // Normalizes any date-ish input to UTC midnight so "one record per
  // calendar day" holds regardless of what time of day it's requested -
  // same convention as NightAudit.auditDate.
  private normalizeDate(dateStr?: string): Date {
    const d = dateStr ? new Date(dateStr) : new Date();
    return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  }

  async getForDate(restaurantId: string, tenantId: string, dateStr?: string) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    const date = this.normalizeDate(dateStr);
    const menuOfTheDay = await this.prisma.menuOfTheDay.findFirst({
      where: { restaurantId, date },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });
    return menuOfTheDay ?? { id: null, restaurantId, date, notes: null, entries: [] };
  }

  async upsertForDate(restaurantId: string, tenantId: string, dto: UpsertMenuOfTheDayDto, userId: string) {
    await this.assertRestaurantInTenant(restaurantId, tenantId);
    const date = this.normalizeDate(dto.date);
    return this.prisma.menuOfTheDay.upsert({
      where: { restaurantId_date: { restaurantId, date } },
      create: { restaurantId, date, notes: dto.notes, createdById: userId },
      update: { notes: dto.notes },
      include: { entries: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  private async assertMenuOfTheDayInTenant(menuOfTheDayId: string, tenantId: string) {
    const menuOfTheDay = await this.prisma.menuOfTheDay.findFirst({
      where: { id: menuOfTheDayId, restaurant: { property: { tenantId } } },
      include: { restaurant: { select: { id: true, name: true, propertyId: true } } },
    });
    if (!menuOfTheDay) throw new NotFoundException('Menu of the day not found');
    return menuOfTheDay;
  }

  async addEntry(menuOfTheDayId: string, tenantId: string, dto: CreateMenuOfTheDayEntryDto) {
    const menuOfTheDay = await this.assertMenuOfTheDayInTenant(menuOfTheDayId, tenantId);

    let data: { name: string; description: string | null; price: number; allergens: string[]; isVegetarian: boolean; isVegan: boolean };

    if (dto.menuItemId) {
      const menuItem = await this.prisma.menuItem.findFirst({
        where: { id: dto.menuItemId, restaurantId: menuOfTheDay.restaurant.id },
      });
      if (!menuItem) throw new NotFoundException('Menu item not found');
      data = {
        name: menuItem.name,
        description: menuItem.description,
        price: Number(menuItem.price),
        allergens: menuItem.allergens,
        isVegetarian: menuItem.isVegetarian,
        isVegan: menuItem.isVegan,
      };
    } else {
      if (!dto.name || dto.price == null) {
        throw new BadRequestException('A freeform special needs a name and a price');
      }
      data = {
        name: dto.name,
        description: dto.description ?? null,
        price: dto.price,
        allergens: dto.allergens ?? [],
        isVegetarian: dto.isVegetarian ?? false,
        isVegan: dto.isVegan ?? false,
      };
    }

    return this.prisma.menuOfTheDayEntry.create({
      data: {
        menuOfTheDayId,
        menuItemId: dto.menuItemId,
        sortOrder: dto.sortOrder ?? 0,
        ...data,
      },
    });
  }

  async updateEntry(entryId: string, tenantId: string, dto: UpdateMenuOfTheDayEntryDto) {
    const existing = await this.prisma.menuOfTheDayEntry.findFirst({
      where: { id: entryId, menuOfTheDay: { restaurant: { property: { tenantId } } } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Menu of the day entry not found');
    return this.prisma.menuOfTheDayEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.price !== undefined && { price: dto.price }),
        ...(dto.allergens !== undefined && { allergens: dto.allergens }),
        ...(dto.isVegetarian !== undefined && { isVegetarian: dto.isVegetarian }),
        ...(dto.isVegan !== undefined && { isVegan: dto.isVegan }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  async removeEntry(entryId: string, tenantId: string) {
    const existing = await this.prisma.menuOfTheDayEntry.findFirst({
      where: { id: entryId, menuOfTheDay: { restaurant: { property: { tenantId } } } },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Menu of the day entry not found');
    await this.prisma.menuOfTheDayEntry.delete({ where: { id: entryId } });
    return { deleted: true };
  }

  // Broadcasts today's menu to every guest currently checked in - both
  // full reservations and short-stay bookings, since either can carry a
  // guest's phone number. Never throws on an individual send failure (a
  // bad number can't abort the whole batch); when Twilio isn't configured
  // yet, every send cleanly no-ops and the summary reflects that so the
  // UI can say so plainly rather than erroring.
  async sendToCheckedInGuests(menuOfTheDayId: string, tenantId: string) {
    const menuOfTheDay = await this.assertMenuOfTheDayInTenant(menuOfTheDayId, tenantId);
    const entries = await this.prisma.menuOfTheDayEntry.findMany({
      where: { menuOfTheDayId },
      orderBy: { sortOrder: 'asc' },
    });
    if (entries.length === 0) throw new BadRequestException("Today's menu has no items yet");

    const { propertyId } = menuOfTheDay.restaurant;

    const [reservations, shortStays] = await Promise.all([
      this.prisma.reservation.findMany({
        where: { status: 'CHECKED_IN', propertyId, property: { tenantId } },
        select: { guest: { select: { phone: true } } },
      }),
      this.prisma.shortStayBooking.findMany({
        where: { status: 'CHECKED_IN', propertyId, property: { tenantId } },
        select: { guestPhone: true },
      }),
    ]);

    const totalCheckedIn = reservations.length + shortStays.length;
    const allPhones = [
      ...reservations.map((r) => r.guest?.phone).filter((p): p is string => !!p),
      ...shortStays.map((s) => s.guestPhone).filter((p): p is string => !!p),
    ];
    const noPhone = totalCheckedIn - allPhones.length;
    const phones = [...new Set(allPhones)];

    const dateLabel = menuOfTheDay.date.toISOString().slice(0, 10);
    const results = await Promise.all(
      phones.map((to) =>
        this.whatsapp.sendMenuOfTheDay({
          to,
          restaurantName: menuOfTheDay.restaurant.name,
          date: dateLabel,
          entries: entries.map((e) => ({ name: e.name, description: e.description, price: Number(e.price) })),
        }),
      ),
    );

    return {
      whatsappConfigured: this.whatsapp.isConfigured(),
      totalCheckedIn,
      withPhone: phones.length,
      noPhone,
      sent: results.filter((r) => r.sent).length,
      failed: results.filter((r) => !r.sent).length,
    };
  }
}
