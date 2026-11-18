# SplitSmart Prototype (CIS 285 Lab 9)

A working SplitSmart prototype built with an AI coding agent (Lab 9, Prompt 2),
using the existing Next.js 15 + React + TypeScript + Tailwind CSS + Prisma 6 +
SQLite environment from Lab 8.

> Prototype only: there is no login, no payment processing and no cloud
> deployment.

## Run it (in the Codespace)

```bash
cd prototype
npm run db:setup   # creates .env if missing, then `prisma db push` (adds tables, keeps existing data)
npm run dev        # http://localhost:3000 (port 3000 is forwarded by the dev container)
```

`db:setup` is safe to re-run. It never deletes the database; `prisma db push`
only adds the new SplitSmart tables next to the Lab 8 `EnvironmentCheck` table.

## Test it

```bash
npm test               # unit tests (Vitest) for money parsing, splitting and balances
npm run test:api       # end-to-end API checks (needs `npm run dev` running)
# restart `npm run dev`, then confirm the data persisted:
npm run test:api -- --verify <groupId printed by the previous command>
```

## Features (Functional Requirements)

| Requirement | What the app does |
|---|---|
| FR1 Group management | Create groups; list and select existing groups (selected group is kept in the URL `?group=<id>`, so a browser refresh keeps you on it). |
| FR2 Member management | Add members to a group and view the member list. Duplicate names in the same group are rejected. |
| FR3 Expense recording | Record description, amount, payer and selected participants (all members are pre-selected). |
| FR4 Expense history | Every expense of the group, newest first, with payer, date and each participant's share. |
| FR5 Balance calculation | Net balance per member (`+` should receive, `−` owes) plus the sum of all balances (always $0.00). |

### Business rules and how they are enforced

- **Equal split, integer cents.** Amounts are parsed from text straight into
  integer cents (no floating point) and stored as `Int` columns.
- **Deterministic remainder.** Participants are ordered by member id; the first
  `amount % n` participants pay one extra cent. `$10.00 / 3` → `3.34, 3.33, 3.33`.
- **Shares always add up.** Each expense stores one `ExpenseShare` row per
  participant, and the shares sum exactly to the expense amount, so the sum of
  all balances is always zero.
- **Validation on the server** (and repeated in the form for quick feedback):
  amount must be positive with at most 2 decimals and ≤ $1,000,000; payer and
  every participant must be members of the selected group; at least one
  participant; names/descriptions required. Errors come back as
  `{ "error": "<readable message>" }` and are shown under the form.
- **Persistence.** All data is stored in SQLite (`prisma/dev.db`) through
  Prisma. Database access only happens in server route handlers.

## Major files

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Added `Group`, `Member`, `Expense`, `ExpenseShare` (kept `EnvironmentCheck`). |
| `src/lib/money.ts` | Pure logic: parse amounts to cents, equal split with remainder rule, balances, formatting. |
| `src/lib/money.test.ts` | 20 Vitest unit tests. |
| `src/lib/types.ts` | JSON shapes shared by the API and the UI. |
| `src/server/db.ts` | Server-only Prisma client singleton. |
| `src/server/splitsmart.ts` | Business logic + validation (groups, members, expenses, balances). |
| `src/server/http.ts` | JSON/error helpers for route handlers. |
| `src/app/api/groups/**/route.ts` | REST API (see below). |
| `src/components/SplitSmartApp.tsx` | Client UI (responsive: two columns on desktop, stacked on mobile). |
| `src/app/page.tsx`, `src/app/layout.tsx` | Page entry and title. |
| `scripts/api-test.mjs` | End-to-end test of all "Required Testing" items. |
| `scripts/ensure-env.mjs` | Creates `.env` with `DATABASE_URL="file:./dev.db"` if missing. |
| `package.json` | Added scripts `test`, `test:api`, `db:setup` (no new dependencies). |

### API

| Method | Path | Body |
|---|---|---|
| GET | `/api/groups` | – |
| POST | `/api/groups` | `{ "name": "Roommates" }` |
| GET | `/api/groups/:id` | – (members, expenses, balances, totalCents) |
| POST | `/api/groups/:id/members` | `{ "name": "Alice" }` |
| POST | `/api/groups/:id/expenses` | `{ "description": "Dinner", "amount": "60.00", "payerId": 1, "participantIds": [1,2,3] }` |

## Test results

Executed by the AI agent on 2026-11-18 (Node 22, Next.js 15.5, Prisma 6.19, SQLite):

- `npm test`: **20/20 unit tests passed**.
- `npm run test:api`: **22/22 checks passed**: group created; three members
  added; $60 paid by Alice for all three → Alice +$40.00, Bob −$20.00,
  Charlie −$20.00; after adding $30 (Bob, for Alice+Bob) and $10 (Charlie, for
  all) → Alice +$21.66, Bob −$8.33, Charlie −$13.33; the $10 expense split
  334/333/333 cents; balances sum to 0; zero, negative, non-numeric and
  3-decimal amounts rejected; unknown payer, unknown participant, non-numeric
  id, empty participant list and a member of another group rejected (HTTP 400
  with a readable message); empty group name, duplicate member and unknown
  group rejected; rejected requests did not change data.
- Persistence: after stopping and restarting the server,
  `npm run test:api -- --verify <id>`: **4/4 passed** (same balances, 3 expenses, sum 0).
- Browser test (headless Chrome): created a group and three members in the UI,
  entered `-5` and saw "Amount must be greater than $0.00.", recorded $60, saw
  +$40.00 / −$20.00 / −$20.00, reloaded the page and the same balances were
  still shown. Layout checked at 1280px and 390px wide.
- `npm run lint`: no problems. `tsc --noEmit`: no errors. `npm run build`: succeeded.

**Note on the test environment:** the agent's sandbox could not download
Prisma's native engine binaries or Google Fonts. The tests above were run with
the same application code, but with Prisma's engine-free driver-adapter mode
and the database tables created with equivalent SQL; the build was checked with
the Geist fonts stubbed out. None of those workarounds are in this repository.
In the Codespace, run `npm run db:setup`, `npm run dev` and `npm run test:api`
to repeat the checks with the standard setup.

## Known issues / not implemented

- No authentication, notifications, approval workflow, payments/settle-up,
  percentage splits, receipts or reports (out of scope for Lab 9 Prompt 2).
- Groups, members and expenses cannot be edited or deleted yet.
- No database migrations folder: the schema is applied with `prisma db push`,
  matching how the Lab 8 dev container initialised the database.
