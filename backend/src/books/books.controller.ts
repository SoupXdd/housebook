import {
  Body,
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UnprocessableEntityException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { BooksService } from './books.service';
import type { BookLookupResult, LibraryBookResult } from './types';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import { GetCurrentUserId } from '../auth/decorators/current-user.decorator';
import { LookupBookDto } from './dto/lookup-book.dto';
import { UpdateReadingStatusDto } from './dto/update-reading-status.dto';

@ApiTags('books')
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Get('lookup')
  @ApiOperation({ summary: 'Lookup a book by ISBN or URL' })
  @ApiQuery({ name: 'isbn', required: false, description: 'Book ISBN' })
  @ApiQuery({
    name: 'url',
    required: false,
    description: 'Book URL from supported sources',
  })
  @ApiResponse({ status: 200, description: 'Book found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 404, description: 'Book not found' })
  @ApiResponse({ status: 422, description: 'Unsupported URL or invalid ISBN' })
  async lookup(
    @Query('isbn') isbn?: string,
    @Query('url') url?: string,
  ): Promise<BookLookupResult> {
    this.validateLookupInput({ isbn, url });

    return this.booksService.lookup({ isbn: isbn?.trim(), url: url?.trim() });
  }

  @UseGuards(AccessTokenGuard)
  @Post('library')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save a book to the current user library' })
  @ApiBody({ type: LookupBookDto })
  @ApiResponse({ status: 201, description: 'Book saved to library' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 422, description: 'Unsupported URL or invalid ISBN' })
  async saveToLibrary(
    @GetCurrentUserId() userId: number,
    @Body() dto: LookupBookDto,
  ): Promise<LibraryBookResult> {
    this.validateLookupInput({ isbn: dto.isbn, url: dto.url });

    return this.booksService.saveToLibrary(userId, {
      isbn: dto.isbn?.trim(),
      url: dto.url?.trim(),
    });
  }

  @UseGuards(AccessTokenGuard)
  @Get('library')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user saved books' })
  @ApiResponse({ status: 200, description: 'User library loaded' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLibrary(
    @GetCurrentUserId() userId: number,
  ): Promise<LibraryBookResult[]> {
    return this.booksService.getUserLibrary(userId);
  }

  @UseGuards(AccessTokenGuard)
  @Patch('library/:bookId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update reading status for a user library book' })
  @ApiBody({ type: UpdateReadingStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Reading status updated successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({
    status: 404,
    description: 'Book is not in current user library',
  })
  async updateReadingStatus(
    @GetCurrentUserId() userId: number,
    @Param('bookId', ParseIntPipe) bookId: number,
    @Body() dto: UpdateReadingStatusDto,
  ): Promise<LibraryBookResult> {
    return this.booksService.updateReadingStatus(
      userId,
      bookId,
      dto.readingStatus,
    );
  }

  @Get('search')
  @ApiOperation({ summary: 'Search books by title' })
  @ApiQuery({
    name: 'title',
    required: true,
    description: 'Book title to search for',
  })
  @ApiResponse({ status: 200, description: 'Books found successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input parameters' })
  @ApiResponse({ status: 404, description: 'No books found' })
  async searchByTitle(
    @Query('title') title?: string,
  ): Promise<BookLookupResult[]> {
    if (!title?.trim()) {
      throw new BadRequestException('Provide title');
    }

    return this.booksService.searchByTitle(title.trim());
  }

  @Get('sources')
  @ApiOperation({ summary: 'Get list of supported book sources' })
  @ApiResponse({ status: 200, description: 'List of supported sources' })
  getSources(): { sources: string[] } {
    return { sources: this.booksService.getSupportedSources() };
  }

  private validateLookupInput(input: { isbn?: string; url?: string }): void {
    const { isbn, url } = input;

    if (!isbn && !url) {
      throw new BadRequestException('Provide isbn or url');
    }

    if (isbn && url) {
      throw new BadRequestException('Provide only one of isbn or url');
    }

    if (isbn) {
      const trimmed = isbn.trim();
      if (!trimmed) {
        throw new BadRequestException('ISBN cannot be empty');
      }
    }

    if (url) {
      const trimmed = url.trim();
      if (!trimmed) {
        throw new BadRequestException('URL cannot be empty');
      }
      if (!this.booksService.isSupportedUrl(trimmed)) {
        throw new UnprocessableEntityException(
          `Unsupported URL. Supported: ${this.booksService.getSupportedSources().join(', ')}`,
        );
      }
    }
  }
}
