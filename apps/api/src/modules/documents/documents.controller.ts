import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'documents', version: '1' })
export class DocumentsController {
  constructor(private readonly service: DocumentsService) {}

  @Get()
  @ApiOperation({ summary: 'List documents with category/search filter' })
  getDocuments(@Query() query: any) {
    return this.service.getDocuments(query.tenantId || query.propertyId, query);
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
