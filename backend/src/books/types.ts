export type BookLookupResult = {
  title: string;
  authors: string[];
  coverUrl?: string;
  description?: string;
  isbn?: string;
  pagesCount?: number;
  coverType?: string;
  publisher?: string;
  ageRestriction?: string;
  size?: string;
  weight?: number;
  pageSize?: string;
  printRun?: number;
  year?: number;
  genre?: string;
  rating?: number;
  ratingsCount?: number;
  language?: string;
  subjects?: string[];
  storeLinks?: StoreLinkResult[];
  sourceUrl: string;
  sourceName: BookSourceName;
};

export type StoreLinkResult = {
  name: string;
  url: string;
};

export type ReadingStatus = 'unread' | 'reading' | 'read';

export type LoanStatus = 'active' | 'returned';

export type ActiveLoanResult = {
  id: number;
  ownerUserId: number;
  borrowerUserId?: number;
  borrowerName: string;
  borrowerUserName?: string;
  borrowerAvatarUrl?: string;
  lentAt: string;
  dueAt?: string;
  returnedAt?: string;
  status: LoanStatus;
  isOverdue?: boolean;
  daysLeft?: number;
  daysOverdue?: number;
  dueState?: 'none' | 'upcoming' | 'due_today' | 'overdue' | 'returned';
};

export type LibraryBookResult = BookLookupResult & {
  bookId: number;
  readingStatus: ReadingStatus;
  addedAt?: string;
  activeLoan?: ActiveLoanResult;
  isLent?: boolean;
  isAvailable?: boolean;
  hasSourceLink?: boolean;
  displayAuthor?: string;
  displayStatus?: string;
  wasAlreadyInLibrary?: boolean;
};

export type BookSourceName = 'OpenLibrary' | 'LitRes' | 'Manual';

export interface BookProvider {
  readonly name: BookSourceName;

  supportsUrl(url: string): boolean;

  supportsIsbn(): boolean;

  supportsTitle(): boolean;

  lookupByIsbn?(isbn: string): Promise<BookLookupResult>;

  lookupByUrl?(url: string): Promise<BookLookupResult>;

  searchByTitle?(title: string): Promise<BookLookupResult[]>;
}
