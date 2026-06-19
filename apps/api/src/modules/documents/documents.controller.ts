import {
  Controller, Get, Post, Put, Delete, Body, Param, Query,
  UseGuards, Request, UseInterceptors, UploadedFile, Res,
  BadRequestException, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';
import { memoryStorage } from 'multer';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents with category/search filter' })
  getDocuments(@Query() query: any) {
    return this.service.getDocuments(query.tenantId || query.propertyId, query);
  }

  @Get('compliance')
  @ApiOperation({ summary: 'Get compliance report for expiry tracking' })
  getCompliance(@Query('propertyId') propertyId: string) {
    return this.service.getComplianceReport(propertyId);
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file and return its data URL' })
  @UseInterceptors(FileInterceptor('file', {
    storage: memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    fileFilter: (_req, file, cb) => {
      const allowed = /^(image\/(jpeg|png|gif|webp|svg\+xml)|application\/pdf)$/;
      cb(null, allowed.test(file.mimetype));
    },
  }))
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('No file received');
    const b64 = file.buffer.toString('base64');
    const fileUrl = `data:${file.mimetype};base64,${b64}`;
    return { fileUrl, fileName: file.originalname, fileSize: file.size, mimeType: file.mimetype };
  }

  @Get('categories')
  @ApiOperation({ summary: 'List custom document categories for a property' })
  getCategories(@Query('propertyId') propertyId: string) {
    return this.service.getCustomCategories(propertyId);
  }

  @Post('categories')
  @ApiOperation({ summary: 'Create custom document category (admin)' })
  createCategory(@Body() dto: any) {
    return this.service.createCustomCategory(dto);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'Delete custom document category' })
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCustomCategory(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create document record' })
  createDocument(@Body() dto: any, @Request() req: any) {
    return this.service.createDocument(dto, req.user?.sub);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update document metadata / upload new version' })
  updateDocument(@Param('id') id: string, @Body() dto: any) {
    return this.service.updateDocument(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document' })
  deleteDocument(@Param('id') id: string) {
    return this.service.deleteDocument(id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get document version history' })
  getVersions(@Param('id') id: string) {
    return this.service.getVersions(id);
  }
}
