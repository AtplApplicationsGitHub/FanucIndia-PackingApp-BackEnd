import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from './types/jwt-payload.type'; 
import { PrismaService } from '../../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private prisma: PrismaService 
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET')!,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.isWeb) {
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
        salesZoneId: payload.salesZoneId,
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: Number(payload.sub) },
      select: { currentSessionId: true } 
    });

    if (!user || user.currentSessionId !== payload.sessionId) {
      throw new UnauthorizedException({
        code: 'SESSION_REVOKED',
        message: 'You have been logged out because this account was accessed from another device.'
      });
    }

    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      salesZoneId: payload.salesZoneId,
    };
  }
}