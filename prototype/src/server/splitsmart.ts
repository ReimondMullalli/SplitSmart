// SplitSmart business logic (server-only). Route handlers call these
// functions; they validate input and read/write SQLite through Prisma.
import { prisma } from "./db";
import { computeBalances, parseAmountToCents, splitEvenly } from "@/lib/money";
import type { GroupDetail, GroupSummary } from "@/lib/types";

export class AppError extends Error {
  constructor(
    message: string,
    public status: number = 400,
  ) {
    super(message);
  }
}

const MAX_NAME = 60;
const MAX_DESCRIPTION = 120;

function requireText(value: unknown, field: string, max: number): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(`${field} is required.`);
  }
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length > max) throw new AppError(`${field} must be ${max} characters or fewer.`);
  return text;
}

/** Accepts numbers or numeric strings; rejects anything else. */
export function parseId(value: unknown, field: string): number {
  const n = typeof value === "string" && /^\d+$/.test(value.trim()) ? Number(value) : value;
  if (typeof n !== "number" || !Number.isSafeInteger(n) || n <= 0) {
    throw new AppError(`${field} must be a valid id.`);
  }
  return n;
}

export async function listGroups(): Promise<GroupSummary[]> {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "asc" },
    include: { _count: { select: { members: true, expenses: true } } },
  });
  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    memberCount: g._count.members,
    expenseCount: g._count.expenses,
  }));
}

export async function createGroup(input: { name?: unknown }): Promise<GroupSummary> {
  const name = requireText(input.name, "Group name", MAX_NAME);
  const group = await prisma.group.create({ data: { name } });
  return { id: group.id, name: group.name, memberCount: 0, expenseCount: 0 };
}

async function requireGroup(groupId: number) {
  const group = await prisma.group.findUnique({ where: { id: groupId } });
  if (!group) throw new AppError("Group not found.", 404);
  return group;
}

export async function getGroupDetail(groupId: number): Promise<GroupDetail> {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      members: { orderBy: { id: "asc" } },
      expenses: {
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        include: { shares: { orderBy: { memberId: "asc" } } },
      },
    },
  });
  if (!group) throw new AppError("Group not found.", 404);

  const balances = computeBalances(
    group.members.map((m) => m.id),
    group.expenses,
  );
  const nameOf = new Map(group.members.map((m) => [m.id, m.name]));

  return {
    id: group.id,
    name: group.name,
    members: group.members.map((m) => ({ id: m.id, name: m.name })),
    expenses: group.expenses.map((e) => ({
      id: e.id,
      description: e.description,
      amountCents: e.amountCents,
      createdAt: e.createdAt.toISOString(),
      payerId: e.payerId,
      payerName: nameOf.get(e.payerId) ?? "Unknown",
      shares: e.shares.map((s) => ({
        memberId: s.memberId,
        memberName: nameOf.get(s.memberId) ?? "Unknown",
        shareCents: s.shareCents,
      })),
    })),
    balances: group.members.map((m) => ({
      memberId: m.id,
      memberName: m.name,
      balanceCents: balances.get(m.id) ?? 0,
    })),
    totalCents: [...balances.values()].reduce((sum, v) => sum + v, 0),
  };
}

export async function addMember(groupId: number, input: { name?: unknown }) {
  await requireGroup(groupId);
  const name = requireText(input.name, "Member name", MAX_NAME);
  const existing = await prisma.member.findFirst({ where: { groupId, name } });
  if (existing) throw new AppError(`"${name}" is already a member of this group.`, 409);
  const member = await prisma.member.create({ data: { groupId, name } });
  return { id: member.id, name: member.name };
}

export async function addExpense(
  groupId: number,
  input: { description?: unknown; amount?: unknown; payerId?: unknown; participantIds?: unknown },
) {
  await requireGroup(groupId);
  const description = requireText(input.description, "Description", MAX_DESCRIPTION);

  const amount = parseAmountToCents(input.amount);
  if (!amount.ok) throw new AppError(amount.error);

  const payerId = parseId(input.payerId, "Payer");
  if (!Array.isArray(input.participantIds) || input.participantIds.length === 0) {
    throw new AppError("Select at least one participant.");
  }
  const participantIds = [
    ...new Set(input.participantIds.map((id) => parseId(id, "Participant"))),
  ];

  // Payer and every participant must belong to this group.
  const members = await prisma.member.findMany({ where: { groupId }, select: { id: true } });
  const memberIds = new Set(members.map((m) => m.id));
  if (!memberIds.has(payerId)) throw new AppError("Payer must be a member of this group.");
  const outsiders = participantIds.filter((id) => !memberIds.has(id));
  if (outsiders.length > 0) {
    throw new AppError("All participants must be members of this group.");
  }

  const shares = splitEvenly(amount.cents, participantIds);

  const expense = await prisma.expense.create({
    data: {
      groupId,
      description,
      amountCents: amount.cents,
      payerId,
      shares: {
        create: [...shares].map(([memberId, shareCents]) => ({ memberId, shareCents })),
      },
    },
  });
  return { id: expense.id };
}
