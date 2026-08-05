import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { AuthResponse } from '@app/contracts/auth/interfaces/auth-response.interface';
import { SignupDto } from '@app/contracts/auth/dto/signup.dto';
import {
  InternalAuthResponse,
  LoginDto,
  RefreshTokenDto,
} from '@app/contracts';
import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@app/common/auth';

@Controller('auth')
export class AuthServiceController {
  constructor(private readonly authServiceService: AuthServiceService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<InternalAuthResponse> {
    return this.authServiceService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<InternalAuthResponse> {
    return this.authServiceService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest): Promise<AuthResponse['user']> {
    return this.authServiceService.getProfile(req.user.userId);
  }

  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto): Promise<InternalAuthResponse> {
    return this.authServiceService.refreshToken(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@Body() dto: RefreshTokenDto): Promise<void> {
    return this.authServiceService.logout(dto);
  }
}
