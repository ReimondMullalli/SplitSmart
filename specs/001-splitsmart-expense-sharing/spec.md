# Feature Specification: SplitSmart Expense Sharing

**Feature Branch**: `001-splitsmart-expense-sharing`

**Created**: 2026-10-29

**Status**: Draft — clarified (Session 2026-10-29), pending human review

**Input**: User description: "Read UserRequirement.md in this workspace as the authoritative customer requirements. Write a testable SplitSmart feature specification: actors, user scenarios, functional and non-functional requirements, acceptance criteria, requirement IDs (FR-001, etc.), and open questions. Preserve all original customer features in the requirements inventory; label the Java Swing MVP subset separately. Do not write Java code. Do not edit UserRequirement.md."

**Source of truth**: [`UserRequirement.md`](../../UserRequirement.md) (read-only)

## Clarifications

### Session 2026-10-29

- Q: Is the person who paid an expense automatically one of the people who share it? → A: No. The **payer** and the **participants** are recorded separately. The payer is included in the split only if they are explicitly selected as a participant (the default selection includes the payer, and it can be unchecked).
- Q: Who can be named on an expense, and how does someone join a group? → A: Only current members of the group the expense belongs to. A user joins a group when an existing member adds them by username; the creator becomes the group's first member and administrator. A member with a non-zero balance in the group cannot be removed until the balance is settled.
- Q: How are cents handled when an amount does not divide evenly? → A: Each share is rounded to 2 decimal places (half-up); any leftover cent(s) are assigned one cent at a time to participants in the order they appear in the participant list, so the shares always add up exactly to the expense amount.
- Q: What amounts are valid? → A: Greater than 0.00 and at most 1,000,000.00, with at most 2 decimal places. Zero, negative, non-numeric, and over-precise amounts are rejected with a message and nothing is saved.
- Q: For a split by percentage, what totals are accepted? → A: Percentages may have up to 2 decimal places, each must be greater than 0, and they must total exactly 100.00%. Any other total is rejected, and the current total is shown to the user while entering.
- Q: How do users sign in? → A: With a unique username and a password (minimum 8 characters). Passwords are never stored or shown in readable form. After 5 failed attempts in a row, sign-in for that account is locked for 15 minutes. Third-party / social sign-in is out of scope.
- Q: How are users notified of new expenses in the MVP? → A: Through an in-application notification inbox (with an unread count) shown when the user signs in or is already signed in. Push, e-mail, and SMS notifications are deferred to the web/mobile releases.
- Q: What approval workflow applies? → A: Single-level review for the MVP: every participant other than the creator must approve. An expense affects balances only when all required approvals are given; one rejection (with an optional reason) marks it Rejected. Multi-level approval is retained as a deferred requirement.
- Q: How are balances settled? → A: A payment is recorded by the payer of the debt; the receiving user must confirm it before it reduces the balance. Partial payments are allowed; a payment larger than the amount currently owed between the two users is rejected. Balances are shown per pair of users (simplified/netted between each pair), not across the whole group.

## Actors

| Actor | Description |
|-------|-------------|
| **Guest** | A person without a session who can register or sign in. |
| **Registered User** | A signed-in person who can create groups, expenses, and payments and view their own data. |
| **Group Administrator** | The member who created a group (or was granted the role); manages group name and membership. |
| **Group Member** | A user belonging to a group; may be a payer, participant, or approver of that group's expenses. |
| **Approver** | A participant (other than the creator) whose approval is required before an expense affects balances. |
| **System** | SplitSmart itself: calculates splits and balances, issues notifications, and generates reports. |

## Requirements Inventory (all customer features preserved)

Every customer feature in `UserRequirement.md` is listed here. "MVP" = included in the Java Swing
desktop MVP; "Deferred" = retained as a customer requirement for a later release.

