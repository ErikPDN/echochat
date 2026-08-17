import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseAuthService } from './database/database.service';
import { JwtService } from '@nestjs/jwt';
import {
  AuthResponse,
  InternalAuthResponse,
  LoginDto,
  PublicUserResponse,
  RefreshTokenDto,
  SignupDto,
  VerifyUsersDto,
} from '@app/contracts';
import { refreshTokens, users } from './database/schema';
import { eq, inArray, ne, or, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { StorageService } from '@app/common';
import { AvatarResponse } from '@app/contracts/auth/interfaces/avatar-response.interface';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly databaseAuthService: DatabaseAuthService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService,
  ) {}

  async signup(dto: SignupDto): Promise<InternalAuthResponse> {
    const existingUser = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(or(eq(users.username, dto.username), eq(users.email, dto.email)))
      .limit(1)
      .execute();

    if (existingUser.length > 0)
      throw new ConflictException(
        'User with this username or email already exists',
      );

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const [newUser] = await this.databaseAuthService.db
      .insert(users)
      .values({
        username: dto.username,
        name: dto.name,
        email: dto.email,
        passwordHash: hashedPassword,
      })
      .returning();

    const token = this.jwtService.sign({
      sub: newUser.id,
      username: newUser.username,
    });

    const refreshToken = await this.issueRefreshToken(newUser.id);

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
      },
      accessToken: token,
      refreshToken,
    };
  }

  async login(dto: LoginDto): Promise<InternalAuthResponse> {
    const [user] = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(
        or(eq(users.username, dto.identifier), eq(users.email, dto.identifier)),
      )
      .limit(1)
      .execute();

    if (!user) throw new NotFoundException('User not found');

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) throw new UnauthorizedException('Invalid password');

    const token = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    const refreshToken = await this.issueRefreshToken(user.id);

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
      accessToken: token,
      refreshToken,
    };
  }

  async verifyUsers(dto: VerifyUsersDto): Promise<AuthResponse['user'][]> {
    return this.databaseAuthService.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(inArray(users.id, dto.userIds));
  }

  async getProfile(userId: string): Promise<AuthResponse['user']> {
    const [user] = await this.databaseAuthService.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .execute();

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async refreshToken(dto: RefreshTokenDto): Promise<InternalAuthResponse> {
    const hashedToken = this.hashToken(dto.refreshToken);

    const [existingToken] = await this.databaseAuthService.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashedToken))
      .limit(1);

    if (!existingToken)
      throw new UnauthorizedException('Invalid refresh token');

    if (existingToken.revokedAt) {
      await this.databaseAuthService.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.familyId, existingToken.familyId));

      throw new UnauthorizedException(
        'Refresh token has been revoked due to reuse',
      );
    }

    const now = new Date();
    if (existingToken.expiresAt < now)
      throw new UnauthorizedException('Refresh token has expired');

    const absoluteTtlDays = Number(process.env.REFRESH_TOKEN_ABSOLUTE_TTL_DAYS);
    const absoluteExpiryDate = new Date(
      existingToken.sessionCreatedAt.getTime() +
        absoluteTtlDays * 24 * 60 * 60 * 1000,
    );

    if (absoluteExpiryDate < now)
      throw new UnauthorizedException(
        'Session has expired. Please log in again.',
      );

    const [user] = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(eq(users.id, existingToken.userId))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');

    await this.databaseAuthService.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.id, existingToken.id));

    const refreshToken = await this.issueRefreshToken(
      existingToken.userId,
      existingToken.familyId,
      existingToken.sessionCreatedAt,
    );

    const accessToken = this.jwtService.sign({
      sub: user.id,
      username: user.username,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
    };
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    const hashedToken = this.hashToken(dto.refreshToken);

    const [existingToken] = await this.databaseAuthService.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, hashedToken))
      .limit(1);

    if (!existingToken) return; // Token não existe, então não há nada a fazer

    await this.databaseAuthService.db
      .update(refreshTokens)
      .set({ revokedAt: new Date() })
      .where(eq(refreshTokens.familyId, existingToken.familyId));
  }

  async findUserByUsername(
    username: string,
    currentUserId: string,
  ): Promise<PublicUserResponse> {
    const [user] = await this.databaseAuthService.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
      })
      .from(users)
      .where(and(eq(users.username, username), ne(users.id, currentUserId)))
      .limit(1);

    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      username: user.username,
      name: user.name,
    };
  }

  async updateAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<AvatarResponse> {
    const key = `${userId}.${file.originalname.split('.').pop()}`;
    await this.storageService.upload(
      'avatars',
      key,
      file.buffer,
      file.mimetype,
    );

    await this.databaseAuthService.db
      .update(users)
      .set({ avatarKey: key })
      .where(eq(users.id, userId));

    return { avatarKey: key };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(
    userId: string,
    familyId: string = crypto.randomUUID(),
    sessionCreatedAt: Date = new Date(),
  ): Promise<string> {
    const rawToken = crypto.randomBytes(64).toString('hex');
    const ttlDays = Number(process.env.REFRESH_TOKEN_TTL_DAYS);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.databaseAuthService.db.insert(refreshTokens).values({
      userId,
      tokenHash: this.hashToken(rawToken),
      familyId,
      sessionCreatedAt,
      expiresAt,
    });

    return rawToken;
  }
}
