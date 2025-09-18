import { PrismaService } from '../../prisma.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
export declare class UserService {
    private readonly prisma;
    constructor(prisma: PrismaService);
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
    remove(id: number): Promise<{
        message: string;
    }>;
}
