const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type LoanDueState =
  | 'none'
  | 'upcoming'
  | 'due_today'
  | 'overdue'
  | 'returned';

export type LoanUxState = {
  isOverdue: boolean;
  daysLeft?: number;
  daysOverdue?: number;
  dueState: LoanDueState;
};

type TimingInput = {
  status: string;
  dueAt?: Date | null;
  returnedAt?: Date | null;
  now?: Date;
};

type SortableLoan = {
  status: string;
  dueAt?: Date | null;
  lentAt: Date;
  returnedAt?: Date | null;
};

function startOfUtcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function diffUtcDays(left: Date, right: Date): number {
  return Math.round((startOfUtcDay(left) - startOfUtcDay(right)) / MS_PER_DAY);
}

export function deriveLoanUxState(input: TimingInput): LoanUxState {
  const now = input.now ?? new Date();

  if (input.status === 'returned' || input.returnedAt) {
    return {
      isOverdue: false,
      dueState: 'returned',
    };
  }

  if (!input.dueAt) {
    return {
      isOverdue: false,
      dueState: 'none',
    };
  }

  const dayDiff = diffUtcDays(input.dueAt, now);

  if (dayDiff < 0) {
    return {
      isOverdue: true,
      daysOverdue: Math.abs(dayDiff),
      dueState: 'overdue',
    };
  }

  if (dayDiff === 0) {
    return {
      isOverdue: false,
      daysLeft: 0,
      dueState: 'due_today',
    };
  }

  return {
    isOverdue: false,
    daysLeft: dayDiff,
    dueState: 'upcoming',
  };
}

function getLoanSortWeight(loan: SortableLoan): number {
  if (loan.status === 'returned') {
    return 5;
  }

  const uxState = deriveLoanUxState({
    status: loan.status,
    dueAt: loan.dueAt,
    returnedAt: loan.returnedAt,
  });

  if (uxState.dueState === 'overdue') {
    return 0;
  }
  if (uxState.dueState === 'due_today') {
    return 1;
  }
  if (uxState.dueState === 'upcoming') {
    return 2;
  }

  return 3;
}

function compareNullableDatesAsc(
  left?: Date | null,
  right?: Date | null,
): number {
  if (left && right) {
    return left.getTime() - right.getTime();
  }
  if (left) {
    return -1;
  }
  if (right) {
    return 1;
  }
  return 0;
}

export function compareLoansByUrgency(
  left: SortableLoan,
  right: SortableLoan,
): number {
  const weightDiff = getLoanSortWeight(left) - getLoanSortWeight(right);
  if (weightDiff !== 0) {
    return weightDiff;
  }

  if (left.status !== 'returned' && right.status !== 'returned') {
    const dueDiff = compareNullableDatesAsc(left.dueAt, right.dueAt);
    if (dueDiff !== 0) {
      return dueDiff;
    }

    return right.lentAt.getTime() - left.lentAt.getTime();
  }

  if (left.status === 'returned' && right.status === 'returned') {
    return (
      (right.returnedAt ?? right.lentAt).getTime() -
      (left.returnedAt ?? left.lentAt).getTime()
    );
  }

  return right.lentAt.getTime() - left.lentAt.getTime();
}

export function getReadingStatusLabel(status: string): string {
  if (status === 'reading') {
    return 'Читаю';
  }
  if (status === 'read') {
    return 'Прочитана';
  }
  return 'Не прочитана';
}
