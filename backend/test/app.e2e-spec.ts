import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import type { Response } from 'supertest';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

type AuthSuccessBody = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: number;
  };
};

type HealthBody = {
  status: string;
  database: string;
};

type LoanBody = {
  id: number;
  status: string;
  isOverdue?: boolean;
  dueState?: string;
  daysLeft?: number;
  daysOverdue?: number;
  borrower?: {
    userId?: number;
    name: string;
  };
  book: {
    bookId: number;
  };
  activeLoan?: {
    id: number;
    status: string;
    isOverdue?: boolean;
    dueState?: string;
  };
};

type LoanRequestBody = {
  id: number;
  status: string;
  canApprove?: boolean;
  canReject?: boolean;
  resolutionLabel?: string;
  approvedLoanId?: number;
  owner: {
    userId: number;
  };
  requester: {
    userId: number;
  };
};

type LibraryBookBody = {
  bookId: number;
  title?: string;
  authors?: string[];
  isbn?: string;
  pagesCount?: number;
  year?: number;
  genre?: string;
  sourceName?: string;
  sourceUrl?: string;
  readingStatus?: string;
  storeLinks?: { name: string; url: string }[];
  hasSourceLink?: boolean;
  wasAlreadyInLibrary?: boolean;
  isAvailable?: boolean;
  isLent?: boolean;
  activeLoan?: {
    id: number;
    status: string;
    isOverdue?: boolean;
    dueState?: string;
  };
};

function getBody<T>(response: Response): T {
  return response.body as unknown as T;
}

function getBodyArray<T>(response: Response): T[] {
  return response.body as unknown as T[];
}

