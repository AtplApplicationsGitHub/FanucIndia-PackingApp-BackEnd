import { Body, Controller, Get, Param, Post, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
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

  @Get(':orderId/mention-users') 
  @Roles('ADMIN', 'SALES', 'USER')
  getMentionUsers(
    @Param('orderId', ParseIntPipe) orderId: number, // <--- Updated
    @Req() req: AuthRequest
  ) {
    return this.soChatService.getMentionUsers(orderId, req.user);
  }

  @Get(':orderId/messages')
  @Roles('ADMIN', 'SALES', 'USER')
  listMessages(
    @Param('orderId', ParseIntPipe) orderId: number, // <--- Updated
    @Req() req: AuthRequest
  ) {
    return this.soChatService.listMessages(orderId, req.user);
  }

  @Post(':orderId/messages')
  @Roles('ADMIN', 'SALES', 'USER')
  sendMessage(
    @Param('orderId', ParseIntPipe) orderId: number, // <--- Updated
    @Body() body: { toUserId: number; message: string },
    @Req() req: AuthRequest,
  ) {
    return this.soChatService.sendMessage(orderId, req.user, body);
  }
}
