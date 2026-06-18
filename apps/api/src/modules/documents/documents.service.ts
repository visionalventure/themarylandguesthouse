import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DocumentsService {
  constructor(private prisma: PrismaService) {}

  async getDocuments(tenantId: string, query: any = {}) {
    const { category, search, page = 1, limit = 50 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = { tenantId };
    if (category) where.category = category;
    if (search) where.name = { contains: search, mode: 'insensitive' };

    const [data, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.document.count({ where }),
    ]);

    return { data, total };
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

    // Save current version before updating
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
        ...dto,
        version: doc.version + 1,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async deleteDocument(id: string) {
    return this.prisma.document.delete({ where: { id } });
  }

  async getVersions(id: string) {
    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      orderBy: { version: 'desc' } as any,
    });
  }
}
