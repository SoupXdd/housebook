export type LoanRequestStatus = 'pending' | 'approved' | 'rejected';

export type LoanRequestResult = {
  id: number;
  status: LoanRequestStatus;
  message?: string;
  createdAt: string;
  updatedAt: string;
  canApprove?: boolean;
  canReject?: boolean;
  resolutionLabel?: string;
  approvedLoanId?: number;
  owner: {
    userId: number;
    name: string;
    avatarUrl?: string;
  };
  requester: {
    userId: number;
    name: string;
    avatarUrl?: string;
  };
  book: {
    bookId: number;
    title: string;
    authors: string[];
    coverUrl?: string;
    isbn?: string;
  };
};
