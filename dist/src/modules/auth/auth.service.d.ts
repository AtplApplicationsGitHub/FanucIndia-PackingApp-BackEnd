import { PrismaService } from '../../prisma.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private prisma;
    private jwtService;
    constructor(prisma: PrismaService, jwtService: JwtService);
    signup(dto: SignupDto): Promise<{
        id: number;
        email: string;
        role: import(".prisma/client").$Enums.UserRole;
        createdAt: Date;
    }>;
    login(dto: LoginDto): Promise<{
        access_token: string;
        user: {
            id: number;
            email: string;
            role: import(".prisma/client").$Enums.UserRole;
        };
    }>;
}
