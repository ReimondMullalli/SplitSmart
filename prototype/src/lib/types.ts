// Shapes returned by the SplitSmart JSON API (shared by server and UI).

export interface GroupSummary {
  id: number;
  name: string;
  memberCount: number;
  expenseCount: number;
}

export interface MemberDTO {
  id: number;
  name: string;
}

export interface ExpenseDTO {
  id: number;
  description: string;
  amountCents: number;
  createdAt: string;
  payerId: number;
  payerName: string;
  shares: { memberId: number; memberName: string; shareCents: number }[];
}

export interface BalanceDTO {
  memberId: number;
  memberName: string;
  balanceCents: number;
}

export interface GroupDetail {
  id: number;
  name: string;
  members: MemberDTO[];
  expenses: ExpenseDTO[];
  balances: BalanceDTO[];
  /** Sum of all balances; always 0. */
  totalCents: number;
}
