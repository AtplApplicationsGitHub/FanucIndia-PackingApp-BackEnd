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
    const email = dto.email.toLowerCase()
    const existing = await this.prisma.user.findUnique({
      where: { email },
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

    const hash = await bcrypt.hash(dto.password, 10)
    const user = await this.prisma.user.create({
      data: {
        name: dto.name,
        email,
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
    const email = dto.email.toLowerCase()
    const user = await this.prisma.user.findUnique({
      where: { email },
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

    const valid = await bcrypt.compare(dto.password, user.password)
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
      },
    }
  }

  async checkEmailExists(email: string): Promise<boolean> {
    if (!email) return false
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    })
    return !!user
  }
}
