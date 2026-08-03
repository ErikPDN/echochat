import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { AuthResponse } from '@app/contracts/auth/interfaces/auth-response.interface';
import { SignupDto } from '@app/contracts/auth/dto/signup.dto';
import { LoginDto } from '@app/contracts';
import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@app/common/auth';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    return this.authServiceService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authServiceService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest): Promise<AuthResponse['user']> {
    return this.authServiceService.getProfile(req.user.userId);
  }
}
