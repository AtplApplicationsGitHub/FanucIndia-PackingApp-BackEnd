import { SetMetadata } from '@nestjs/common';

export type UserRole = 'ADMIN' | 'SALES' | 'USER' | 'SUPER_ADMIN';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
