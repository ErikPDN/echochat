import {
  BadRequestException,
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
import { refreshTokens, User, users } from './database/schema';
import { eq, inArray, ne, or, and } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { StorageService } from '@app/common';
import { AvatarResponse } from '@app/contracts/auth/interfaces/avatar-response.interface';
import { randomUUID } from 'crypto';
import { UpdateUserDto } from '@app/contracts/auth/dto/update-user.dto';
import { UserInternalResponse } from '@app/contracts/auth/interfaces/user-internal-response.interface';

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
      user: this.toUserResponse(newUser),
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
      user: this.toUserResponse(user),
      accessToken: token,
      refreshToken,
    };
  }

  async verifyUsers(dto: VerifyUsersDto): Promise<UserInternalResponse[]> {
    return this.databaseAuthService.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        email: users.email,
        avatarKey: users.avatarKey,
      })
      .from(users)
      .where(inArray(users.id, dto.userIds));
  }

  async getProfile(userId: string): Promise<AuthResponse['user']> {
    const [user] = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .execute();

    if (!user) throw new NotFoundException('User not found');

    const userResponse = this.toUserResponse(user);
    return userResponse;
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
      user: this.toUserResponse(user),
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
    const [existingUser] = await this.databaseAuthService.db
      .select({ avatarKey: users.avatarKey })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const ext = file.originalname.split('.').pop();
    const key = `${userId}/${randomUUID()}.${ext}`;

    const { avatarUrl } = await this.storageService.upload(
      'avatars',
      key,
      file.buffer,
      file.mimetype,
    );

    await this.databaseAuthService.db
      .update(users)
      .set({ avatarKey: key })
      .where(eq(users.id, userId));

    if (existingUser?.avatarKey)
      await this.storageService.delete('avatars', existingUser.avatarKey);

    return { avatarUrl };
  }

  async deleteAvatar(userId: string): Promise<void> {
    const [user] = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.avatarKey) return;

    await this.storageService.delete('avatars', user.avatarKey);

    await this.databaseAuthService.db
      .update(users)
      .set({ avatarKey: null })
      .where(eq(users.id, userId));
  }

  async updateUser(
    dto: UpdateUserDto,
    userId: string,
  ): Promise<PublicUserResponse> {
    const { name, username } = dto;

    if (!username && !name) {
      throw new BadRequestException(
        'At least one field (name or username) must be provided for update',
      );
    }

    const [existingUser] = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const usernameChanged = username && username !== existingUser.username;
    const nameChanged = name && name !== existingUser.name;

    if (!usernameChanged && !nameChanged) {
      return this.toPublicUserResponse(existingUser);
    }

    if (usernameChanged) {
      const [userWithSameUsername] = await this.databaseAuthService.db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (userWithSameUsername) {
        throw new ConflictException('Username is already taken');
      }
    }

    const updatedUser = await this.databaseAuthService.db.transaction(
      async (tx) => {
        const updateData: Partial<User> = { updatedAt: new Date() };
        if (usernameChanged) updateData.username = username;
        if (nameChanged) updateData.name = name;

        const [user] = await tx
          .update(users)
          .set(updateData)
          .where(eq(users.id, userId))
          .returning();

        return user;
      },
    );

    return this.toPublicUserResponse(updatedUser);
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async issueRefreshToken(
    userId: string,
    familyId: string = randomUUID(),
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

  private toUserResponse(user: User): AuthResponse['user'] {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      avatarUrl: user.avatarKey
        ? this.storageService.getPublicUrl('avatars', user.avatarKey)
        : null,
    };
  }

  private toPublicUserResponse(user: User): PublicUserResponse {
    return {
      id: user.id,
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarKey
        ? this.storageService.getPublicUrl('avatars', user.avatarKey)
        : null,
    };
  }
}
