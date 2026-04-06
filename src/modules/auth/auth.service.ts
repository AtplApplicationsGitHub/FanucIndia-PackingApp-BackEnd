import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma.service'
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcryptjs'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { logAuthFailure } from '../../common/logger'

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto, req: Request) {
    const email = dto.email.replace(/\s+/g, '');
    const existing = await this.prisma.user.findFirst({
      where: { 
        email: { equals: email, mode: 'insensitive' } 
      },
    })
    if (existing) {
      logAuthFailure({
        code: 'USER_ALREADY_EXISTS',
        message: 'Email already in use',
        ip: req.ip ?? 'unknown',
        requestId: String(req.headers['x-request-id'] ?? ''), 
      })
      throw new ConflictException({
        code: 'USER_ALREADY_EXISTS',
        message: 'Email already in use',
      })
    }

    const hash = await bcrypt.hash(dto.password.replace(/\s+/g, ''), 10);
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email: email,
        password: hash,
        role: dto.role ?? 'SALES',
      },
    })

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    }
  }

  async login(dto: LoginDto, req: Request) {
    const email = dto.email.replace(/\s+/g, '')
    const user = await this.prisma.user.findFirst({
      where: { 
        email: { equals: email, mode: 'insensitive' } 
      },
      include: {
        salesZone: true
      }
    })

    if (!user) {
      logAuthFailure({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        ip: req.ip ?? 'unknown',
        requestId: String(req.headers['x-request-id'] ?? ''),
      })
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      })
    }

    const valid = await bcrypt.compare(dto.password.replace(/\s+/g, ''), user.password)
    if (!valid) {
      logAuthFailure({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
        ip: req.ip ?? 'unknown',
        userId: String(user.id),
        requestId: String(req.headers['x-request-id'] ?? ''),
      })
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      })
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    })

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        salesZone: user.salesZone?.name || null,
      },
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    if (!email) return false
    const user = await this.prisma.user.findFirst({
      where: { 
        email: { equals: email.replace(/\s+/g, ''), mode: 'insensitive' } 
      },
      select: { id: true },
    })
    return !!user
  }

  async mobileLogin(dto: LoginDto, req: Request) {
    const email = dto.email.replace(/\s+/g, '');
    const user = await this.prisma.user.findFirst({
      where: { 
        email: { equals: email, mode: 'insensitive' } 
      },
    });

    if (!user) {
      logAuthFailure({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials for mobile login',
        ip: req.ip ?? 'unknown',
        requestId: String(req.headers['x-request-id'] ?? ''),
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    if (user.role !== 'USER') {
      logAuthFailure({
        code: 'INVALID_ROLE_FOR_MOBILE',
        message: `User with role ${user.role} attempted mobile login`,
        ip: req.ip ?? 'unknown',
        userId: String(user.id),
        requestId: String(req.headers['x-request-id'] ?? ''),
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const valid = await bcrypt.compare(dto.password.replace(/\s+/g, ''), user.password);
    if (!valid) {
      logAuthFailure({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials for mobile login',
        ip: req.ip ?? 'unknown',
        userId: String(user.id),
        requestId: String(req.headers['x-request-id'] ?? ''),
      });
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    }

    const token = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });

    return {
      accessToken: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accessPickPack: user.accessPickPack,
        accessLabelPrint: user.accessLabelPrint,
        accessMaterialFgTransfer: user.accessMaterialFgTransfer,
        accessMaterialDispatch: user.accessMaterialDispatch,
        accessVehicleEntry: user.accessVehicleEntry,
        accessLocationAccuracy: user.accessLocationAccuracy,
        accessContentAccuracy: user.accessContentAccuracy,
        accessPutAway: user.accessPutAway,
        accessErpBarcode: user.accessErpBarcode,
      },
    };
  }
}