| # | Customer feature (UserRequirement.md) | Requirement IDs | MVP scope |
|---|---------------------------------------|-----------------|-----------|
| C1 | User accounts | FR-001 – FR-005 | MVP |
| C2 | Group management | FR-006 – FR-010 | MVP |
| C3 | Expense creation (amount, date, description, split manner, optional receipt image, involved users) | FR-011 – FR-019 | MVP |
| C4 | Notification system | FR-020 – FR-022 | MVP (in-app inbox); push/e-mail Deferred (FR-023) |
| C5 | Approval workflow (single or multiple levels) | FR-024 – FR-028 | MVP (single-level); multi-level Deferred (FR-029) |
| C6 | Balance tracking | FR-030 – FR-032 | MVP |
| C7 | Payment tracking | FR-033 – FR-037 | MVP |
| C8 | Reporting (summaries, custom date ranges & parameters) | FR-038 – FR-041 | MVP |
| C9 | OS supported: primarily web-based, plus Android and iOS apps | NFR-010 – NFR-012 | **Deferred** (MVP is a desktop client — implementation decision, see below) |

### Java Swing MVP subset (implementation decision — not a customer requirement)

Per the project constitution (Principle II), the course MVP is a **single-machine Java Swing
desktop application**. It implements C1–C8 as marked above. It does **not** satisfy C9 (web,
Android, iOS); those remain customer requirements to be met by later clients that reuse the same
business rules. This scoping is an implementation decision made for the course and must be
confirmed with the customer.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and sign in (Priority: P1)

A new person registers with a username and password, signs in, and sees only their own groups,
expenses, balances, and payments.

**Why this priority**: Every other feature depends on knowing who the user is (C1).

**Independent Test**: Register two users, sign in as each, and confirm each sees only their own data.

**Acceptance Scenarios**:

1. **Given** no account named "alex" exists, **When** a guest registers "alex" with a valid password, **Then** the account is created and the guest can sign in as "alex". *(FR-001, FR-002)*
2. **Given** an account named "alex" exists, **When** someone tries to register "alex" again, **Then** registration is refused with a "username already taken" message. *(FR-001)*
3. **Given** a password of 7 characters, **When** a guest registers, **Then** registration is refused and the minimum length is stated. *(FR-002)*
4. **Given** 5 consecutive wrong passwords for "alex", **When** a 6th attempt is made within 15 minutes, **Then** sign-in is refused even with the correct password and the lockout is explained. *(FR-004)*
5. **Given** "alex" is signed in, **When** "alex" views expenses, **Then** only expenses in groups "alex" belongs to are shown. *(FR-005)*

---

### User Story 2 - Create and manage a group (Priority: P1)

A user creates a group (e.g., "Apartment 4B"), adds roommates by username, and later removes a
member who has moved out once that member's balance is settled.

**Why this priority**: Expenses and balances are tracked within groups (C2).

**Independent Test**: Create a group, add and remove members, and check the member list.

**Acceptance Scenarios**:

1. **Given** "alex" is signed in, **When** "alex" creates the group "Apartment 4B", **Then** the group exists with "alex" as its only member and administrator. *(FR-006)*
2. **Given** "alex" administers "Apartment 4B", **When** "alex" adds registered user "sam", **Then** "sam" becomes a member and can see the group. *(FR-007)*
3. **Given** a username that does not exist, **When** the administrator tries to add it, **Then** the addition is refused with a "user not found" message. *(FR-007)*
4. **Given** "sam" owes money within the group, **When** the administrator tries to remove "sam", **Then** removal is refused until the balance is zero. *(FR-009)*

---

### User Story 3 - Record a shared expense (Priority: P1)

A member records that they paid $90.00 for groceries on a given date, chooses who shares it, and
picks an equal split or a split by percentage, optionally attaching a receipt image.

**Why this priority**: Expense entry is the core value of the product (C3).

**Independent Test**: Create expenses with equal and percentage splits and verify each participant's share.

**Acceptance Scenarios**:

1. **Given** a group with "alex", "sam", "jo", **When** "alex" records $90.00 paid by "alex", split equally among all three, **Then** each share is $30.00. *(FR-011, FR-014, FR-016)*
2. **Given** the same group, **When** "alex" records $100.00 split equally among three, **Then** shares are $33.34, $33.33, $33.33 in participant-list order and total exactly $100.00. *(FR-016)*
3. **Given** a percentage split of 50% / 30% / 20% on $80.00, **When** the expense is saved, **Then** shares are $40.00 / $24.00 / $16.00. *(FR-017)*
4. **Given** percentages totaling 90%, **When** the user tries to save, **Then** saving is refused and the current total (90.00%) is shown. *(FR-017)*
5. **Given** an amount of 0, −5, "abc", or 10.005, **When** the user tries to save, **Then** saving is refused with a specific message and nothing is stored. *(FR-012)*
6. **Given** "alex" paid but is not selected as a participant, **When** $60.00 is split equally between "sam" and "jo", **Then** "sam" and "jo" each owe "alex" $30.00 (once approved). *(FR-014, FR-015)*
7. **Given** a PNG or JPEG image up to 5 MB, **When** it is attached as a receipt, **Then** it is stored with the expense and can be viewed later; other file types or larger files are refused. *(FR-018)*

