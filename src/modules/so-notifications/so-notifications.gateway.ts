import {
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
})
export class SoNotificationsGateway {
  @WebSocketServer() server: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token;
      if (!token) return client.disconnect(true);

      const payload = await this.jwtService.verifyAsync(token);
      
      const userId = payload?.sub; 

      if (!userId) return client.disconnect(true);

      client.join(`user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  emitToUser(userId: number, payload: any) {
    this.server.to(`user:${userId}`).emit('notification:new', payload);
  }
}