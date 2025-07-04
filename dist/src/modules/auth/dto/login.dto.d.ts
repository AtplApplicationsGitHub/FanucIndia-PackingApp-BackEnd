import { UserRole } from '@prisma/client';
export declare class LoginDto {
    email: string;
    password: string;
    role: UserRole;
}
