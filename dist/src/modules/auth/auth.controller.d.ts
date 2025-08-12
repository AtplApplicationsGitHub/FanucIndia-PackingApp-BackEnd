import { Request } from 'express';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    signup(dto: SignupDto, req: Request): Promise<{
        id: number;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
    }>;
    login(dto: LoginDto, req: Request): Promise<{
        accessToken: string;
        user: {
            id: number;
            name: string;
            email: string;
            role: string;
        };
    }>;
    checkEmail(email: string): Promise<{
        exists: boolean;
    }> | {
        exists: boolean;
    };
}
