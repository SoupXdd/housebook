import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { PrismaClient, ReadingStatus, Role } from '@prisma/client/index';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not set');
}

const pool = new Pool({ connectionString });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

type SeedUser = {
  email: string;
  name: string;
  password: string;
  role: Role;
  avatarUrl?: string;
  bio?: string;
};

type SeedBook = {
  canonicalKey: string;
  title: string;
  authors: string[];
  coverUrl?: string;
  description?: string;
  isbn?: string;
  language?: string;
  year?: number;
  sourceName: string;
  sourceUrl: string;
};

type SeedLibraryEntry = {
  userEmail: string;
  canonicalKey: string;
  readingStatus: ReadingStatus;
  createdAt: Date;
};

type SeedLoanEntry = {
  ownerEmail: string;
  borrowerEmail?: string;
  borrowerName: string;
  canonicalKey: string;
  lentAt: Date;
  dueAt?: Date;
  status?: 'active' | 'returned';
  returnedAt?: Date;
};

type SeedLoanRequestEntry = {
  ownerEmail: string;
  requesterEmail: string;
  canonicalKey: string;
  message?: string;
  status?: 'pending' | 'approved' | 'rejected';
};

const users: SeedUser[] = [
  {
    email: 'demo@housebook.local',
    name: 'Demo Admin',
    password: 'changeme123',
    role: 'ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80',
    bio: 'Демо-администратор проекта. Используется для smoke-тестов и проверки административного доступа.',
  },
  {
    email: 'alexey@housebook.local',
    name: 'Алексей Петров',
    password: 'password123',
    role: 'USER',
    avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=512&q=80',
    bio: 'Собираю домашнюю библиотеку из классики, фантастики и сильного нон-фикшна.',
  },
  {
    email: 'maria@housebook.local',
    name: 'Мария Иванова',
    password: 'password123',
    role: 'USER',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80',
    bio: 'Люблю фэнтези, большие книжные серии и уютные читательские сообщества.',
  },
];

const books: SeedBook[] = [
  {
    canonicalKey: 'isbn:9780140328721',
    title: 'Fantastic Mr. Fox',
    authors: ['Roald Dahl'],
    coverUrl: 'https://covers.openlibrary.org/b/id/15152634-L.jpg',
    description: 'A classic Roald Dahl tale about a clever fox outwitting three farmers.',
    isbn: '9780140328721',
    language: 'English',
    year: 1988,
    sourceName: 'OpenLibrary',
    sourceUrl: 'https://openlibrary.org/isbn/9780140328721',
  },
  {
    canonicalKey: 'isbn:9785171183667',
    title: 'Дюна',
    authors: ['Фрэнк Герберт'],
    coverUrl: 'https://covers.openlibrary.org/b/id/12632416-L.jpg',
    description: 'Эпическая научная фантастика о планете Арракис, власти и пророчестве.',
    isbn: '9785171183667',
    language: 'Russian',
    year: 2022,
    sourceName: 'OpenLibrary',
    sourceUrl: 'https://openlibrary.org/isbn/9785171183667',
  },
  {
    canonicalKey: 'isbn:9785041567225',
    title: 'Мастер и Маргарита',
    authors: ['Михаил Булгаков'],
    coverUrl: 'https://covers.openlibrary.org/b/id/14610359-L.jpg',
    description: 'Роман о любви, свободе и визите Воланда в Москву.',
    isbn: '9785041567225',
    language: 'Russian',
    year: 2023,
    sourceName: 'OpenLibrary',
    sourceUrl: 'https://openlibrary.org/isbn/9785041567225',
  },
  {
    canonicalKey: 'isbn:9785906837643',
    title: 'Sapiens: Краткая история человечества',
    authors: ['Юваль Ной Харари'],
    coverUrl: 'https://covers.openlibrary.org/b/id/10521291-L.jpg',
    description: 'Популярный нон-фикшн о развитии Homo sapiens и цивилизации.',
    isbn: '9785906837643',
    language: 'Russian',
    year: 2019,
    sourceName: 'OpenLibrary',
    sourceUrl: 'https://openlibrary.org/isbn/9785906837643',
  },
  {
    canonicalKey: 'isbn:9785389074351',
    title: 'Гарри Поттер и философский камень',
    authors: ['Дж. К. Роулинг'],
    coverUrl: 'https://covers.openlibrary.org/b/id/10523338-L.jpg',
    description: 'Первая книга о мальчике-волшебнике и школе Хогвартс.',
    isbn: '9785389074351',
    language: 'Russian',
    year: 2021,
    sourceName: 'OpenLibrary',
    sourceUrl: 'https://openlibrary.org/isbn/9785389074351',
  },
  {
    canonicalKey: 'isbn:9785389205502',
    title: 'Атлант расправил плечи',
    authors: ['Айн Рэнд'],
    coverUrl: 'https://covers.openlibrary.org/b/id/12654637-L.jpg',
    description: 'Роман о свободе, ответственности и цене таланта.',
    isbn: '9785389205502',
    language: 'Russian',
    year: 2022,
    sourceName: 'OpenLibrary',
    sourceUrl: 'https://openlibrary.org/isbn/9785389205502',
  },
];

