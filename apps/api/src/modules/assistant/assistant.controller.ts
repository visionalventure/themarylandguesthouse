import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AssistantService } from './assistant.service';

class ChatDto {
  message: string;
  context?: { page?: string };
}

@ApiTags('assistant')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller({ path: 'assistant', version: '1' })
export class AssistantController {
  constructor(private readonly service: AssistantService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with Maryland Assistant (AI)' })
  chat(@Body() dto: ChatDto, @Request() req: any) {
    return this.service.chat(dto, req.user);
  }
}
