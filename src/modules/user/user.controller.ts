import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Req,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto, ResetPasswordDto } from './dto/user.dto';
import { Roles } from '../auth/roles.decorator';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { AuthRequest } from '../auth/types/auth-request.type';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({
    name: 'role',
    required: false,
    type: String,
    description: 'Filter by user role',
  })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAll(
    @Query('role') role?: 'ADMIN' | 'SALES' | 'USER' | 'SUPER_ADMIN',
    @Query('search') search?: string,
  ) {
    return this.userService.findAll(role, search);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user details by ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Delete a user by ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiResponse({ status: 200, description: 'User deleted successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const currentUserId = req.user.userId;
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own admin account.');
    }
    return this.userService.remove(id);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset own password' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  resetPassword(@Req() req: AuthRequest, @Body() dto: ResetPasswordDto) {
    return this.userService.resetPassword(req.user.userId, dto);
  }

  @Get('mobile-modules')
  @ApiOperation({
    summary: 'Get mobile module access flags for the current user',
  })
  @ApiResponse({ status: 200, description: 'Returns module access flags' })
  getMobileModules(@Req() req: AuthRequest) {
    return this.userService.getMobileModules(req.user.userId);
  }
}
