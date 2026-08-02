import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseAuthService } from './database/database.service';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, LoginDto, SignupDto } from '@app/contracts';
import { users } from './database/schema';
import { eq, or } from 'drizzle-orm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthServiceService {
  constructor(
    private readonly databaseAuthService: DatabaseAuthService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<AuthResponse> {
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

    return {
      user: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        email: newUser.email,
      },
      accessToken: token,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
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

    return {
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
      },
      accessToken: token,
    };
  }

  async getProfile(userId: string): Promise<AuthResponse['user']> {
    const [user] = await this.databaseAuthService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .execute();

    if (!user) throw new NotFoundException('User not found');

    return user;
  }
}
