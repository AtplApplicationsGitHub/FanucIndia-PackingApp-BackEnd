import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { AuthRequest } from '../auth/types/auth-request.type';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    create(dto: CreateUserDto): Promise<{
        id: number;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    findAll(role?: 'ADMIN' | 'SALES' | 'USER'): Promise<{
        id: number;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    }[]>;
    update(id: number, dto: UpdateUserDto): Promise<{
        id: number;
        name: string;
        email: string;
        role: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    remove(id: number, req: AuthRequest): Promise<{
        message: string;
    }>;
}
