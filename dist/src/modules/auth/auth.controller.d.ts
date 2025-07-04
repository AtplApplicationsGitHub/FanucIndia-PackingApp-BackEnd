import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
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
