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
  pagesCount?: number;
  genre?: string;
  storeLinks?: { name: string; url: string }[];
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
    canonicalKey: 'seed:teachings-of-don-juan',
    title: 'Учение Дона Хуана',
    authors: ['Карлос Кастанеда'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780671600419-L.jpg',
    description: 'Пограничная смесь антропологии, мистики и психоделического дневника ученика, который пытается понять мир дона Хуана.',
    isbn: '9780671600419',
    language: 'Russian',
    pagesCount: 320,
    genre: 'Мистика / антропология',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%A3%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%94%D0%BE%D0%BD%D0%B0%20%D0%A5%D1%83%D0%B0%D0%BD%D0%B0' },
      { name: 'Лабиринт', url: 'https://www.labirint.ru/search/%D0%A3%D1%87%D0%B5%D0%BD%D0%B8%D0%B5%20%D0%94%D0%BE%D0%BD%D0%B0%20%D0%A5%D1%83%D0%B0%D0%BD%D0%B0/' },
    ],
    year: 1968,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780671600419',
  },
  {
    canonicalKey: 'seed:1984',
    title: '1984',
    authors: ['Джордж Оруэлл'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780451524935-L.jpg',
    description: 'Холодная антиутопия о наблюдении, языке, страхе и системе, которая хочет владеть не только поступками, но и памятью.',
    isbn: '9780451524935',
    language: 'Russian',
    pagesCount: 328,
    genre: 'Антиутопия',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=1984%20%D0%94%D0%B6%D0%BE%D1%80%D0%B4%D0%B6%20%D0%9E%D1%80%D1%83%D1%8D%D0%BB%D0%BB' },
      { name: 'Читай-город', url: 'https://www.chitai-gorod.ru/search?phrase=1984%20%D0%9E%D1%80%D1%83%D1%8D%D0%BB%D0%BB' },
    ],
    year: 1949,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780451524935',
  },
  {
    canonicalKey: 'seed:fahrenheit-451',
    title: '451 градус по Фаренгейту',
    authors: ['Рэй Брэдбери'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9781451673319-L.jpg',
    description: 'Короткий и злой роман о мире, где книги сжигают, а людей приучают не думать слишком глубоко.',
    isbn: '9781451673319',
    language: 'Russian',
    pagesCount: 256,
    genre: 'Антиутопия',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=451%20%D0%B3%D1%80%D0%B0%D0%B4%D1%83%D1%81%20%D0%BF%D0%BE%20%D0%A4%D0%B0%D1%80%D0%B5%D0%BD%D0%B3%D0%B5%D0%B9%D1%82%D1%83' },
      { name: 'Лабиринт', url: 'https://www.labirint.ru/search/451%20%D0%B3%D1%80%D0%B0%D0%B4%D1%83%D1%81%20%D0%BF%D0%BE%20%D0%A4%D0%B0%D1%80%D0%B5%D0%BD%D0%B3%D0%B5%D0%B9%D1%82%D1%83/' },
    ],
    year: 1953,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9781451673319',
  },
  {
    canonicalKey: 'seed:fight-club',
    title: 'Бойцовский клуб',
    authors: ['Чак Паланик'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780393327342-L.jpg',
    description: 'Грязный, нервный и очень смешной роман о бессоннице, потреблении, мужской злости и клубе, о котором не говорят.',
    isbn: '9780393327342',
    language: 'Russian',
    pagesCount: 224,
    genre: 'Контркультура',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%91%D0%BE%D0%B9%D1%86%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D0%BB%D1%83%D0%B1%20%D0%A7%D0%B0%D0%BA%20%D0%9F%D0%B0%D0%BB%D0%B0%D0%BD%D0%B8%D0%BA' },
      { name: 'Читай-город', url: 'https://www.chitai-gorod.ru/search?phrase=%D0%91%D0%BE%D0%B9%D1%86%D0%BE%D0%B2%D1%81%D0%BA%D0%B8%D0%B9%20%D0%BA%D0%BB%D1%83%D0%B1%20%D0%9F%D0%B0%D0%BB%D0%B0%D0%BD%D0%B8%D0%BA' },
    ],
    year: 1996,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780393327342',
  },
  {
    canonicalKey: 'seed:lullaby',
    title: 'Колыбельная',
    authors: ['Чак Паланик'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780385722193-L.jpg',
    description: 'Черная сказка Паланика о смертельной песенке, медийном шуме и людях, которые слишком легко ломают чужую жизнь.',
    isbn: '9780385722193',
    language: 'Russian',
    pagesCount: 272,
    genre: 'Черная сатира',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%9A%D0%BE%D0%BB%D1%8B%D0%B1%D0%B5%D0%BB%D1%8C%D0%BD%D0%B0%D1%8F%20%D0%A7%D0%B0%D0%BA%20%D0%9F%D0%B0%D0%BB%D0%B0%D0%BD%D0%B8%D0%BA' },
    ],
    year: 2002,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780385722193',
  },
  {
    canonicalKey: 'seed:invisible-monsters',
    title: 'Невидимки',
    authors: ['Чак Паланик'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780393319293-L.jpg',
    description: 'Токсичная глянцевая одиссея про красоту, саморазрушение, идентичность и желание исчезнуть из собственной жизни.',
    isbn: '9780393319293',
    language: 'Russian',
    pagesCount: 304,
    genre: 'Трансгрессивная проза',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%9D%D0%B5%D0%B2%D0%B8%D0%B4%D0%B8%D0%BC%D0%BA%D0%B8%20%D0%A7%D0%B0%D0%BA%20%D0%9F%D0%B0%D0%BB%D0%B0%D0%BD%D0%B8%D0%BA' },
    ],
    year: 1999,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780393319293',
  },
  {
    canonicalKey: 'seed:generation-p',
    title: 'Generation "П"',
    authors: ['Виктор Пелевин'],
    description: 'Постсоветский рекламный шаманизм: клипы, бренды, пустота, телевизор и странное ощущение, что реальность написали копирайтеры.',
    language: 'Russian',
    pagesCount: 352,
    genre: 'Постмодерн',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=Generation%20%D0%9F%20%D0%9F%D0%B5%D0%BB%D0%B5%D0%B2%D0%B8%D0%BD' },
      { name: 'Лабиринт', url: 'https://www.labirint.ru/search/Generation%20%D0%9F/' },
    ],
    year: 1999,
    sourceName: 'Seed',
    sourceUrl: 'https://ru.wikipedia.org/wiki/Generation_%C2%AB%D0%9F%C2%BB',
  },
  {
    canonicalKey: 'seed:roadside-picnic',
    title: 'Пикник на обочине',
    authors: ['Аркадий Стругацкий', 'Борис Стругацкий'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9781613743416-L.jpg',
    description: 'Сталкерская классика о Зоне, артефактах, человеческой жадности и желании попросить у мира невозможного.',
    isbn: '9781613743416',
    language: 'Russian',
    pagesCount: 256,
    genre: 'Фантастика',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%9F%D0%B8%D0%BA%D0%BD%D0%B8%D0%BA%20%D0%BD%D0%B0%20%D0%BE%D0%B1%D0%BE%D1%87%D0%B8%D0%BD%D0%B5' },
    ],
    year: 1972,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9781613743416',
  },
  {
    canonicalKey: 'seed:clockwork-orange',
    title: 'Заводной апельсин',
    authors: ['Энтони Берджесс'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780393312836-L.jpg',
    description: 'Насилие, свобода воли, государственное перевоспитание и язык, который звучит как удар ботинком по стеклу.',
    isbn: '9780393312836',
    language: 'Russian',
    pagesCount: 240,
    genre: 'Антиутопия',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%97%D0%B0%D0%B2%D0%BE%D0%B4%D0%BD%D0%BE%D0%B9%20%D0%B0%D0%BF%D0%B5%D0%BB%D1%8C%D1%81%D0%B8%D0%BD' },
    ],
    year: 1962,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780393312836',
  },
  {
    canonicalKey: 'seed:catcher-in-the-rye',
    title: 'Над пропастью во ржи',
    authors: ['Джером Д. Сэлинджер'],
    coverUrl: 'https://covers.openlibrary.org/isbn/9780316769488-L.jpg',
    description: 'Нервный подростковый монолог о фальши взрослых, одиночестве и попытке удержаться на краю.',
    isbn: '9780316769488',
    language: 'Russian',
    pagesCount: 288,
    genre: 'Культовая проза',
    storeLinks: [
      { name: 'Ozon', url: 'https://www.ozon.ru/search/?text=%D0%9D%D0%B0%D0%B4%20%D0%BF%D1%80%D0%BE%D0%BF%D0%B0%D1%81%D1%82%D1%8C%D1%8E%20%D0%B2%D0%BE%20%D1%80%D0%B6%D0%B8' },
    ],
    year: 1951,
    sourceName: 'Seed',
    sourceUrl: 'https://openlibrary.org/isbn/9780316769488',
  },
];