describe('Housebook API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let accessToken = '';
  let createdUserId = 0;
  let createdBookId = 0;
  let createdRequestBookId = 0;
  let createdEmptyUserId = 0;
  let createdFreshRegisteredUserId = 0;
  let createdUpcomingBookId = 0;
  let createdNoDueBookId = 0;
  let createdManualBookId = 0;

  const suffix = `e2e-${Date.now()}`;
  const initialEmail = `reader-${suffix}@housebook.local`;
  const emptyEmail = `empty-${suffix}@housebook.local`;
  const freshRegisteredEmail = `fresh-${suffix}@housebook.local`;
  const password = 'password123';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);

    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'E2E Reader',
        email: initialEmail,
        password,
      })
      .expect(201);

    const registerBody = getBody<AuthSuccessBody>(registerResponse);
    accessToken = registerBody.accessToken;
    createdUserId = registerBody.user.id;

    const passwordHash = await bcrypt.hash(password, 10);
    const emptyUser = await prisma.user.create({
      data: {
        email: emptyEmail,
        name: 'Empty Shelf',
        passwordHash,
      },
    });
    createdEmptyUserId = emptyUser.id;

    const book = await prisma.book.create({
      data: {
        canonicalKey: `isbn:${suffix}`,
        title: 'Integration Testing Handbook',
        authors: ['Test Runner'],
        description: 'A synthetic book created by the e2e suite.',
        isbn: suffix,
        language: 'English',
        year: 2026,
        sourceName: 'OpenLibrary',
        sourceUrl: `https://openlibrary.org/isbn/${suffix}`,
      },
    });
    createdBookId = book.id;

    const requestBook = await prisma.book.create({
      data: {
        canonicalKey: `request-isbn:${suffix}`,
        title: 'Requested Book',
        authors: ['Request Runner'],
        description: 'A synthetic book reserved for loan-request tests.',
        isbn: `request-${suffix}`,
        language: 'English',
        year: 2026,
        sourceName: 'OpenLibrary',
        sourceUrl: `https://openlibrary.org/isbn/request-${suffix}`,
      },
    });
    createdRequestBookId = requestBook.id;

    const upcomingBook = await prisma.book.create({
      data: {
        canonicalKey: `upcoming-isbn:${suffix}`,
        title: 'Upcoming Loan Book',
        authors: ['Schedule Runner'],
        description: 'A synthetic book reserved for urgency sorting tests.',
        isbn: `upcoming-${suffix}`,
        language: 'English',
        year: 2026,
        sourceName: 'OpenLibrary',
        sourceUrl: `https://openlibrary.org/isbn/upcoming-${suffix}`,
      },
    });
    createdUpcomingBookId = upcomingBook.id;

    const noDueBook = await prisma.book.create({
      data: {
        canonicalKey: `nodule-isbn:${suffix}`,
        title: 'No Due Date Loan Book',
        authors: ['Loose Runner'],
        description: 'A synthetic book without due date.',
        isbn: `nodule-${suffix}`,
        language: 'English',
        year: 2026,
        sourceName: 'OpenLibrary',
        sourceUrl: `https://openlibrary.org/isbn/nodule-${suffix}`,
      },
    });
    createdNoDueBookId = noDueBook.id;

    await prisma.userBook.create({
      data: {
        userId: createdUserId,
        bookId: createdBookId,
        readingStatus: 'reading',
      },
    });

    await prisma.userBook.create({
      data: {
        userId: createdUserId,
        bookId: createdRequestBookId,
        readingStatus: 'unread',
      },
    });

    await prisma.userBook.createMany({
      data: [
        {
          userId: createdUserId,
          bookId: createdUpcomingBookId,
          readingStatus: 'unread',
        },
        {
          userId: createdUserId,
          bookId: createdNoDueBookId,
          readingStatus: 'unread',
        },
      ],
    });
  });

  afterAll(async () => {
    await prisma.userBook.deleteMany({
      where: {
        OR: [
          { userId: createdUserId },
          { userId: createdEmptyUserId },
          { bookId: createdBookId },
          { bookId: createdRequestBookId },
          { bookId: createdUpcomingBookId },
          { bookId: createdNoDueBookId },
          { bookId: createdManualBookId },
        ],
      },
    });
    await prisma.loanRequest.deleteMany({
      where: {
        OR: [
          { bookId: createdBookId },
          { bookId: createdRequestBookId },
          { bookId: createdUpcomingBookId },
          { bookId: createdNoDueBookId },
          { bookId: createdManualBookId },
        ],
      },
    });
    await prisma.book.deleteMany({
      where: {
        id: {
          in: [
            createdBookId,
            createdRequestBookId,
            createdUpcomingBookId,
            createdNoDueBookId,
            createdManualBookId,
          ],
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            initialEmail,
            emptyEmail,
            freshRegisteredEmail,
            `updated-${suffix}@housebook.local`,
          ],
        },
      },
    });

    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((response) => {
        const body = getBody<HealthBody>(response);
        expect(body.status).toBe('ok');
        expect(body.database).toBe('connected');
      });
  });

  it('/auth/register (POST) creates a truly empty new user', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Fresh Reader',
        email: freshRegisteredEmail,
        password,
      })
      .expect(201);

    const registerBody = getBody<AuthSuccessBody>(registerResponse);
    createdFreshRegisteredUserId = registerBody.user.id;

    expect(registerResponse.body.user).toEqual(
      expect.objectContaining({
        id: createdFreshRegisteredUserId,
        email: freshRegisteredEmail,
        name: 'Fresh Reader',
        avatarUrl: null,
        bio: null,
        role: 'USER',
      }),
    );

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200)
      .expect((response) => {
        expect(response.body).toEqual(
          expect.objectContaining({
            id: createdFreshRegisteredUserId,
            email: freshRegisteredEmail,
            name: 'Fresh Reader',
            avatarUrl: null,
            bio: null,
            role: 'USER',
          }),
        );
      });

    await request(app.getHttpServer())
      .get('/books/library')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get('/loans/outgoing')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get('/loans/incoming')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get('/loan-requests/incoming')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get('/loan-requests/outgoing')
      .set('Authorization', `Bearer ${registerBody.accessToken}`)
      .expect(200)
      .expect([]);

    await request(app.getHttpServer())
      .get('/users/community')
      .expect(200)
      .expect((response) => {
        expect(response.body).not.toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              id: createdFreshRegisteredUserId,
            }),
          ]),
        );
      });
  });

  it('/users/community (GET) returns only users with books', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/community')
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdUserId,
          name: 'E2E Reader',
          booksCount: 4,
        }),
      ]),
    );
    expect(response.body).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdEmptyUserId,
        }),
      ]),
    );
  });

  it('/users/:userId/library (GET) returns public library and 404 for missing user', async () => {
    const libraryResponse = await request(app.getHttpServer())
      .get(`/users/${createdUserId}/library`)
      .expect(200);

    expect(libraryResponse.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookId: createdBookId,
          title: 'Integration Testing Handbook',
          readingStatus: 'reading',
          displayStatus: 'Читаю',
          displayAuthor: 'Test Runner',
          hasSourceLink: true,
          isAvailable: true,
          isLent: false,
        }),
      ]),
    );

    await request(app.getHttpServer()).get('/users/999999/library').expect(404);
  });

  it('/users/me (PATCH) updates basic profile fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Updated Reader',
        email: `updated-${suffix}@housebook.local`,
        bio: 'Updated from e2e test',
        avatarUrl: 'https://example.com/e2e-avatar.jpg',
      })
      .expect(200);

    expect(response.body).toEqual(
      expect.objectContaining({
        id: createdUserId,
        name: 'Updated Reader',
        email: `updated-${suffix}@housebook.local`,
        bio: 'Updated from e2e test',
        avatarUrl: 'https://example.com/e2e-avatar.jpg',
      }),
    );
  });

  it('/books/library (GET) keeps existing private library flow working', async () => {
    const response = await request(app.getHttpServer())
      .get('/books/library')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(response.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookId: createdBookId,
          title: 'Integration Testing Handbook',
          readingStatus: 'reading',
          displayStatus: 'Читаю',
          displayAuthor: 'Test Runner',
          hasSourceLink: true,
          isAvailable: true,
          isLent: false,
        }),
      ]),
    );
  });

  it('/books/library/manual (POST) creates a form-filled book in current user library', async () => {
    const createResponse = await request(app.getHttpServer())
      .post('/books/library/manual')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Manual Form Book',
        author: 'Form Author',
        isbn: `manual-${suffix}`,
        description: 'Created from a frontend form without external lookup.',
        coverUrl: 'https://example.com/manual-cover.jpg',
        pagesCount: 321,
        year: 2026,
        genre: 'Практика',
        language: 'Russian',
        readingStatus: 'reading',
        storeLinks: [
          {
            name: 'Local shop',
            url: 'https://example.com/books/manual-form-book',
          },
        ],
      })
      .expect(201);
    const createdBook = getBody<LibraryBookBody>(createResponse);
    createdManualBookId = createdBook.bookId;

    expect(createdBook).toEqual(
      expect.objectContaining({
        title: 'Manual Form Book',
        authors: ['Form Author'],
        isbn: `manual-${suffix}`,
        description: 'Created from a frontend form without external lookup.',
        coverUrl: 'https://example.com/manual-cover.jpg',
        pagesCount: 321,
        year: 2026,
        genre: 'Практика',
        language: 'Russian',
        readingStatus: 'reading',
        sourceName: 'Manual',
        sourceUrl: 'https://example.com/books/manual-form-book',
        hasSourceLink: true,
        displayAuthor: 'Form Author',
        displayStatus: 'Читаю',
        isAvailable: true,
        isLent: false,
        wasAlreadyInLibrary: false,
      }),
    );
    expect(createdBook.storeLinks).toEqual([
      {
        name: 'Local shop',
        url: 'https://example.com/books/manual-form-book',
      },
    ]);

    const duplicateResponse = await request(app.getHttpServer())
      .post('/books/library/manual')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Manual Form Book',
        author: 'Form Author',
        isbn: `manual-${suffix}`,
        readingStatus: 'read',
      })
      .expect(201);
    const duplicateBook = getBody<LibraryBookBody>(duplicateResponse);

    expect(duplicateBook.bookId).toBe(createdManualBookId);
    expect(duplicateBook.wasAlreadyInLibrary).toBe(true);
    expect(duplicateBook.readingStatus).toBe('read');

    const libraryResponse = await request(app.getHttpServer())
      .get('/books/library')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const libraryBooks = getBodyArray<LibraryBookBody>(libraryResponse);

    expect(libraryBooks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookId: createdManualBookId,
          title: 'Manual Form Book',
          readingStatus: 'read',
          sourceName: 'Manual',
        }),
      ]),
    );
  });

  it('/loans flow creates outgoing/incoming loan and allows return', async () => {
    const now = new Date();
    const overdueDueAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 2,
        12,
        0,
        0,
      ),
    ).toISOString();
    const overdueLentAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - 5,
        12,
        0,
        0,
      ),
    ).toISOString();
    const upcomingDueAt = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 3,
        12,
        0,
        0,
      ),
    ).toISOString();

    const createResponse = await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bookId: createdBookId,
        borrowerUserId: createdEmptyUserId,
        lentAt: overdueLentAt,
        dueAt: overdueDueAt,
      })
      .expect(201);
    const createdLoan = getBody<LoanBody>(createResponse);

    expect(createdLoan.status).toBe('active');
    expect(createdLoan.borrower).toEqual(
      expect.objectContaining({
        userId: createdEmptyUserId,
        name: 'Empty Shelf',
      }),
    );
    expect(createdLoan.book.bookId).toBe(createdBookId);
    expect(createdLoan.isOverdue).toBe(true);
    expect(createdLoan.dueState).toBe('overdue');

    await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bookId: createdUpcomingBookId,
        borrowerUserId: createdEmptyUserId,
        dueAt: upcomingDueAt,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        bookId: createdNoDueBookId,
        borrowerUserId: createdEmptyUserId,
      })
      .expect(201);

    const outgoingResponse = await request(app.getHttpServer())
      .get('/loans/outgoing')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const outgoingLoans = getBodyArray<LoanBody>(outgoingResponse);

    expect(outgoingLoans[0].id).toBe(createdLoan.id);
    expect(outgoingLoans[0].status).toBe('active');
    expect(outgoingLoans[0].isOverdue).toBe(true);
    expect(outgoingLoans[0].dueState).toBe('overdue');
    expect(typeof outgoingLoans[0].daysOverdue).toBe('number');

    expect(outgoingLoans[1].book.bookId).toBe(createdUpcomingBookId);
    expect(outgoingLoans[1].dueState).toBe('upcoming');
    expect(typeof outgoingLoans[1].daysLeft).toBe('number');

    expect(outgoingLoans[2].book.bookId).toBe(createdNoDueBookId);
    expect(outgoingLoans[2].dueState).toBe('none');
    expect(outgoingLoans[2].isOverdue).toBe(false);

    const borrowerLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: emptyEmail,
        password,
      })
      .expect(200);
    const borrowerLoginBody = getBody<AuthSuccessBody>(borrowerLogin);

    const incomingResponse = await request(app.getHttpServer())
      .get('/loans/incoming')
      .set('Authorization', `Bearer ${borrowerLoginBody.accessToken}`)
      .expect(200);
    const incomingLoans = getBodyArray<LoanBody>(incomingResponse);

    expect(incomingLoans).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdLoan.id,
          status: 'active',
        }),
      ]),
    );

    const libraryWithLoan = await request(app.getHttpServer())
      .get('/books/library')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const libraryBooks = getBodyArray<LibraryBookBody>(libraryWithLoan);

    const libraryBookWithLoan = libraryBooks.find(
      (book) => book.bookId === createdBookId,
    );
    expect(libraryBookWithLoan).toBeDefined();
    expect(libraryBookWithLoan?.activeLoan?.id).toBe(createdLoan.id);
    expect(libraryBookWithLoan?.activeLoan?.status).toBe('active');
    expect(libraryBookWithLoan?.activeLoan?.isOverdue).toBe(true);
    expect(libraryBookWithLoan?.activeLoan?.dueState).toBe('overdue');
    expect(libraryBookWithLoan?.isAvailable).toBe(false);
    expect(libraryBookWithLoan?.isLent).toBe(true);

    await request(app.getHttpServer())
      .patch(`/loans/${createdLoan.id}/return`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = getBody<LoanBody>(response);
        expect(body.status).toBe('returned');
      });
  });

  it('/loan-requests flow creates incoming/outgoing request and approves it into a loan', async () => {
    const requesterLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: emptyEmail,
        password,
      })
      .expect(200);
    const requesterLoginBody = getBody<AuthSuccessBody>(requesterLogin);

    const createRequestResponse = await request(app.getHttpServer())
      .post('/loan-requests')
      .set('Authorization', `Bearer ${requesterLoginBody.accessToken}`)
      .send({
        ownerUserId: createdUserId,
        bookId: createdRequestBookId,
        message: 'Можно взять эту книгу?',
      })
      .expect(201);
    const createdRequest = getBody<LoanRequestBody>(createRequestResponse);

    expect(createdRequest.status).toBe('pending');
    expect(createdRequest.canApprove).toBe(false);
    expect(createdRequest.canReject).toBe(false);
    expect(createdRequest.resolutionLabel).toBe('Ожидает решения');
    expect(createdRequest.owner.userId).toBe(createdUserId);
    expect(createdRequest.requester.userId).toBe(createdEmptyUserId);

    const incomingRequestsResponse = await request(app.getHttpServer())
      .get('/loan-requests/incoming')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const incomingRequests = getBodyArray<LoanRequestBody>(
      incomingRequestsResponse,
    );

    expect(incomingRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdRequest.id,
          status: 'pending',
          canApprove: true,
          canReject: true,
        }),
      ]),
    );

    const approveResponse = await request(app.getHttpServer())
      .patch(`/loan-requests/${createdRequest.id}/approve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dueAt: '2026-05-01T12:00:00.000Z',
      })
      .expect(200);
    const approvedRequest = getBody<LoanRequestBody>(approveResponse);

    expect(approvedRequest.id).toBe(createdRequest.id);
    expect(approvedRequest.status).toBe('approved');
    expect(approvedRequest.canApprove).toBe(false);
    expect(approvedRequest.canReject).toBe(false);
    expect(approvedRequest.resolutionLabel).toBe('Подтвержден');
    expect(typeof approvedRequest.approvedLoanId).toBe('number');

    const repeatApproveResponse = await request(app.getHttpServer())
      .patch(`/loan-requests/${createdRequest.id}/approve`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dueAt: '2026-05-01T12:00:00.000Z',
      })
      .expect(200);
    const repeatedApprovedRequest = getBody<LoanRequestBody>(
      repeatApproveResponse,
    );

    expect(repeatedApprovedRequest.id).toBe(createdRequest.id);
    expect(repeatedApprovedRequest.status).toBe('approved');
    expect(repeatedApprovedRequest.approvedLoanId).toBe(
      approvedRequest.approvedLoanId,
    );

    const borrowerLibraryAfterApproveResponse = await request(app.getHttpServer())
      .get('/books/library')
      .set('Authorization', `Bearer ${requesterLoginBody.accessToken}`)
      .expect(200);
    const borrowerLibraryAfterApprove = getBodyArray<LibraryBookBody>(
      borrowerLibraryAfterApproveResponse,
    );

    expect(borrowerLibraryAfterApprove).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookId: createdRequestBookId,
        }),
      ]),
    );

    const borrowerIncomingLoansResponse = await request(app.getHttpServer())
      .get('/loans/incoming')
      .set('Authorization', `Bearer ${requesterLoginBody.accessToken}`)
      .expect(200);
    const borrowerIncomingLoans = getBodyArray<LoanBody>(
      borrowerIncomingLoansResponse,
    );

    const approvedBorrowerLoan = borrowerIncomingLoans.find(
      (loan) => loan.book.bookId === createdRequestBookId,
    );
    expect(approvedBorrowerLoan).toBeDefined();
    expect(approvedBorrowerLoan?.status).toBe('active');

    await request(app.getHttpServer())
      .patch(`/loans/${approvedRequest.approvedLoanId}/return`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((response) => {
        const body = getBody<LoanBody>(response);
        expect(body.status).toBe('returned');
      });

    const borrowerLibraryAfterReturnResponse = await request(app.getHttpServer())
      .get('/books/library')
      .set('Authorization', `Bearer ${requesterLoginBody.accessToken}`)
      .expect(200);
    const borrowerLibraryAfterReturn = getBodyArray<LibraryBookBody>(
      borrowerLibraryAfterReturnResponse,
    );

    expect(borrowerLibraryAfterReturn).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          bookId: createdRequestBookId,
        }),
      ]),
    );
  });
});
