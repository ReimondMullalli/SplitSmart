import { describe, expect, it } from "vitest";
import { computeBalances, formatSignedCents, parseAmountToCents, splitEvenly } from "./money";

const sum = (values: Iterable<number>) => [...values].reduce((a, b) => a + b, 0);

describe("parseAmountToCents", () => {
  it.each([
    ["60", 6000],
    ["60.5", 6050],
    ["60.50", 6050],
    ["$10", 1000],
    ["0.01", 1],
    [12.34, 1234],
  ])("parses %s -> %i cents", (input, cents) => {
    expect(parseAmountToCents(input)).toEqual({ ok: true, cents });
  });

  it.each(["0", "0.00", "-5", "abc", "", "1.234", "1e3", "1,000", "2000000"])(
    "rejects %s",
    (input) => {
      expect(parseAmountToCents(input).ok).toBe(false);
    },
  );
});

describe("splitEvenly", () => {
  it("splits $60 among 3 evenly", () => {
    expect([...splitEvenly(6000, [1, 2, 3])]).toEqual([[1, 2000], [2, 2000], [3, 2000]]);
  });

  it("allocates $10 among 3 to the cent, extra cent to lowest id", () => {
    const shares = splitEvenly(1000, [3, 1, 2]);
    expect(Object.fromEntries(shares)).toEqual({ 1: 334, 2: 333, 3: 333 });
    expect(sum(shares.values())).toBe(1000);
  });

  it("always sums to the amount", () => {
    for (let amount = 1; amount <= 500; amount++) {
      for (let n = 1; n <= 7; n++) {
        const ids = Array.from({ length: n }, (_, i) => i + 1);
        expect(sum(splitEvenly(amount, ids).values())).toBe(amount);
      }
    }
  });
});

describe("computeBalances", () => {
  const share = (amount: number, ids: number[]) =>
    [...splitEvenly(amount, ids)].map(([memberId, shareCents]) => ({ memberId, shareCents }));

  it("Alice pays $60 for Alice, Bob, Charlie -> +40 / -20 / -20", () => {
    const b = computeBalances([1, 2, 3], [{ payerId: 1, amountCents: 6000, shares: share(6000, [1, 2, 3]) }]);
    expect(Object.fromEntries(b)).toEqual({ 1: 4000, 2: -2000, 3: -2000 });
    expect(formatSignedCents(b.get(1)!)).toBe("+$40.00");
    expect(formatSignedCents(b.get(2)!)).toBe("-$20.00");
    expect(sum(b.values())).toBe(0);
  });

  it("multiple expenses accumulate and still sum to zero", () => {
    const b = computeBalances(
      [1, 2, 3],
      [
        { payerId: 1, amountCents: 6000, shares: share(6000, [1, 2, 3]) },
        { payerId: 2, amountCents: 3000, shares: share(3000, [1, 2]) },
        { payerId: 3, amountCents: 1000, shares: share(1000, [1, 2, 3]) },
      ],
    );
    // Alice: +6000-2000-1500-334 = 2166 ; Bob: -2000+3000-1500-333 = -833 ; Charlie: -2000+1000-333 = -1333
    expect(Object.fromEntries(b)).toEqual({ 1: 2166, 2: -833, 3: -1333 });
    expect(sum(b.values())).toBe(0);
  });
});
