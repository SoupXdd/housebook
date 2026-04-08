import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LoanStatus as PrismaLoanStatus } from '@prisma/client/index';
import type {
  BookLookupResult,
  BookProvider,
  LibraryBookResult,
  ReadingStatus,
} from './types';
import { OpenLibraryProvider } from './providers/openlibrary.provider';
import { LitResProvider } from './providers/litres.provider';
import { PrismaService } from '../prisma/prisma.service';
import { deriveLoanUxState, getReadingStatusLabel } from '../loans/loan-ux';

export type LookupInput = { isbn?: string; url?: string; title?: string };

@Injectable()
export class BooksService {
  private readonly logger = new Logger(BooksService.name);
  private readonly providers: BookProvider[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly openLibrary: OpenLibraryProvider,
    private readonly litRes: LitResProvider,
  ) {
    this.providers = [openLibrary, litRes];
  }

  getSupportedSources(): string[] {
    return this.providers.map((provider) => provider.name);
  }

  isSupportedUrl(value: string): boolean {
    return this.providers.some((provider) => provider.supportsUrl(value));
  }

  async lookup(input: LookupInput): Promise<BookLookupResult> {
    if (input.isbn) {
      return this.lookupByIsbn(input.isbn);
    }
    if (input.url) {
      return this.lookupByUrl(input.url);
    }
    throw new BadRequestException('Provide isbn or url');
  }

  async searchByTitle(title: string): Promise<BookLookupResult[]> {
    const provider = this.providers.find((item) => item.supportsTitle());
    if (!provider) {
      throw new UnprocessableEntityException(
        'No provider supports title search',
      );
    }

    this.logger.log(`Title search via ${provider.name}: ${title}`);
    const results = (await provider.searchByTitle!(title)).map((result) =>
      this.normalizeLookupResult(result),
    );

    return results.sort((left, right) => {
      const leftRussian = this.isRussianResult(left) ? 1 : 0;
      const rightRussian = this.isRussianResult(right) ? 1 : 0;
      return rightRussian - leftRussian;
    });
  }

