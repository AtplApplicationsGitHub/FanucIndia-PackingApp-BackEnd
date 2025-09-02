export type UserRole = 'ADMIN' | 'SALES' | 'USER';
export declare const ROLES_KEY = "roles";
export declare const Roles: (...roles: UserRole[]) => import("@nestjs/common").CustomDecorator<string>;
