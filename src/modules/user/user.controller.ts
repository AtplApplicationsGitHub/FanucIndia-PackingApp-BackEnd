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
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
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
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by user role' })
  @ApiResponse({ status: 200, description: 'List of all users' })
  findAll(@Query('role') role?: 'ADMIN' | 'SALES' | 'USER') {
    return this.userService.findAll(role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user details by ID (Admin only)' })
  @ApiParam({ name: 'id', type: Number })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.userService.update(id, dto);
  }

  @Delete(':id')
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
}