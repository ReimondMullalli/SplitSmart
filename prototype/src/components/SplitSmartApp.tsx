"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { formatCents, formatSignedCents, parseAmountToCents } from "@/lib/money";
import type { GroupDetail, GroupSummary } from "@/lib/types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error ?? `Request failed (${res.status}).`);
  return body as T;
}

const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";
const button =
  "rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50";
const card = "rounded-xl border border-slate-200 bg-white p-5 shadow-sm";

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-2 text-sm text-red-600">
      {message}
    </p>
  );
}

export default function SplitSmartApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = Number(searchParams.get("group")) || null;

  const [groups, setGroups] = useState<GroupSummary[] | null>(null);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [detail, setDetail] = useState<GroupDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadGroups = useCallback(async () => {
    try {
      setGroups(await api<GroupSummary[]>("/api/groups"));
      setGroupsError(null);
    } catch (e) {
      setGroupsError((e as Error).message);
    }
  }, []);

  const loadDetail = useCallback(async (id: number) => {
    setLoadingDetail(true);
    try {
      setDetail(await api<GroupDetail>(`/api/groups/${id}`));
      setDetailError(null);
    } catch (e) {
      setDetail(null);
      setDetailError((e as Error).message);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  useEffect(() => {
    if (selectedId) loadDetail(selectedId);
    else setDetail(null);
  }, [selectedId, loadDetail]);

  const selectGroup = (id: number) => router.push(`/?group=${id}`);

  const refresh = async () => {
    await loadGroups();
    if (selectedId) await loadDetail(selectedId);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">
            <span className="text-emerald-600">Split</span>Smart
          </h1>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
            Prototype · no login
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[260px_1fr]">
        <aside className="space-y-4">
          <CreateGroupForm
            onCreated={async (g) => {
              await loadGroups();
              selectGroup(g.id);
            }}
          />
          <section className={card}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Groups
            </h2>
            {groupsError && <ErrorText message={groupsError} />}
            {!groups && !groupsError && <p className="text-sm text-slate-500">Loading…</p>}
            {groups?.length === 0 && (
              <p className="text-sm text-slate-500">No groups yet. Create one above.</p>
            )}
            <ul className="space-y-1">
              {groups?.map((g) => (
                <li key={g.id}>
                  <button
                    onClick={() => selectGroup(g.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      g.id === selectedId
                        ? "bg-emerald-50 font-semibold text-emerald-800"
                        : "hover:bg-slate-100"
                    }`}
                  >
                    {g.name}
                    <span className="block text-xs font-normal text-slate-500">
                      {g.memberCount} {g.memberCount === 1 ? "member" : "members"} ·{" "}
                      {g.expenseCount} {g.expenseCount === 1 ? "expense" : "expenses"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </aside>

        <section className="space-y-6">
          {!selectedId && (
            <div className={`${card} text-center text-slate-500`}>
              Select or create a group to get started.
            </div>
          )}
          {selectedId && loadingDetail && !detail && (
            <div className={card}>Loading group…</div>
          )}
          {selectedId && detailError && (
            <div className={card}>
              <ErrorText message={detailError} />
            </div>
          )}
          {detail && detail.id === selectedId && (
            <>
              <h2 className="text-2xl font-bold">{detail.name}</h2>
              <div className="grid gap-6 lg:grid-cols-2">
                <MembersPanel detail={detail} onChanged={refresh} />
                <BalancesPanel detail={detail} />
              </div>
              <ExpenseForm detail={detail} onCreated={refresh} />
              <ExpenseHistory detail={detail} />
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function CreateGroupForm({ onCreated }: { onCreated: (g: GroupSummary) => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className={card}
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return setError("Group name is required.");
        setBusy(true);
        try {
          const g = await api<GroupSummary>("/api/groups", {
            method: "POST",
            body: JSON.stringify({ name }),
          });
          setName("");
          setError(null);
          onCreated(g);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="group-name" className="mb-2 block text-sm font-semibold">
        New group
      </label>
      <div className="flex gap-2">
        <input
          id="group-name"
          className={input}
          placeholder="e.g. Roommates"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button className={button} disabled={busy}>
          Create
        </button>
      </div>
      <ErrorText message={error} />
    </form>
  );
}

function MembersPanel({ detail, onChanged }: { detail: GroupDetail; onChanged: () => void }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <section className={card}>
      <h3 className="mb-3 font-semibold">Members ({detail.members.length})</h3>
      {detail.members.length === 0 ? (
        <p className="mb-3 text-sm text-slate-500">No members yet.</p>
      ) : (
        <ul className="mb-4 flex flex-wrap gap-2">
          {detail.members.map((m) => (
            <li key={m.id} className="rounded-full bg-slate-100 px-3 py-1 text-sm">
              {m.name}
            </li>
          ))}
        </ul>
      )}
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!name.trim()) return setError("Member name is required.");
          setBusy(true);
          try {
            await api(`/api/groups/${detail.id}/members`, {
              method: "POST",
              body: JSON.stringify({ name }),
            });
            setName("");
            setError(null);
            onChanged();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          aria-label="Member name"
          className={input}
          placeholder="Add member, e.g. Alice"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <button className={button} disabled={busy}>
          Add
        </button>
      </form>
      <ErrorText message={error} />
    </section>
  );
}

function BalancesPanel({ detail }: { detail: GroupDetail }) {
  return (
    <section className={card}>
      <h3 className="mb-3 font-semibold">Balances</h3>
      {detail.balances.length === 0 ? (
        <p className="text-sm text-slate-500">Add members to see balances.</p>
      ) : (
        <>
          <ul className="divide-y divide-slate-100">
            {detail.balances.map((b) => (
              <li key={b.memberId} className="flex items-center justify-between py-2 text-sm">
                <span>{b.memberName}</span>
                <span
                  className={`tabular-nums font-semibold ${
                    b.balanceCents > 0
                      ? "text-emerald-600"
                      : b.balanceCents < 0
                        ? "text-red-600"
                        : "text-slate-500"
                  }`}
                >
                  {formatSignedCents(b.balanceCents)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-slate-200 pt-2 text-xs text-slate-500">
            + should receive · − owes · Sum of balances:{" "}
            <span className="tabular-nums">{formatCents(detail.totalCents)}</span>
          </p>
        </>
      )}
    </section>
  );
}

function ExpenseForm({ detail, onCreated }: { detail: GroupDetail; onCreated: () => void }) {
  const memberIds = useMemo(() => detail.members.map((m) => m.id), [detail.members]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerId, setPayerId] = useState<number | "">("");
  const [participants, setParticipants] = useState<number[]>(memberIds);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // When members change (new member / different group), include everyone by default.
  useEffect(() => {
    setParticipants(memberIds);
    setPayerId((p) => (p !== "" && memberIds.includes(p) ? p : ""));
  }, [memberIds]);

  if (detail.members.length === 0) {
    return (
      <section className={`${card} text-sm text-slate-500`}>
        Add at least one member before recording expenses.
      </section>
    );
  }

  const toggle = (id: number) =>
    setParticipants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!description.trim()) return setError("Description is required.");
    const parsed = parseAmountToCents(amount);
    if (!parsed.ok) return setError(parsed.error);
    if (payerId === "") return setError("Choose who paid.");
    if (participants.length === 0) return setError("Select at least one participant.");

    setBusy(true);
    try {
      await api(`/api/groups/${detail.id}/expenses`, {
        method: "POST",
        body: JSON.stringify({ description, amount, payerId, participantIds: participants }),
      });
      setDescription("");
      setAmount("");
      setError(null);
      setSuccess(`Added "${description.trim()}" (${formatCents(parsed.cents)}).`);
      onCreated();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={card} onSubmit={submit}>
      <h3 className="mb-4 font-semibold">Record an expense</h3>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="text-sm sm:col-span-2">
          <span className="mb-1 block text-slate-600">Description</span>
          <input
            className={input}
            placeholder="e.g. Groceries"
            value={description}
            maxLength={120}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Amount ($)</span>
          <input
            className={input}
            inputMode="decimal"
            placeholder="60.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Paid by</span>
          <select
            className={input}
            value={payerId}
            onChange={(e) => setPayerId(e.target.value ? Number(e.target.value) : "")}
          >
            <option value="">Choose…</option>
            {detail.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="text-sm sm:col-span-2">
          <legend className="mb-1 text-slate-600">Split equally between</legend>
          <div className="flex flex-wrap gap-2">
            {detail.members.map((m) => (
              <label
                key={m.id}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 ${
                  participants.includes(m.id)
                    ? "border-emerald-500 bg-emerald-50"
                    : "border-slate-300"
                }`}
              >
                <input
                  type="checkbox"
                  className="accent-emerald-600"
                  checked={participants.includes(m.id)}
                  onChange={() => toggle(m.id)}
                />
                {m.name}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <div className="mt-4 flex items-center gap-4">
        <button className={button} disabled={busy}>
          {busy ? "Saving…" : "Add expense"}
        </button>
        {success && <span className="text-sm text-emerald-700">{success}</span>}
      </div>
      <ErrorText message={error} />
    </form>
  );
}

function ExpenseHistory({ detail }: { detail: GroupDetail }) {
  return (
    <section className={card}>
      <h3 className="mb-3 font-semibold">Expense history ({detail.expenses.length})</h3>
      {detail.expenses.length === 0 ? (
        <p className="text-sm text-slate-500">No expenses recorded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {detail.expenses.map((e) => (
            <li key={e.id} className="py-3 text-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-slate-500">
                    Paid by {e.payerName} · {new Date(e.createdAt).toLocaleString()}
                  </p>
                </div>
                <span className="tabular-nums font-semibold">{formatCents(e.amountCents)}</span>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Split:{" "}
                {e.shares.map((s) => `${s.memberName} ${formatCents(s.shareCents)}`).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
