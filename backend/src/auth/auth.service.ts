import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { PublicUser } from '../users/types/public-user.type';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './types/jwt-payload.type';

type AuthResult = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

type ValidatedLocalUser = {
  id: number;
  passwordHash: string;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.usersService.createLocalUser({
      email: dto.email.toLowerCase().trim(),
      name: dto.name.trim(),
      passwordHash,
    });

    const tokens = await this.generateTokens(user);
    await this.usersService.setCurrentRefreshToken(
      user.id,
      tokens.refreshToken,
    );

    return {
      user,
      ...tokens,
    };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.validateLocalUser(
      dto.email.toLowerCase().trim(),
      dto.password,
    );

    const publicUser = await this.usersService.findPublicById(user.id);
    const tokens = await this.generateTokens(publicUser);

    await this.usersService.setCurrentRefreshToken(
      publicUser.id,
      tokens.refreshToken,
    );

    return {
      user: publicUser,
      ...tokens,
    };
  }

  async refreshTokens(
    userId: number,
    refreshToken: string,
  ): Promise<AuthResult> {
    const isRefreshValid = await this.usersService.isRefreshTokenValid(
      userId,
      refreshToken,
    );
    if (!isRefreshValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.usersService.findPublicById(userId);
    const tokens = await this.generateTokens(user);

    await this.usersService.setCurrentRefreshToken(
      user.id,
      tokens.refreshToken,
    );

    return {
      user,
      ...tokens,
    };
  }

  async logout(userId: number): Promise<{ success: true }> {
    await this.usersService.setCurrentRefreshToken(userId, null);
    return { success: true };
  }

  async getProfile(userId: number): Promise<PublicUser> {
    return this.usersService.findPublicById(userId);
  }

  private async validateLocalUser(
    email: string,
    password: string,
  ): Promise<ValidatedLocalUser> {
    const user = await this.usersService.findByEmail(email);

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return {
      id: user.id,
      passwordHash: user.passwordHash,
    };
  }

  private async generateTokens(user: PublicUser): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
        expiresIn: this.ttlToSeconds(process.env.ACCESS_TOKEN_TTL, 15 * 60),
      }),
      this.jwtService.signAsync(payload, {
        secret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
        expiresIn: this.ttlToSeconds(
          process.env.REFRESH_TOKEN_TTL,
          7 * 24 * 60 * 60,
        ),
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private ttlToSeconds(
    ttl: string | undefined,
    fallbackSeconds: number,
  ): number {
    if (!ttl) {
      return fallbackSeconds;
    }

    const trimmed = ttl.trim();
    if (!trimmed) {
      return fallbackSeconds;
    }

    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber) && asNumber > 0) {
      return Math.floor(asNumber);
    }

    const match = trimmed.match(/^(\d+)\s*([smhd])$/i);
    if (!match) {
      return fallbackSeconds;
    }

    const value = Number(match[1]);
    const unit = match[2].toLowerCase();

    if (unit === 's') {
      return value;
    }
    if (unit === 'm') {
      return value * 60;
    }
    if (unit === 'h') {
      return value * 60 * 60;
    }

    return value * 24 * 60 * 60;
  }
}
