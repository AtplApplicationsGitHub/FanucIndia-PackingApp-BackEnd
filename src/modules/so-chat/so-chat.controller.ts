import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { AuthRequest } from '../auth/types/auth-request.type';
import { SoChatService } from './so-chat.service';

@ApiTags('SO Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('so-chat')
export class SoChatController {
  constructor(private readonly soChatService: SoChatService) {}

  @Get('mention-users')
  @Roles('ADMIN', 'SALES', 'USER')
  getMentionUsers(@Req() req: AuthRequest) {
    return this.soChatService.getMentionUsers(req.user);
  }

  @Get(':soNumber/messages')
  @Roles('ADMIN', 'SALES', 'USER')
  listMessages(@Param('soNumber') soNumber: string, @Req() req: AuthRequest) {
    return this.soChatService.listMessages(soNumber, req.user);
  }

  @Post(':soNumber/messages')
  @Roles('ADMIN', 'SALES', 'USER')
  sendMessage(
    @Param('soNumber') soNumber: string,
    @Body() body: { toUserId: number; message: string },
    @Req() req: AuthRequest,
  ) {
    return this.soChatService.sendMessage(soNumber, req.user, body);
  }
}