const libraryEntries: SeedLibraryEntry[] = [
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'seed:teachings-of-don-juan',
    readingStatus: 'read',
    createdAt: new Date('2026-03-26T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'seed:1984',
    readingStatus: 'read',
    createdAt: new Date('2026-03-28T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'seed:fight-club',
    readingStatus: 'reading',
    createdAt: new Date('2026-03-29T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'seed:generation-p',
    readingStatus: 'unread',
    createdAt: new Date('2026-03-31T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'seed:roadside-picnic',
    readingStatus: 'read',
    createdAt: new Date('2026-04-01T10:00:00.000Z'),
  },
  {
    userEmail: 'alexey@housebook.local',
    canonicalKey: 'seed:clockwork-orange',
    readingStatus: 'unread',
    createdAt: new Date('2026-04-02T10:00:00.000Z'),
  },
  {
    userEmail: 'maria@housebook.local',
    canonicalKey: 'seed:fahrenheit-451',
    readingStatus: 'read',
    createdAt: new Date('2026-03-27T10:00:00.000Z'),
  },
  {
    userEmail: 'maria@housebook.local',
    canonicalKey: 'seed:lullaby',
    readingStatus: 'reading',
    createdAt: new Date('2026-03-30T10:00:00.000Z'),
  },
  {
    userEmail: 'maria@housebook.local',
    canonicalKey: 'seed:invisible-monsters',
    readingStatus: 'unread',
    createdAt: new Date('2026-04-03T10:00:00.000Z'),
  },
  {
    userEmail: 'maria@housebook.local',
    canonicalKey: 'seed:catcher-in-the-rye',
    readingStatus: 'read',
    createdAt: new Date('2026-04-04T10:00:00.000Z'),
  },
];

const loanEntries: SeedLoanEntry[] = [
  {
    ownerEmail: 'alexey@housebook.local',
    borrowerEmail: 'maria@housebook.local',
    borrowerName: 'Мария Иванова',
    canonicalKey: 'seed:teachings-of-don-juan',
    lentAt: new Date('2026-04-01T10:00:00.000Z'),
    dueAt: new Date('2026-04-20T10:00:00.000Z'),
    status: 'active',
  },
];

const loanRequestEntries: SeedLoanRequestEntry[] = [
  {
    ownerEmail: 'alexey@housebook.local',
    requesterEmail: 'maria@housebook.local',
    canonicalKey: 'seed:fight-club',
    message: 'Можно взять «Бойцовский клуб» на пару недель? Верну без синяков.',
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
        pagesCount: book.pagesCount,
        genre: book.genre,
        storeLinks: book.storeLinks ?? [],
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
        pagesCount: book.pagesCount,
        genre: book.genre,
        storeLinks: book.storeLinks ?? [],
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

async function clearBookData() {
  await prisma.loanRequest.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.userBook.deleteMany();
  await prisma.book.deleteMany();

  console.log('✓ Old book data cleared');
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
  await clearBookData();
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
