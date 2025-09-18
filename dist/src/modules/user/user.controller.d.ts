import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(dto: CreateUserDto): Promise<{
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    findAll(role?: 'ADMIN' | 'SALES' | 'USER'): Promise<{
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }[]>;
    update(id: number, dto: UpdateUserDto): Promise<{
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
        id: number;
    }>;
    remove(id: number, req: AuthRequest): Promise<{
        message: string;
    }>;
}
