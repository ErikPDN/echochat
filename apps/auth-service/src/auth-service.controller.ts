import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthServiceService } from './auth-service.service';
import { AuthResponse } from '@app/contracts/auth/interfaces/auth-response.interface';
import { SignupDto } from '@app/contracts/auth/dto/signup.dto';
import {
  InternalAuthResponse,
  LoginDto,
  PublicUserResponse,
  RefreshTokenDto,
  VerifyUsersDto,
} from '@app/contracts';
import { JwtAuthGuard } from '@app/common/auth/jwt-auth.guard';
import type { AuthenticatedRequest } from '@app/common/auth';
import { FileInterceptor } from '@nestjs/platform-express';
import { AvatarResponse } from '@app/contracts/auth/interfaces/avatar-response.interface';

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

  @Post('users/verify')
  verifyUsers(@Body() dto: VerifyUsersDto): Promise<AuthResponse['user'][]> {
    return this.authServiceService.verifyUsers(dto);
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

  @UseGuards(JwtAuthGuard)
  @Get('users/username/:username')
  findUserByUsername(
    @Param('username') username: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<PublicUserResponse> {
    return this.authServiceService.findUserByUsername(
      username,
      req.user.userId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/avatar')
  @UseInterceptors(FileInterceptor('file'))
  updateAvatar(
    @Req() req: AuthenticatedRequest,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<AvatarResponse> {
    return this.authServiceService.updateAvatar(req.user.userId, file);
  }
}