---

### User Story 4 - Review and approve expenses (Priority: P2)

Participants are notified of a new expense and approve or reject it; only fully approved expenses
change balances.

**Why this priority**: The customer requires review before balances change (C4, C5).

**Independent Test**: Create an expense, approve/reject as each participant, and check its status and balances.

**Acceptance Scenarios**:

1. **Given** "alex" creates an expense shared with "sam" and "jo", **When** it is saved, **Then** "sam" and "jo" each receive an unread in-app notification and the expense status is Pending. *(FR-020, FR-024)*
2. **Given** a Pending expense, **When** "sam" approves but "jo" has not, **Then** balances are unchanged. *(FR-025, FR-026)*
3. **Given** "sam" and "jo" have both approved, **When** the last approval is recorded, **Then** status becomes Approved and balances update. *(FR-026)*
4. **Given** a Pending expense, **When** "jo" rejects it with a reason, **Then** status becomes Rejected, balances are unchanged, and "alex" is notified with the reason. *(FR-027, FR-021)*

---

### User Story 5 - See who owes whom (Priority: P2)

A user views how much they owe each other user and how much each other user owes them.

**Why this priority**: Balance tracking is the outcome users care about (C6).

**Independent Test**: Approve a known set of expenses and compare displayed balances with hand-calculated values.

**Acceptance Scenarios**:

1. **Given** approved expenses where "sam" owes "alex" $30.00 and "alex" owes "sam" $10.00, **When** either views balances, **Then** the net shown is "sam owes alex $20.00". *(FR-030, FR-031)*
2. **Given** only Pending or Rejected expenses, **When** balances are viewed, **Then** they are zero. *(FR-032)*

---

### User Story 6 - Settle up with a payment (Priority: P2)

A user records a payment to another user; once the receiver confirms, the balance between them is
reduced.

**Why this priority**: Without settlement, balances only ever grow (C7).

**Independent Test**: Record and confirm payments and check resulting balances.

**Acceptance Scenarios**:

1. **Given** "sam" owes "alex" $20.00, **When** "sam" records a $15.00 payment and "alex" confirms it, **Then** "sam" owes "alex" $5.00. *(FR-033, FR-034, FR-036)*
2. **Given** "sam" owes "alex" $20.00, **When** "sam" records a $25.00 payment, **Then** it is refused because it exceeds the amount owed. *(FR-035)*
3. **Given** an unconfirmed payment, **When** balances are viewed, **Then** they are unchanged and the payment shows as Awaiting confirmation. *(FR-034)*

---

### User Story 7 - Reports and summaries (Priority: P3)

A user views a summary of their expenses, balances, and payments, filtered by date range, group,
and other user.

**Why this priority**: Valuable but depends on all other data existing (C8).

**Independent Test**: Seed known data and compare report totals for several date ranges.

**Acceptance Scenarios**:

1. **Given** expenses dated Oct 1, Oct 15, and Nov 2, **When** the user requests a report for Oct 1 – Oct 31, **Then** only the first two are included, with correct totals. *(FR-038, FR-039)*
2. **Given** a start date after the end date, **When** a report is requested, **Then** it is refused with a message. *(FR-039)*
3. **Given** a report is displayed, **When** the user exports it, **Then** a CSV file with the same rows and totals is produced. *(FR-041)*

---

### Edge Cases

- A participant list containing only the payer (nothing is owed; allowed but flagged to the user).
- An expense with a single participant who is not the payer (that participant owes the full amount).
- Splitting $0.01 among three participants (one share of $0.01, two of $0.00 — allowed by the remainder rule; each share ≥ 0).
- A percentage split where rounding of shares causes a remainder (remainder rule FR-016 applies).
- A member is removed or leaves while having Pending expenses (removal blocked while Pending items involving them exist).
- An approver's account is locked during a Pending approval (approval waits; no auto-approval).
- Expense date in the future (refused) or more than 5 years in the past (allowed with a warning).
- Editing an expense after approval (editing returns it to Pending and resets approvals).
- Two payments recorded at the same time that together exceed the balance owed (second is refused at confirmation).

