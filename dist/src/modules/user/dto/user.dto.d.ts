export declare class CreateUserDto {
    name: string;
    email: string;
    password: string;
    role: string;
}
declare const UpdateUserDto_base: import("@nestjs/common").Type<Partial<CreateUserDto>>;
export declare class UpdateUserDto extends UpdateUserDto_base {
    password?: string;
}
export {};
