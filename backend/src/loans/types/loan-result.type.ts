import type { LoanStatus } from '../../books/types';

export type LoanCounterparty = {
  userId?: number;
  name: string;
  avatarUrl?: string;
};

export type LoanBookSummary = {
  bookId: number;
  title: string;
  authors: string[];
  coverUrl?: string;
  isbn?: string;
};

export type LoanResult = {
  id: number;
  status: LoanStatus;
  lentAt: string;
  dueAt?: string;
  returnedAt?: string;
  isOverdue?: boolean;
  daysLeft?: number;
  daysOverdue?: number;
  dueState?: 'none' | 'upcoming' | 'due_today' | 'overdue' | 'returned';
  owner: LoanCounterparty;
  borrower: LoanCounterparty;
  book: LoanBookSummary;
};
