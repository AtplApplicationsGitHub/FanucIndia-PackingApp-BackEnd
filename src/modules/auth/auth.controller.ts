import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { AuthService } from './auth.service'
import { SignupDto } from './dto/signup.dto'
import { LoginDto } from './dto/login.dto'
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger'
import { Public } from './public.decorator'

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  @ApiOperation({ summary: 'Register a new user (sales or admin)' })
  @ApiBody({ type: SignupDto })
  @ApiResponse({ status: 201, description: 'User signed up successfully' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  signup(
    @Body() dto: SignupDto,
    @Req() req: Request,
  ) {
    return this.authService.signup(dto, req)
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login an existing user and receive JWT' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful, returns JWT token',
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ) {
    return this.authService.login(dto, req)
  }

  @Public()
  @Get('check-email')
  @ApiOperation({ summary: 'Check if an email is already registered' })
  @ApiQuery({
    name: 'email',
    required: true,
    description: 'Email to check',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns whether email exists or not',
  })
  checkEmail(@Query('email') email: string) {
    if (!email) return { exists: false }
    return this.authService.checkEmailExists(email).then((exists) => ({
      exists,
    }))
  }
}
