import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoanStatus } from '@prisma/client/index';
import { PrismaService } from '../prisma/prisma.service';
import { CreateLoanDto } from './dto/create-loan.dto';
import type { LoanResult } from './types/loan-result.type';
import { compareLoansByUrgency, deriveLoanUxState } from './loan-ux';

@Injectable()
export class LoansService {
  constructor(private readonly prisma: PrismaService) {}

  async createLoan(
    ownerUserId: number,
    dto: CreateLoanDto,
  ): Promise<LoanResult> {
    const userBook = await this.prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: ownerUserId,
          bookId: dto.bookId,
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
        ownerUserId,
        bookId: dto.bookId,
        status: LoanStatus.active,
      },
    });

    if (activeLoan) {
      throw new BadRequestException('Book is already marked as lent');
    }

    if (dto.borrowerUserId && dto.borrowerUserId === ownerUserId) {
      throw new BadRequestException('You cannot lend a book to yourself');
    }

    let borrowerUser: {
      id: number;
      name: string;
      avatarUrl: string | null;
    } | null = null;

    if (dto.borrowerUserId) {
      borrowerUser = await this.prisma.user.findUnique({
        where: { id: dto.borrowerUserId },
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      });

      if (!borrowerUser) {
        throw new NotFoundException('Borrower user not found');
      }
    }

    const borrowerName = dto.borrowerName?.trim() || borrowerUser?.name || '';

    if (!borrowerName) {
      throw new BadRequestException('Provide borrowerName or borrowerUserId');
    }

    const lentAt = dto.lentAt ? new Date(dto.lentAt) : new Date();
    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;

    if (Number.isNaN(lentAt.getTime())) {
      throw new BadRequestException('Invalid lentAt date');
    }

    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid dueAt date');
    }

    if (dueAt && dueAt < lentAt) {
      throw new BadRequestException('dueAt cannot be earlier than lentAt');
    }

    const loan = await this.prisma.loan.create({
      data: {
        ownerUserId,
        borrowerUserId: borrowerUser?.id,
        borrowerName,
        bookId: dto.bookId,
        lentAt,
        dueAt,
      },
      include: this.loanInclude,
    });

    return this.mapLoanResult(loan);
  }

  async getOutgoingLoans(userId: number): Promise<LoanResult[]> {
    const loans = await this.prisma.loan.findMany({
      where: {
        ownerUserId: userId,
      },
      include: this.loanInclude,
    });

    return loans
      .sort((left, right) => compareLoansByUrgency(left, right))
      .map((loan) => this.mapLoanResult(loan));
  }

  async getIncomingLoans(userId: number): Promise<LoanResult[]> {
    const loans = await this.prisma.loan.findMany({
      where: {
        borrowerUserId: userId,
      },
      include: this.loanInclude,
    });

    return loans
      .sort((left, right) => compareLoansByUrgency(left, right))
      .map((loan) => this.mapLoanResult(loan));
  }

  async returnLoan(userId: number, loanId: number): Promise<LoanResult> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      include: this.loanInclude,
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    const canUpdate =
      loan.ownerUserId === userId || loan.borrowerUserId === userId;
    if (!canUpdate) {
      throw new ForbiddenException('You cannot update this loan');
    }

    if (loan.status === LoanStatus.returned) {
      return this.mapLoanResult(loan);
    }

    const updated = await this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: LoanStatus.returned,
        returnedAt: new Date(),
      },
      include: this.loanInclude,
    });

    return this.mapLoanResult(updated);
  }

  private readonly loanInclude = {
    book: true,
    ownerUser: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
    borrowerUser: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
  } as const;

  private mapLoanResult(loan: {
    id: number;
    status: LoanStatus;
    lentAt: Date;
    dueAt: Date | null;
    returnedAt: Date | null;
    borrowerName: string;
    book: {
      id: number;
      title: string;
      authors: string[];
      coverUrl: string | null;
      isbn: string | null;
    };
    ownerUser: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
    borrowerUser: {
      id: number;
      name: string;
      avatarUrl: string | null;
    } | null;
  }): LoanResult {
    const uxState = deriveLoanUxState({
      status: loan.status,
      dueAt: loan.dueAt,
      returnedAt: loan.returnedAt,
    });

    return {
      id: loan.id,
      status: loan.status,
      lentAt: loan.lentAt.toISOString(),
      dueAt: loan.dueAt?.toISOString(),
      returnedAt: loan.returnedAt?.toISOString(),
      isOverdue: uxState.isOverdue,
      daysLeft: uxState.daysLeft,
      daysOverdue: uxState.daysOverdue,
      dueState: uxState.dueState,
      owner: {
        userId: loan.ownerUser.id,
        name: loan.ownerUser.name,
        avatarUrl: loan.ownerUser.avatarUrl ?? undefined,
      },
      borrower: {
        userId: loan.borrowerUser?.id,
        name: loan.borrowerUser?.name || loan.borrowerName,
        avatarUrl: loan.borrowerUser?.avatarUrl ?? undefined,
      },
      book: {
        bookId: loan.book.id,
        title: loan.book.title,
        authors: loan.book.authors,
        coverUrl: loan.book.coverUrl ?? undefined,
        isbn: loan.book.isbn ?? undefined,
      },
    };
  }
}
