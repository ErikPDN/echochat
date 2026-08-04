import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse } from '@app/contracts/auth/interfaces/auth-response.interface';
import { SignupDto } from '@app/contracts/auth/dto/signup.dto';
import { LoginDto } from '@app/contracts/auth/dto/login.dto';
import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() dto: SignupDto): Promise<AuthResponse> {
    return this.authService.signup(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(
    @Headers('authorization') token: string,
  ): Promise<AuthResponse['user']> {
    return this.authService.getProfile(token);
  }
}
