import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, User } from '@prisma/client/index';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CommunityUser } from './types/community-user.type';
import { PublicUser } from './types/public-user.type';

type CreateLocalUserInput = {
  email: string;
  name: string;
  passwordHash: string;
};

type LocalAuthUser = User & {
  passwordHash: string | null;
};

type PublicUserRecord = Pick<
  User,
  | 'id'
  | 'email'
  | 'name'
  | 'avatarUrl'
  | 'bio'
  | 'role'
  | 'createdAt'
  | 'updatedAt'
>;

type CommunityUserRecord = {
  id: number;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  _count: {
    savedBooks: number;
  };
};

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async createLocalUser(input: CreateLocalUserInput): Promise<PublicUser> {
    try {
      const user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash: input.passwordHash,
        },
      });

      return this.toPublicUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  findByEmail(email: string): Promise<LocalAuthUser | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findPublicById(id: number): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        bio: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toPublicUser(user);
  }

  async getCommunityUsers(): Promise<CommunityUser[]> {
    const users = await this.prisma.user.findMany({
      where: {
        savedBooks: {
          some: {},
        },
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        bio: true,
        _count: {
          select: {
            savedBooks: true,
          },
        },
      },
      orderBy: [
        {
          savedBooks: {
            _count: 'desc',
          },
        },
        {
          name: 'asc',
        },
      ],
    });

    return users
      .map((user): CommunityUserRecord => user)
      .map((user) => ({
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio ?? null,
        booksCount: user._count.savedBooks,
      }));
  }

  async updateProfile(
    userId: number,
    dto: UpdateProfileDto,
  ): Promise<PublicUser> {
    const currentUser = await this.findPublicById(userId);

    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: dto.name === undefined ? currentUser.name : dto.name.trim(),
          email:
            dto.email === undefined
              ? currentUser.email
              : dto.email.trim().toLowerCase(),
          avatarUrl:
            dto.avatarUrl === undefined
              ? currentUser.avatarUrl
              : dto.avatarUrl.trim() || null,
          bio: dto.bio === undefined ? currentUser.bio : dto.bio.trim() || null,
        },
      });

      return this.toPublicUser(user);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('User with this email already exists');
      }

      throw error;
    }
  }

  async setCurrentRefreshToken(
    userId: number,
    refreshToken: string | null,
  ): Promise<void> {
    const hashedRt = refreshToken ? await bcrypt.hash(refreshToken, 10) : null;

    await this.prisma.user.update({
      where: { id: userId },
      data: { hashedRt },
    });
  }

  async isRefreshTokenValid(
    userId: number,
    refreshToken: string,
  ): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        hashedRt: true,
      },
    });

    if (!user?.hashedRt) {
      return false;
    }

    return bcrypt.compare(refreshToken, user.hashedRt);
  }

  private toPublicUser(user: PublicUserRecord): PublicUser {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
