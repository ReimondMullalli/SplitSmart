// Pure money helpers for SplitSmart. Safe to import from both server and
// browser code (no database access here). All amounts are integer cents.

export const MAX_AMOUNT_CENTS = 100_000_000; // $1,000,000.00

export type ParseResult =
  | { ok: true; cents: number }
  | { ok: false; error: string };

/**
 * Convert user input such as "60", "60.5" or "60.50" into integer cents
 * without ever going through floating-point arithmetic.
 */
export function parseAmountToCents(input: unknown): ParseResult {
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return { ok: false, error: "Amount must be a number." };
    input = String(input);
  }
  if (typeof input !== "string" || input.trim() === "") {
    return { ok: false, error: "Amount is required." };
  }
  const text = input.trim().replace(/^\$/, "");
  if (text.startsWith("-")) {
    return { ok: false, error: "Amount must be greater than $0.00." };
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) {
    return {
      ok: false,
      error: "Amount must be a number with at most 2 decimal places (e.g. 12.50).",
    };
  }
  const dollars = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const cents = dollars * 100 + Number(fraction);
  if (!Number.isSafeInteger(cents) || cents > MAX_AMOUNT_CENTS) {
    return { ok: false, error: "Amount must be $1,000,000.00 or less." };
  }
  if (cents <= 0) {
    return { ok: false, error: "Amount must be greater than $0.00." };
  }
  return { ok: true, cents };
}

/**
 * Split an amount equally among participants.
 *
 * Remainder rule (deterministic): participants are ordered by ascending
 * member id, and the first `amount % n` of them each pay one extra cent.
 * Example: 1000 cents among ids [3, 1, 2] -> {1: 334, 2: 333, 3: 333}.
 * The returned shares always sum to exactly `amountCents`.
 */
export function splitEvenly(amountCents: number, participantIds: number[]): Map<number, number> {
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
    throw new Error("amountCents must be a positive integer");
  }
  const ids = [...new Set(participantIds)].sort((a, b) => a - b);
  if (ids.length === 0) throw new Error("At least one participant is required");

  const base = Math.floor(amountCents / ids.length);
  const remainder = amountCents % ids.length;
  const shares = new Map<number, number>();
  ids.forEach((id, index) => shares.set(id, base + (index < remainder ? 1 : 0)));
  return shares;
}

export interface BalanceInputExpense {
  payerId: number;
  amountCents: number;
  shares: { memberId: number; shareCents: number }[];
}

/**
 * Net balance per member: positive = should receive money,
 * negative = owes money. Every expense adds +amount to the payer and
 * -share to each participant, so the total is always zero.
 */
export function computeBalances(
  memberIds: number[],
  expenses: BalanceInputExpense[],
): Map<number, number> {
  const balances = new Map<number, number>(memberIds.map((id) => [id, 0]));
  const add = (id: number, delta: number) => balances.set(id, (balances.get(id) ?? 0) + delta);
  for (const expense of expenses) {
    add(expense.payerId, expense.amountCents);
    for (const share of expense.shares) add(share.memberId, -share.shareCents);
  }
  return balances;
}

/** 4000 -> "$40.00", -2000 -> "-$20.00" */
export function formatCents(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString("en-US");
  return `${sign}$${dollars}.${String(abs % 100).padStart(2, "0")}`;
}

/** 4000 -> "+$40.00", -2000 -> "-$20.00", 0 -> "$0.00" */
export function formatSignedCents(cents: number): string {
  return cents > 0 ? `+${formatCents(cents)}` : formatCents(cents);
}