## Requirements *(mandatory)*

### Functional Requirements

**User accounts (C1)**

- **FR-001**: System MUST allow a guest to register with a username that is unique (case-insensitive), 3–30 characters, letters/digits/underscore.
- **FR-002**: System MUST require a password of at least 8 characters and MUST never store or display passwords in readable form.
- **FR-003**: System MUST allow a registered user to sign in and sign out.
- **FR-004**: System MUST lock sign-in for an account for 15 minutes after 5 consecutive failed attempts.
- **FR-005**: System MUST show a signed-in user only the groups, expenses, balances, payments, notifications, and reports they are a party to.

**Group management (C2)**

- **FR-006**: Users MUST be able to create a named group; the creator becomes its first member and administrator.
- **FR-007**: A group administrator MUST be able to add existing registered users by username; unknown usernames are refused.
- **FR-008**: A group administrator MUST be able to rename the group.
- **FR-009**: A group administrator MUST be able to remove a member only when that member has a zero balance and no Pending expenses or payments in the group.
- **FR-010**: A user MUST be able to belong to multiple groups and view each group's members.

**Expense creation (C3)**

- **FR-011**: Group members MUST be able to create an expense with amount, date, description, payer, participants, split manner, and an optional receipt image.
- **FR-012**: System MUST accept only amounts > 0.00 and ≤ 1,000,000.00 with at most 2 decimal places; invalid amounts are rejected with a specific message.
- **FR-013**: System MUST require a description of 1–200 characters and a date that is not in the future.
- **FR-014**: System MUST record the payer and the participants separately; the payer is a participant only if explicitly selected.
- **FR-015**: Payer and participants MUST be current members of the expense's group; at least one participant is required.
- **FR-016**: For an equal split, System MUST compute each share rounded half-up to 2 decimals and assign any remaining cent(s) one at a time in participant-list order, so shares total exactly the amount.
- **FR-017**: For a percentage split, System MUST require each percentage > 0 with at most 2 decimals and a total of exactly 100.00%; shares are computed and remainders assigned as in FR-016.
- **FR-018**: System MUST allow attaching one optional receipt image (PNG or JPEG, ≤ 5 MB) and viewing it later.
- **FR-019**: The creator MUST be able to edit or delete their expense while it is Pending; editing an Approved expense returns it to Pending and clears its approvals.

**Notification system (C4)**

- **FR-020**: System MUST notify every participant (other than the creator) when a new expense involving them is created.
- **FR-021**: System MUST notify the creator when their expense is approved or rejected, and the receiver of a payment when a payment to them is recorded.
- **FR-022**: Users MUST be able to see unread notifications with a count and mark them as read.
- **FR-023** *(Deferred)*: System SHOULD deliver push notifications on mobile and e-mail notifications on the web.

**Approval workflow (C5)**

- **FR-024**: A newly created expense MUST have status Pending.
- **FR-025**: Each participant other than the creator MUST be able to approve or reject a Pending expense once.
- **FR-026**: An expense MUST become Approved, and only then affect balances, when all required approvers have approved.
- **FR-027**: A single rejection MUST mark the expense Rejected (with optional reason); Rejected expenses never affect balances.
- **FR-028**: System MUST record who approved/rejected and when.
- **FR-029** *(Deferred)*: Groups SHOULD be able to configure multi-level approval (e.g., a designated reviewer after participants).

**Balance tracking (C6)**

- **FR-030**: System MUST track, for every pair of users, the net amount one owes the other across all Approved expenses and confirmed payments.
- **FR-031**: Users MUST be able to view balances per other user, both overall and per group.
- **FR-032**: Pending and Rejected expenses and unconfirmed payments MUST NOT affect balances.

**Payment tracking (C7)**

- **FR-033**: A user MUST be able to record a payment to another user with amount, date, and optional note.
- **FR-034**: A recorded payment MUST stay Awaiting confirmation until the receiver confirms it; only confirmed payments reduce balances.
- **FR-035**: System MUST reject a payment whose amount is invalid (as FR-012) or exceeds the amount currently owed to the receiver.
- **FR-036**: Partial payments MUST be supported.
- **FR-037**: The receiver MUST be able to decline a payment, which then never affects balances.

