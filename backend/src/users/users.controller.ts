import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GetCurrentUserId } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { BooksService } from '../books/books.service';
import type { LibraryBookResult } from '../books/types';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly booksService: BooksService,
  ) {}

  @Get('community')
  @ApiOperation({ summary: 'Get community users with at least one saved book' })
  @ApiResponse({ status: 200, description: 'Community users loaded' })
  getCommunity() {
    return this.usersService.getCommunityUsers();
  }

  @Get(':userId/library')
  @ApiOperation({ summary: 'Get public library for a user' })
  @ApiResponse({ status: 200, description: 'Public user library loaded' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicLibrary(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<LibraryBookResult[]> {
    await this.usersService.findPublicById(userId);
    return this.booksService.getUserLibrary(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  updateMe(@GetCurrentUserId() userId: number, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(userId, dto);
  }
}
