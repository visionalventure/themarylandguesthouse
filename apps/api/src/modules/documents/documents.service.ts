import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { addDays } from 'date-fns';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getDocuments(tenantId: string, query: any = {}) {
    const { category, search, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (category && category !== 'ALL') {
      if (['CONTRACT','LICENSE','STAFF_FILE','PROCUREMENT','FINANCIAL','LEGAL','INSURANCE','OTHER'].includes(category)) {
        where.category = category;
      } else {
        where.customCategory = category;
      }
    }
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total };
  }

  async getComplianceReport(propertyId: string) {
    const now = new Date();
    const in30 = addDays(now, 30);
    const in90 = addDays(now, 90);

    const [total, withExpiry, expired, expiring30, expiring90] = await Promise.all([
      this.prisma.document.count({ where: { propertyId } }),
      this.prisma.document.count({ where: { propertyId, expiryDate: { not: null } } }),
      this.prisma.document.findMany({
        where: { propertyId, expiryDate: { lt: now } },
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.document.findMany({
        where: { propertyId, expiryDate: { gte: now, lte: in30 } },
        orderBy: { expiryDate: 'asc' },
      }),
      this.prisma.document.findMany({
        where: { propertyId, expiryDate: { gt: in30, lte: in90 } },
        orderBy: { expiryDate: 'asc' },
      }),
    ]);

    const validCount = withExpiry - expired.length - expiring30.length - expiring90.length;
    const complianceScore = withExpiry > 0
      ? Math.round(((validCount + expiring90.length * 0.5) / withExpiry) * 100)
      : 100;

    return { total, withExpiry, expired, expiring30, expiring90, validCount, complianceScore };
  }

  async createDocument(dto: any, uploadedById?: string) {
    const tenantId = dto.tenantId || dto.propertyId;
    return this.prisma.document.create({
      data: {
        tenantId,
        propertyId: dto.propertyId,
        name: dto.title || dto.name || 'Untitled',
        description: dto.description,
        category: dto.category || 'OTHER',
        customCategory: dto.customCategory || null,
        fileUrl: dto.fileUrl || '',
        fileName: dto.fileName || dto.fileUrl?.split('/').pop() || 'document',
        fileSize: dto.fileSize || 0,
        mimeType: dto.mimeType || 'application/octet-stream',
        tags: dto.tags || [],
        uploadedById: uploadedById || dto.uploadedById,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        version: 1,
      },
    });
  }

  async updateDocument(id: string, dto: any) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');

    await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: doc.version,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileSize: doc.fileSize,
        changedById: dto.uploadedById,
        changeNotes: dto.changeNotes,
      } as any,
    });

    return this.prisma.document.update({
      where: { id },
      data: {
        name: dto.name || dto.title,
        description: dto.description,
        category: dto.category,
        customCategory: dto.customCategory,
        fileUrl: dto.fileUrl,
        fileName: dto.fileName,
        fileSize: dto.fileSize,
        mimeType: dto.mimeType,
        tags: dto.tags,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
        version: doc.version + 1,
      },
    });
  }

  async deleteDocument(id: string) {
    await this.prisma.documentVersion.deleteMany({ where: { documentId: id } });
    return this.prisma.document.delete({ where: { id } });
  }

  async getVersions(id: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' } as any,
    });
  }

  // ── Custom Categories ─────────────────────────────────────
  async getCustomCategories(propertyId: string) {
    return this.prisma.documentCustomCategory.findMany({
      where: { propertyId },
      orderBy: { name: 'asc' },
    });
  }

  async createCustomCategory(dto: { propertyId: string; name: string; color?: string }) {
    return this.prisma.documentCustomCategory.create({
      data: { propertyId: dto.propertyId, name: dto.name.toUpperCase(), color: dto.color || 'slate' },
    });
  }

  async deleteCustomCategory(id: string) {
    return this.prisma.documentCustomCategory.delete({ where: { id } });
  }
}