**Reporting (C8)**

- **FR-038**: System MUST provide a summary of a user's expenses, balances, and payments.
- **FR-039**: Users MUST be able to filter reports by date range (start ≤ end), group, and other user.
- **FR-040**: Reports MUST show totals paid, totals owed, and net position for the selected filter.
- **FR-041**: Users MUST be able to export a report to CSV.

### Non-Functional Requirements

- **NFR-001** (Accuracy): All money calculations MUST be exact to the cent; sum of shares always equals the expense amount.
- **NFR-002** (Performance): Balance and report views MUST appear within 2 seconds for a user with up to 10,000 expenses.
- **NFR-003** (Security): Passwords MUST be stored only as salted one-way hashes; users cannot read other users' data (FR-005).
- **NFR-004** (Usability): A first-time user MUST be able to record an expense without instructions; every rejected input states what is wrong and how to fix it.
- **NFR-005** (Reliability): Saved data MUST survive closing and reopening the application.
- **NFR-006** (Auditability): Expense, approval, and payment history MUST be retained and viewable; nothing affecting balances is silently deleted.
- **NFR-007** (Maintainability): Business rules MUST be testable independently of the user interface.
- **NFR-008** (Testability): Every FR in the MVP MUST have at least one automated acceptance test referencing its ID.
- **NFR-009** (Localization): Amounts are displayed in a single currency (USD) with 2 decimals for the MVP.
- **NFR-010** *(Deferred — customer requirement C9)*: SplitSmart MUST be available primarily as a web application.
- **NFR-011** *(Deferred — C9)*: SplitSmart MUST provide an Android app.
- **NFR-012** *(Deferred — C9)*: SplitSmart MUST provide an iOS app.

### Key Entities

- **User**: username, password credential, sign-in lockout state; belongs to many Groups.
- **Group**: name, administrator, members.
- **Expense**: group, amount, date, description, payer, split manner (Equal / Percentage), status (Pending / Approved / Rejected), optional receipt image, creator.
- **Share (Split line)**: expense, participant, percentage (if applicable), share amount.
- **Approval**: expense, approver, decision (Approved / Rejected), reason, timestamp.
- **Payment**: from user, to user, amount, date, note, status (Awaiting confirmation / Confirmed / Declined).
- **Balance**: derived net amount between a pair of users (overall and per group).
- **Notification**: recipient, message, related expense/payment, read flag, timestamp.
- **Report**: filter (date range, group, other user), totals, rows; exportable.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can register, create a group, add a member, and record a first expense in under 5 minutes.
- **SC-002**: 100% of tested splits (equal and percentage, including uneven cents) total exactly the expense amount.
- **SC-003**: Displayed balances match hand-calculated balances in 100% of acceptance test scenarios.
- **SC-004**: 100% of invalid inputs listed in the acceptance scenarios are rejected with a message and no data change.
- **SC-005**: Participants see a notification for a new expense the next time they view the application, in 100% of cases.
- **SC-006**: 90% of first-time users complete "record an expense" on the first attempt without help.
- **SC-007**: Every MVP functional requirement (FR-001 – FR-041, excluding Deferred) is covered by at least one passing acceptance test.

## Assumptions

- Single currency (USD) for the MVP; multi-currency is out of scope.
- Users are reachable only through the application for the MVP (no e-mail/phone collected).
- Balances are netted per pair of users; group-wide debt simplification (minimizing transfers across the group) is out of scope.
- Data is stored locally on the machine running the MVP; multi-device synchronization arrives with the web/mobile clients.
- Payments are recorded only — SplitSmart does not move real money or integrate with payment providers.

## Open Questions

Resolved questions are logged under **Clarifications**. The following remain open for the customer
and do not block the MVP:

1. **OQ-1**: Will the customer accept a desktop (Java Swing) MVP before the web and mobile releases (C9)?
2. **OQ-2**: What should multi-level approval look like (who is the second-level reviewer, and is it per group)? (FR-029)
3. **OQ-3**: Should split options beyond equal and percentage (exact amounts, shares/weights) be offered later?
4. **OQ-4**: Should there be data retention limits or account deletion rules (e.g., for privacy laws)?
5. **OQ-5**: Is group-wide debt simplification desired in a later release?