  async saveToLibrary(
    userId: number,
    input: LookupInput,
  ): Promise<LibraryBookResult> {
    const result = await this.lookup(input);
    const canonicalKey = this.buildCanonicalKey(result);

    const existingBook = await this.prisma.book.findUnique({
      where: { canonicalKey },
      select: { id: true },
    });
    const existingUserBook = existingBook
      ? await this.prisma.userBook.findUnique({
          where: {
            userId_bookId: {
              userId,
              bookId: existingBook.id,
            },
          },
        })
      : null;

    const book = await this.prisma.book.upsert({
      where: { canonicalKey },
      update: {
        title: result.title,
        authors: result.authors,
        coverUrl: result.coverUrl,
        description: result.description,
        isbn: result.isbn,
        language: result.language,
        year: result.year,
        sourceName: result.sourceName,
        sourceUrl: result.sourceUrl,
      },
      create: {
        canonicalKey,
        title: result.title,
        authors: result.authors,
        coverUrl: result.coverUrl,
        description: result.description,
        isbn: result.isbn,
        language: result.language,
        year: result.year,
        sourceName: result.sourceName,
        sourceUrl: result.sourceUrl,
      },
    });

    const userBook = await this.prisma.userBook.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId: book.id,
        },
      },
      update: {},
      create: {
        userId,
        bookId: book.id,
        readingStatus: 'unread',
      },
    });

    if (existingUserBook) {
      this.logger.log(
        `Book ${book.id} already exists in user ${userId} library`,
      );
    }

    return this.buildLibraryBookResult({
      book,
      readingStatus: userBook.readingStatus,
      addedAt: userBook.createdAt,
      activeLoan: undefined,
      wasAlreadyInLibrary: Boolean(existingUserBook),
    });
  }

  async getUserLibrary(userId: number): Promise<LibraryBookResult[]> {
    const userBooks = await this.prisma.userBook.findMany({
      where: { userId },
      include: { book: true },
      orderBy: { createdAt: 'desc' },
    });

    const activeLoans = await this.prisma.loan.findMany({
      where: {
        ownerUserId: userId,
        status: PrismaLoanStatus.active,
        bookId: {
          in: userBooks.map((item) => item.bookId),
        },
      },
      include: {
        borrowerUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    const activeLoanByBookId = new Map(
      activeLoans.map((loan) => [loan.bookId, loan]),
    );

    return userBooks.map(({ book, readingStatus, createdAt }) =>
      this.buildLibraryBookResult({
        book,
        readingStatus,
        addedAt: createdAt,
        activeLoan: activeLoanByBookId.get(book.id),
      }),
    );
  }

  async updateReadingStatus(
    userId: number,
    bookId: number,
    readingStatus: ReadingStatus,
  ): Promise<LibraryBookResult> {
    const updated = await this.prisma.userBook.updateMany({
      where: {
        userId,
        bookId,
      },
      data: {
        readingStatus,
      },
    });

    if (updated.count === 0) {
      throw new NotFoundException('Book is not in current user library');
    }

    const userBook = await this.prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      include: {
        book: true,
      },
    });

    if (!userBook) {
      throw new NotFoundException('Book is not in current user library');
    }

    const activeLoan = await this.prisma.loan.findFirst({
      where: {
        ownerUserId: userId,
        bookId,
        status: PrismaLoanStatus.active,
      },
      include: {
        borrowerUser: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return this.buildLibraryBookResult({
      book: userBook.book,
      readingStatus: userBook.readingStatus,
      addedAt: userBook.createdAt,
      activeLoan,
    });
  }

  private async lookupByIsbn(isbn: string): Promise<BookLookupResult> {
    const provider = this.providers.find((item) => item.supportsIsbn());
    if (!provider) {
      throw new UnprocessableEntityException(
        'No provider supports ISBN lookup',
      );
    }

    this.logger.log(`ISBN lookup via ${provider.name}: ${isbn}`);
    try {
      return this.normalizeLookupResult(await provider.lookupByIsbn!(isbn));
    } catch (error) {
      this.logger.warn(`ISBN lookup failed via ${provider.name}: ${isbn}`);
      throw error;
    }
  }

  private async lookupByUrl(url: string): Promise<BookLookupResult> {
    const provider = this.providers.find((item) => item.supportsUrl(url));
    if (!provider) {
      throw new UnprocessableEntityException(
        `Unsupported URL. Supported sources: ${this.getSupportedSources().join(', ')}`,
      );
    }

    this.logger.log(`URL lookup via ${provider.name}: ${url}`);
    try {
      return this.normalizeLookupResult(await provider.lookupByUrl!(url));
    } catch (error) {
      this.logger.warn(`URL lookup failed via ${provider.name}: ${url}`);
      throw error;
    }
  }

  private normalizeLookupResult(result: BookLookupResult): BookLookupResult {
    return {
      ...result,
      authors: Array.isArray(result.authors)
        ? result.authors.filter(Boolean)
        : [],
      coverUrl: result.coverUrl?.trim() || undefined,
      description: result.description?.trim() || undefined,
      isbn: result.isbn?.trim() || undefined,
      sourceUrl: result.sourceUrl.trim(),
    };
  }

  private isRussianResult(result: BookLookupResult): boolean {
    const language = result.language?.toLowerCase();
    if (!language) {
      return this.containsCyrillic([result.title, ...result.authors].join(' '));
    }

    if (
      language.includes('рус') ||
      language.includes('russian') ||
      language === 'ru' ||
      language === 'rus'
    ) {
      return true;
    }

    return this.containsCyrillic([result.title, ...result.authors].join(' '));
  }

  private containsCyrillic(value: string): boolean {
    return /[\u0400-\u04FF]/.test(value);
  }

  private buildCanonicalKey(result: BookLookupResult): string {
    const isbn = result.isbn?.trim().toLowerCase();
    if (isbn) {
      return `isbn:${isbn}`;
    }

    const sourceUrl = result.sourceUrl.trim().toLowerCase();
    if (sourceUrl) {
      return `url:${result.sourceName.toLowerCase()}:${sourceUrl}`;
    }

    const authors = result.authors
      .map((author) => author.trim().toLowerCase())
      .sort()
      .join('|');
    const title = result.title.trim().toLowerCase();

    return `title:${title}|authors:${authors}`;
  }

  private toSourceName(value: string): BookLookupResult['sourceName'] {
    if (value === 'OpenLibrary' || value === 'LitRes') {
      return value;
    }

    return 'OpenLibrary';
  }

  private toReadingStatus(value: string): ReadingStatus {
    if (value === 'unread' || value === 'reading' || value === 'read') {
      return value;
    }

    return 'unread';
  }

  private mapActiveLoan(
    loan?: {
      id: number;
      ownerUserId: number;
      borrowerUserId: number | null;
      borrowerName: string;
      lentAt: Date;
      dueAt: Date | null;
      returnedAt: Date | null;
      status: string;
      borrowerUser?: {
        id: number;
        name: string;
        avatarUrl: string | null;
      } | null;
    } | null,
  ): LibraryBookResult['activeLoan'] {
    if (!loan) {
      return undefined;
    }

    const uxState = deriveLoanUxState({
      status: loan.status,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
    });

    return {
      id: loan.id,
      ownerUserId: loan.ownerUserId,
      borrowerUserId: loan.borrowerUserId ?? undefined,
      borrowerName: loan.borrowerUser?.name || loan.borrowerName,
      borrowerUserName: loan.borrowerUser?.name ?? undefined,
      borrowerAvatarUrl: loan.borrowerUser?.avatarUrl ?? undefined,
      lentAt: loan.lentAt.toISOString(),
      dueAt: loan.dueAt?.toISOString(),
      returnedAt: loan.returnedAt?.toISOString(),
      status: loan.status === 'returned' ? 'returned' : 'active',
      isOverdue: uxState.isOverdue,
      daysLeft: uxState.daysLeft,
      daysOverdue: uxState.daysOverdue,
      dueState: uxState.dueState,
    };
  }

  private buildLibraryBookResult(input: {
    book: {
      id: number;
      title: string;
      authors: string[];
      coverUrl: string | null;
      description: string | null;
      isbn: string | null;
      language: string | null;
      year: number | null;
      sourceName: string;
      sourceUrl: string;
    };
    readingStatus: string;
    addedAt?: Date;
    activeLoan?: {
      id: number;
      ownerUserId: number;
      borrowerUserId: number | null;
      borrowerName: string;
      lentAt: Date;
      dueAt: Date | null;
      returnedAt: Date | null;
      status: string;
      borrowerUser?: {
        id: number;
        name: string;
        avatarUrl: string | null;
      } | null;
    } | null;
    wasAlreadyInLibrary?: boolean;
  }): LibraryBookResult {
    const normalizedReadingStatus = this.toReadingStatus(input.readingStatus);
    const authors = Array.isArray(input.book.authors)
      ? input.book.authors.filter(Boolean)
      : [];
    const activeLoan = this.mapActiveLoan(input.activeLoan);

    return {
      bookId: input.book.id,
      readingStatus: normalizedReadingStatus,
      title: input.book.title,
      authors,
      coverUrl: input.book.coverUrl ?? undefined,
      description: input.book.description ?? undefined,
      isbn: input.book.isbn ?? undefined,
      year: input.book.year ?? undefined,
      language: input.book.language ?? undefined,
      sourceName: this.toSourceName(input.book.sourceName),
      sourceUrl: input.book.sourceUrl,
      addedAt: input.addedAt?.toISOString(),
      activeLoan,
      isLent: activeLoan?.status === 'active',
      isAvailable: !activeLoan || activeLoan.status !== 'active',
      hasSourceLink: Boolean(input.book.sourceUrl),
      displayAuthor: authors.join(', '),
      displayStatus: getReadingStatusLabel(normalizedReadingStatus),
      wasAlreadyInLibrary: input.wasAlreadyInLibrary,
    };
  }
}
