import { PrismaService } from '../../prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
export declare class UserService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    remove(id: number): Promise<{
        message: string;
    }>;
}
