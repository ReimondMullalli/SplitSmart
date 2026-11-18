// End-to-end API test for the SplitSmart prototype (Lab 9 "Required Testing").
// Start the app first (npm run dev), then in another terminal:
//   npm run test:api                 # runs every check, creates a fresh test group
//   npm run test:api -- --verify <groupId>   # re-check a group after a restart
// BASE_URL defaults to http://localhost:3000.

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
let failures = 0;

function check(name, condition, detail = "") {
  console.log(`${condition ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`);
  if (!condition) failures++;
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, data: await res.json() };
}

const balancesOf = (detail) =>
  Object.fromEntries(detail.balances.map((b) => [b.memberName, b.balanceCents]));
const sum = (detail) => detail.balances.reduce((s, b) => s + b.balanceCents, 0);

async function verify(groupId) {
  const { status, data } = await call("GET", `/api/groups/${groupId}`);
  check("Group still loads after restart/refresh", status === 200);
  const b = balancesOf(data);
  check(
    "Persisted balances: Alice +$21.66, Bob -$8.33, Charlie -$13.33",
    b.Alice === 2166 && b.Bob === -833 && b.Charlie === -1333,
    JSON.stringify(b),
  );
  check("Persisted expense count is 3", data.expenses.length === 3);
  check("Balances sum to zero", sum(data) === 0);
}

async function main() {
  const verifyIdx = process.argv.indexOf("--verify");
  if (verifyIdx !== -1) return verify(Number(process.argv[verifyIdx + 1]));

  // 1. Create a group
  const g = await call("POST", "/api/groups", { name: `Test trip ${new Date().toISOString()}` });
  check("A group can be created", g.status === 201 && g.data.id > 0, `id=${g.data.id}`);
  const gid = g.data.id;
  const list = await call("GET", "/api/groups");
  check("Group appears in the group list", list.data.some((x) => x.id === gid));

  // 2. Add three members
  const ids = {};
  for (const name of ["Alice", "Bob", "Charlie"]) {
    const r = await call("POST", `/api/groups/${gid}/members`, { name });
    ids[name] = r.data.id;
  }
  let d = (await call("GET", `/api/groups/${gid}`)).data;
  check("Three members can be added", d.members.length === 3, d.members.map((m) => m.name).join(", "));

  // 3. $60 paid by Alice, shared by all three
  const all = [ids.Alice, ids.Bob, ids.Charlie];
  const e1 = await call("POST", `/api/groups/${gid}/expenses`, {
    description: "Dinner", amount: "60", payerId: ids.Alice, participantIds: all,
  });
  d = (await call("GET", `/api/groups/${gid}`)).data;
  let b = balancesOf(d);
  check(
    "$60 shared by three -> Alice +$40, Bob -$20, Charlie -$20",
    e1.status === 201 && b.Alice === 4000 && b.Bob === -2000 && b.Charlie === -2000,
    JSON.stringify(b),
  );
  check("Balances sum to zero (after $60)", sum(d) === 0);

  // 4. Multiple expenses: Bob pays $30 for Alice+Bob; Charlie pays $10 for all three
  await call("POST", `/api/groups/${gid}/expenses`, {
    description: "Taxi", amount: "30.00", payerId: ids.Bob, participantIds: [ids.Alice, ids.Bob],
  });
  const e3 = await call("POST", `/api/groups/${gid}/expenses`, {
    description: "Snacks", amount: "10", payerId: ids.Charlie, participantIds: all,
  });
  d = (await call("GET", `/api/groups/${gid}`)).data;
  b = balancesOf(d);
  check(
    "Multiple expenses update balances (Alice +$21.66, Bob -$8.33, Charlie -$13.33)",
    b.Alice === 2166 && b.Bob === -833 && b.Charlie === -1333,
    JSON.stringify(b),
  );

  // 5. $10 among three allocated exactly to the cent
  const snacks = d.expenses.find((x) => x.id === e3.data.id);
  const shares = snacks.shares.map((s) => s.shareCents);
  check(
    "$10 shared by three -> 334 / 333 / 333 cents (extra cent to lowest member id)",
    JSON.stringify(shares) === "[334,333,333]" && shares.reduce((s, v) => s + v, 0) === 1000,
    JSON.stringify(shares),
  );
  check("All balances sum to zero", sum(d) === 0, `sum=${sum(d)}`);
  check("Expense history lists all 3 expenses", d.expenses.length === 3);

  // 6. Invalid input is rejected with readable messages
  const bad = async (label, body) => {
    const r = await call("POST", `/api/groups/${gid}/expenses`, body);
    check(`Rejects ${label}`, r.status === 400 && typeof r.data.error === "string", `${r.status}: ${r.data.error}`);
  };
  const base = { description: "Bad", payerId: ids.Alice, participantIds: all };
  await bad("amount 0", { ...base, amount: "0" });
  await bad("negative amount", { ...base, amount: "-5" });
  await bad("non-numeric amount", { ...base, amount: "abc" });
  await bad("3 decimal places", { ...base, amount: "1.234" });
  await bad("unknown payer id", { ...base, amount: "5", payerId: 999999 });
  await bad("unknown participant id", { ...base, amount: "5", participantIds: [ids.Alice, 999999] });
  await bad("non-numeric member id", { ...base, amount: "5", payerId: "abc" });
  await bad("no participants", { ...base, amount: "5", participantIds: [] });

  // A member from a different group is rejected too
  const other = await call("POST", "/api/groups", { name: "Other group" });
  const outsider = await call("POST", `/api/groups/${other.data.id}/members`, { name: "Dave" });
  await bad("member of another group", { ...base, amount: "5", participantIds: [ids.Alice, outsider.data.id] });

  const emptyGroup = await call("POST", "/api/groups", { name: "   " });
  check("Rejects empty group name", emptyGroup.status === 400, emptyGroup.data.error);
  const dup = await call("POST", `/api/groups/${gid}/members`, { name: "Alice" });
  check("Rejects duplicate member name", dup.status === 409, dup.data.error);
  const missing = await call("GET", "/api/groups/999999");
  check("Unknown group returns 404", missing.status === 404, missing.data.error);

  d = (await call("GET", `/api/groups/${gid}`)).data;
  check("Rejected requests did not change data", d.expenses.length === 3 && sum(d) === 0);

  console.log(`\nTest group id: ${gid}. After restarting the server, run:`);
  console.log(`  npm run test:api -- --verify ${gid}`);
}

main()
  .catch((err) => {
    console.error("Test run crashed:", err.message);
    failures++;
  })
  .finally(() => {
    console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
    process.exitCode = failures === 0 ? 0 : 1;
  });