const libraryEntries: SeedLibraryEntry[] = [
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'isbn:9780140328721',
    readingStatus: 'read',
    createdAt: new Date('2026-03-26T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'isbn:9785171183667',
    readingStatus: 'reading',
    createdAt: new Date('2026-03-28T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'isbn:9785041567225',
    readingStatus: 'read',
    createdAt: new Date('2026-03-29T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'isbn:9785906837643',
    readingStatus: 'unread',
    createdAt: new Date('2026-03-31T10:00:00.000Z'),
  },
  {
    userEmail: 'maria@housebook.local',
    canonicalKey: 'isbn:9785389074351',
    readingStatus: 'read',
    createdAt: new Date('2026-03-27T10:00:00.000Z'),
  },
  {
    userEmail: 'maria@housebook.local',
    canonicalKey: 'isbn:9785389205502',
    readingStatus: 'reading',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
  },
];

const loanEntries: SeedLoanEntry[] = [
  {
    ownerEmail: 'alexey@housebook.local',
    borrowerEmail: 'maria@housebook.local',
    borrowerName: 'Мария Иванова',
    canonicalKey: 'isbn:9780140328721',
    lentAt: new Date('2026-04-01T10:00:00.000Z'),
    dueAt: new Date('2026-04-20T10:00:00.000Z'),
    status: 'active',
  },
];

const loanRequestEntries: SeedLoanRequestEntry[] = [
  {
    ownerEmail: 'alexey@housebook.local',
    requesterEmail: 'maria@housebook.local',
    canonicalKey: 'isbn:9785171183667',
    message: 'Можно взять эту книгу на ближайшие две недели?',
    status: 'pending',
  },
];

async function seedUsers() {
  const userIds = new Map<string, number>();

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.password, 10);

    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio ?? null,
      },
      create: {
        email: user.email,
        name: user.name,
        passwordHash,
        role: user.role,
        avatarUrl: user.avatarUrl ?? null,
        bio: user.bio ?? null,
      },
    });

    userIds.set(user.email, savedUser.id);
    console.log(`✓ User seeded: ${savedUser.email}`);
  }

  return userIds;
}

async function seedBooks() {
  const bookIds = new Map<string, number>();

  for (const book of books) {
    const savedBook = await prisma.book.upsert({
      where: { canonicalKey: book.canonicalKey },
      update: {
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        description: book.description,
        isbn: book.isbn,
        language: book.language,
        year: book.year,
        sourceName: book.sourceName,
        sourceUrl: book.sourceUrl,
      },
      create: {
        canonicalKey: book.canonicalKey,
        title: book.title,
        authors: book.authors,
        coverUrl: book.coverUrl,
        description: book.description,
        isbn: book.isbn,
        language: book.language,
        year: book.year,
        sourceName: book.sourceName,
        sourceUrl: book.sourceUrl,
      },
    });

    bookIds.set(book.canonicalKey, savedBook.id);
    console.log(`✓ Book seeded: ${savedBook.title}`);
  }

  return bookIds;
}

