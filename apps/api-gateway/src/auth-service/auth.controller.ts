import {
  Body,
  Controller,
  Get,
  Post,
  Headers,
  UseGuards,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthResponse } from '@app/contracts/auth/interfaces/auth-response.interface';
import { SignupDto } from '@app/contracts/auth/dto/signup.dto';
import { LoginDto } from '@app/contracts/auth/dto/login.dto';
import { JwtAuthGuard, OriginGuard } from '@app/common/auth';
import {
  REFRESH_TOKEN_COOKIE,
  RefreshTokenCookieGuard,
} from '@app/common/auth/refresh-token-cookie.guard';
import { PublicUserResponse } from '@app/contracts/auth/interfaces/public-user-response.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { AvatarResponse } from '@app/contracts/auth/interfaces/avatar-response.interface';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(
    @Body() dto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...authResponse } =
      await this.authService.signup(dto);
    this.setRefreshCookie(res, refreshToken);
    return authResponse;
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const { refreshToken, ...authResponse } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return authResponse;
  }

  @UseGuards(OriginGuard, RefreshTokenCookieGuard)
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResponse> {
    const incomingToken = req.cookies[REFRESH_TOKEN_COOKIE] as string;
    const { refreshToken, ...authResponse } =
      await this.authService.refreshToken(incomingToken);
    this.setRefreshCookie(res, refreshToken);
    return authResponse;
  }

  @UseGuards(OriginGuard, RefreshTokenCookieGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    const incomingToken = req.cookies[REFRESH_TOKEN_COOKIE] as string;
    await this.authService.logout(incomingToken);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getProfile(
    @Headers('authorization') token: string,
  ): Promise<AuthResponse['user']> {
    return this.authService.getProfile(token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users/username/:username')
  findUserByUsername(
    @Param('username') username: string,
    @Headers('authorization') token: string,
  ): Promise<PublicUserResponse> {
    return this.authService.findUserByUsername(username, token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/avatar')
  @UseInterceptors(FileInterceptor('file'))
  uploadAvatar(
    @Headers('authorization') token: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 30 * 1024 * 1024 }), // 30MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AvatarResponse> {
    return this.authService.uploadAvatar(token, file);
  }

  private setRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: Number(process.env.REFRESH_TOKEN_TTL_DAYS) * 24 * 60 * 60 * 1000,
      path: '/auth',
    });
  }
}
