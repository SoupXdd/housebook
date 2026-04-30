import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { LoanRequestStatus, LoanStatus } from '@prisma/client/index';
import { PrismaService } from '../prisma/prisma.service';
import { ApproveLoanRequestDto } from './dto/approve-loan-request.dto';
import { CreateLoanRequestDto } from './dto/create-loan-request.dto';
import type { LoanRequestResult } from './types/loan-request-result.type';

@Injectable()
export class LoanRequestsService {
  private readonly logger = new Logger(LoanRequestsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createRequest(
    requesterUserId: number,
    dto: CreateLoanRequestDto,
  ): Promise<LoanRequestResult> {
    if (requesterUserId === dto.ownerUserId) {
      throw new BadRequestException('You cannot request your own book');
    }

    const ownerBook = await this.prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: dto.ownerUserId,
          bookId: dto.bookId,
        },
      },
      include: {
        book: true,
      },
    });

    if (!ownerBook) {
      throw new NotFoundException('Book is not in owner library');
    }

    const activeLoan = await this.prisma.loan.findFirst({
      where: {
        ownerUserId: dto.ownerUserId,
        bookId: dto.bookId,
        status: LoanStatus.active,
      },
    });

    if (activeLoan) {
      throw new BadRequestException('Book is currently unavailable');
    }

    const existingPending = await this.prisma.loanRequest.findFirst({
      where: {
        ownerUserId: dto.ownerUserId,
        requesterUserId,
        bookId: dto.bookId,
        status: LoanRequestStatus.pending,
      },
    });

    if (existingPending) {
      throw new BadRequestException(
        'You already have a pending request for this book',
      );
    }

    const request = await this.prisma.loanRequest.create({
      data: {
        ownerUserId: dto.ownerUserId,
        requesterUserId,
        bookId: dto.bookId,
        message: dto.message?.trim() || null,
      },
      include: this.requestInclude,
    });

    return this.mapRequestResult(request, {
      canApprove: false,
      canReject: false,
    });
  }

  async getIncomingRequests(userId: number): Promise<LoanRequestResult[]> {
    const requests = await this.prisma.loanRequest.findMany({
      where: {
        ownerUserId: userId,
      },
      include: this.requestInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return requests.map((request) =>
      this.mapRequestResult(request, {
        canApprove: request.status === LoanRequestStatus.pending,
        canReject: request.status === LoanRequestStatus.pending,
      }),
    );
  }

  async getOutgoingRequests(userId: number): Promise<LoanRequestResult[]> {
    const requests = await this.prisma.loanRequest.findMany({
      where: {
        requesterUserId: userId,
      },
      include: this.requestInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return requests.map((request) =>
      this.mapRequestResult(request, {
        canApprove: false,
        canReject: false,
      }),
    );
  }

  async approveRequest(
    ownerUserId: number,
    requestId: number,
    dto: ApproveLoanRequestDto,
  ): Promise<LoanRequestResult> {
    const request = await this.prisma.loanRequest.findUnique({
      where: { id: requestId },
      include: this.requestInclude,
    });

    if (!request) {
      throw new NotFoundException('Loan request not found');
    }

    if (request.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('You cannot approve this request');
    }

    if (request.status !== LoanRequestStatus.pending) {
      return this.mapResolvedRequestResult(request);
    }

    const ownerBook = await this.prisma.userBook.findUnique({
      where: {
        userId_bookId: {
          userId: ownerUserId,
          bookId: request.book.id,
        },
      },
    });

    if (!ownerBook) {
      throw new BadRequestException(
        'The owner no longer has this book in the library',
      );
    }

    const activeLoan = await this.prisma.loan.findFirst({
      where: {
        ownerUserId,
        bookId: request.book.id,
        status: LoanStatus.active,
      },
    });

    if (activeLoan) {
      this.logger.warn(
        `Loan request ${requestId} cannot be approved because book ${request.book.id} is already lent`,
      );
      throw new BadRequestException('Book is already lent out');
    }

    const dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dueAt && Number.isNaN(dueAt.getTime())) {
      throw new BadRequestException('Invalid dueAt date');
    }

    const updatedRequest = await this.prisma.$transaction(async (tx) => {
      const requesterAlreadyHadBook = await tx.userBook.findUnique({
        where: {
          userId_bookId: {
            userId: request.requesterUserId,
            bookId: request.book.id,
          },
        },
      });

      if (!requesterAlreadyHadBook) {
        await tx.userBook.create({
          data: {
            userId: request.requesterUserId,
            bookId: request.book.id,
            readingStatus: 'unread',
          },
        });
      }

      const createdLoan = await tx.loan.create({
        data: {
          ownerUserId,
          borrowerUserId: request.requesterUserId,
          borrowerName: request.requesterUser.name,
          bookId: request.book.id,
          loanRequestId: request.id,
          borrowerLibraryAdded: !requesterAlreadyHadBook,
          dueAt,
        },
      });

      const approvedRequest = await tx.loanRequest.update({
        where: { id: requestId },
        data: {
          status: LoanRequestStatus.approved,
        },
        include: this.requestInclude,
      });

      return {
        request: approvedRequest,
        approvedLoanId: createdLoan.id,
      };
    });

    return this.mapRequestResult(updatedRequest.request, {
      canApprove: false,
      canReject: false,
      approvedLoanId: updatedRequest.approvedLoanId,
    });
  }

  async rejectRequest(
    ownerUserId: number,
    requestId: number,
  ): Promise<LoanRequestResult> {
    const request = await this.prisma.loanRequest.findUnique({
      where: { id: requestId },
      include: this.requestInclude,
    });

    if (!request) {
      throw new NotFoundException('Loan request not found');
    }

    if (request.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('You cannot reject this request');
    }

    if (request.status !== LoanRequestStatus.pending) {
      return this.mapResolvedRequestResult(request);
    }

    const updated = await this.prisma.loanRequest.update({
      where: { id: requestId },
      data: {
        status: LoanRequestStatus.rejected,
      },
      include: this.requestInclude,
    });

    return this.mapRequestResult(updated, {
      canApprove: false,
      canReject: false,
    });
  }

  private readonly requestInclude = {
    ownerUser: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
    requesterUser: {
      select: {
        id: true,
        name: true,
        avatarUrl: true,
      },
    },
    book: {
      select: {
        id: true,
        title: true,
        authors: true,
        coverUrl: true,
        isbn: true,
      },
    },
  } as const;

  private mapRequestResult(
    request: {
      id: number;
      status: LoanRequestStatus;
      message: string | null;
      createdAt: Date;
      updatedAt: Date;
      ownerUser: {
        id: number;
        name: string;
        avatarUrl: string | null;
      };
      requesterUser: {
        id: number;
        name: string;
        avatarUrl: string | null;
      };
      book: {
        id: number;
        title: string;
        authors: string[];
        coverUrl: string | null;
        isbn: string | null;
      };
    },
    options?: {
      canApprove?: boolean;
      canReject?: boolean;
      approvedLoanId?: number;
    },
  ): LoanRequestResult {
    return {
      id: request.id,
      status: request.status,
      message: request.message ?? undefined,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      canApprove: options?.canApprove,
      canReject: options?.canReject,
      resolutionLabel: this.getResolutionLabel(request.status),
      approvedLoanId: options?.approvedLoanId,
      owner: {
        userId: request.ownerUser.id,
        name: request.ownerUser.name,
        avatarUrl: request.ownerUser.avatarUrl ?? undefined,
      },
      requester: {
        userId: request.requesterUser.id,
        name: request.requesterUser.name,
        avatarUrl: request.requesterUser.avatarUrl ?? undefined,
      },
      book: {
        bookId: request.book.id,
        title: request.book.title,
        authors: request.book.authors,
        coverUrl: request.book.coverUrl ?? undefined,
        isbn: request.book.isbn ?? undefined,
      },
    };
  }

  private async mapResolvedRequestResult(request: {
    id: number;
    status: LoanRequestStatus;
    message: string | null;
    createdAt: Date;
    updatedAt: Date;
    ownerUserId: number;
    requesterUserId: number;
    ownerUser: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
    requesterUser: {
      id: number;
      name: string;
      avatarUrl: string | null;
    };
    book: {
      id: number;
      title: string;
      authors: string[];
      coverUrl: string | null;
      isbn: string | null;
    };
  }): Promise<LoanRequestResult> {
    const approvedLoan =
      request.status === LoanRequestStatus.approved
        ? await this.prisma.loan.findFirst({
            where: {
              OR: [
                { loanRequestId: request.id },
                {
                  ownerUserId: request.ownerUserId,
                  borrowerUserId: request.requesterUserId,
                  bookId: request.book.id,
                },
              ],
            },
            orderBy: { createdAt: 'desc' },
          })
        : null;

    return this.mapRequestResult(request, {
      canApprove: false,
      canReject: false,
      approvedLoanId: approvedLoan?.id,
    });
  }

  private getResolutionLabel(status: LoanRequestStatus): string {
    if (status === LoanRequestStatus.approved) {
      return 'Подтвержден';
    }
    if (status === LoanRequestStatus.rejected) {
      return 'Отклонен';
    }
    return 'Ожидает решения';
  }
}