async function seedLibraries(userIds: Map<string, number>, bookIds: Map<string, number>) {
  for (const entry of libraryEntries) {
    const userId = userIds.get(entry.userEmail);
    const bookId = bookIds.get(entry.canonicalKey);

    if (!userId || !bookId) {
      throw new Error(`Cannot seed library entry for ${entry.userEmail} / ${entry.canonicalKey}`);
    }

    await prisma.userBook.upsert({
      where: {
        userId_bookId: {
          userId,
          bookId,
        },
      },
      update: {
        readingStatus: entry.readingStatus,
      },
      create: {
        userId,
        bookId,
        readingStatus: entry.readingStatus,
        createdAt: entry.createdAt,
      },
    });
  }

  console.log(`✓ Library entries seeded: ${libraryEntries.length}`);
}

async function seedLoans(userIds: Map<string, number>, bookIds: Map<string, number>) {
  for (const entry of loanEntries) {
    const ownerUserId = userIds.get(entry.ownerEmail);
    const borrowerUserId = entry.borrowerEmail ? userIds.get(entry.borrowerEmail) : undefined;
    const bookId = bookIds.get(entry.canonicalKey);

    if (!ownerUserId || !bookId) {
      throw new Error(`Cannot seed loan for ${entry.ownerEmail} / ${entry.canonicalKey}`);
    }

    const existing = await prisma.loan.findFirst({
      where: {
        ownerUserId,
        bookId,
        borrowerName: entry.borrowerName,
        lentAt: entry.lentAt,
      },
    });

    if (existing) {
      await prisma.loan.update({
        where: { id: existing.id },
        data: {
          borrowerUserId,
          dueAt: entry.dueAt,
          status: entry.status ?? 'active',
          returnedAt: entry.returnedAt,
        },
      });
      continue;
    }

    await prisma.loan.create({
      data: {
        ownerUserId,
        borrowerUserId,
        borrowerName: entry.borrowerName,
        bookId,
        lentAt: entry.lentAt,
        dueAt: entry.dueAt,
        status: entry.status ?? 'active',
        returnedAt: entry.returnedAt,
      },
    });
  }

  console.log(`✓ Loan entries seeded: ${loanEntries.length}`);
}

async function seedLoanRequests(userIds: Map<string, number>, bookIds: Map<string, number>) {
  for (const entry of loanRequestEntries) {
    const ownerUserId = userIds.get(entry.ownerEmail);
    const requesterUserId = userIds.get(entry.requesterEmail);
    const bookId = bookIds.get(entry.canonicalKey);

    if (!ownerUserId || !requesterUserId || !bookId) {
      throw new Error(`Cannot seed loan request for ${entry.requesterEmail} / ${entry.canonicalKey}`);
    }

    const existing = await prisma.loanRequest.findFirst({
      where: {
        ownerUserId,
        requesterUserId,
        bookId,
      },
    });

    if (existing) {
      await prisma.loanRequest.update({
        where: { id: existing.id },
        data: {
          message: entry.message ?? null,
          status: entry.status ?? 'pending',
        },
      });
      continue;
    }

    await prisma.loanRequest.create({
      data: {
        ownerUserId,
        requesterUserId,
        bookId,
        message: entry.message ?? null,
        status: entry.status ?? 'pending',
      },
    });
  }

  console.log(`✓ Loan request entries seeded: ${loanRequestEntries.length}`);
}

async function main() {
  const userIds = await seedUsers();
  const bookIds = await seedBooks();
  await seedLibraries(userIds, bookIds);
  await seedLoans(userIds, bookIds);
  await seedLoanRequests(userIds, bookIds);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
