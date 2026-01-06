import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection, 
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config'; 

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class SoNotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService, 
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) {
        console.log('Socket connection attempt without token');
        return client.disconnect(true);
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });
      
      const userId = payload?.sub; 

      if (!userId) {
        console.log('Socket connection invalid token payload');
        return client.disconnect(true);
      }

      client.join(`user:${userId}`);
      console.log(`Socket client connected: User ${userId}`); 
    } catch (e) {
      console.error('Socket authentication failed:', e);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {}

  emitToUser(userId: number, payload: any) {
    this.server.to(`user:${userId}`).emit('notification:new', payload);
  }

  emitClearToUser(userId: number, soNumber: string) {
    this.server.to(`user:${userId}`).emit('notification:cleared', { salesOrderNumber: soNumber });
  }
}