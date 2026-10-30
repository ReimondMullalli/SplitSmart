<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Added principles: I. Requirement Traceability; II. Customer Requirements vs. Implementation Decisions;
  III. Object-Oriented Design; IV. Separation of GUI and Business Logic; V. Exact Money Arithmetic (BigDecimal);
  VI. Test-Verified Behavior (JUnit 5); VII. Models as Living Documentation (PlantUML); VIII. Human Review of AI Output
- Added sections: Technology Stack & Constraints; Development Workflow & Quality Gates; Governance
- Removed sections: none (template placeholders replaced)
- Templates requiring updates: plan-template.md ✅ no change needed (reads constitution at runtime);
  spec-template.md ✅ no change needed; tasks-template.md ✅ no change needed
- Follow-up TODOs: none
- Source document: UserRequirement.md (read-only; NOT modified)
-->

# SplitSmart Constitution

## Core Principles

### I. Requirement Traceability (NON-NEGOTIABLE)

- `UserRequirement.md` is the authoritative, read-only record of the original SplitSmart customer
  request. It MUST NOT be edited by humans or AI agents; changes in customer intent are captured as
  new clarifications in the specification, never by rewriting the source.
- Every functional requirement MUST carry a stable ID (`FR-001`, `FR-002`, …), every non-functional
  requirement an ID (`NFR-001`, …), and every success criterion an ID (`SC-001`, …).
- Every requirement MUST trace back to a customer feature in `UserRequirement.md` (or to a recorded
  clarification), and every UML model element, class, and test MUST trace forward to at least one
  requirement ID.
- Requirements that are deferred out of the MVP MUST stay in the requirements inventory and be
  labeled as deferred — they are never silently dropped.

### II. Customer Requirements vs. Implementation Decisions

- Specifications describe **what** the customer needs and **why**; plans describe **how**.
- Customer requirements (e.g., "web-based with Android and iOS apps") and implementation decisions
  (e.g., "the MVP is a Java Swing desktop application") MUST be recorded in separate, clearly
  labeled sections. An implementation decision MUST never be presented as a customer requirement.
- Any implementation decision that narrows or departs from a customer requirement MUST be
  documented with its rationale and the affected requirement IDs.

### III. Object-Oriented Design

- The domain (User, Group, Expense, Split, Approval, Payment, Balance, Notification, Report) MUST be
  modeled as cohesive classes with encapsulated state and explicit responsibilities.
- Favor composition over inheritance, program to interfaces for services and repositories, and
  apply SOLID principles. Domain objects MUST validate their own invariants (e.g., split percentages
  total 100%).

### IV. Separation of GUI and Business Logic

- The Java Swing GUI is a presentation layer only (MVC / MVP style). It MUST NOT contain balance
  calculation, split, approval, or validation logic.
- All business rules live in a GUI-independent domain/service layer that can be compiled and tested
  without any Swing dependency. Persistence is accessed only through repository interfaces.

### V. Exact Money Arithmetic (BigDecimal)

- All monetary values MUST use `java.math.BigDecimal` with an explicit scale of 2 and an explicit,
  documented `RoundingMode`. `float` and `double` MUST NOT be used for money anywhere.
- Every split MUST be conservation-safe: the sum of participant shares MUST equal the expense amount
  exactly; any rounding remainder is assigned by a documented deterministic rule.

### VI. Test-Verified Behavior (JUnit 5)

- Business logic MUST be covered by JUnit 5 tests, and every acceptance criterion in the
  specification MUST map to at least one automated test referencing its requirement ID.
- Money, split, rounding, approval, and balance-settlement rules MUST include boundary and invalid-
  input tests. The build MUST fail when tests fail.

### VII. Models as Living Documentation (PlantUML)

- UML diagrams (use case, class, sequence, activity/state) MUST be authored as PlantUML text files
  under version control, so they can be reviewed in diffs.
- Diagrams MUST be updated in the same change that alters the behavior or structure they describe
  and MUST reference the requirement IDs they realize.

### VIII. Human Review of AI Output

- All AI-generated artifacts (constitution, specification, clarifications, plans, UML, code, tests)
  are drafts until a human reviewer has read and approved them.
- AI agents MUST NOT silently invent answers to ambiguous requirements; open questions MUST be
  recorded and resolved only after explicit human confirmation.
- Reviewers MUST check AI output against `UserRequirement.md` for omissions, invented scope, and
  contradictions before committing.

## Technology Stack & Constraints

These are **implementation decisions** for the course MVP, not customer requirements.

| Concern | Decision |
|---------|----------|
| Language | Java 21 (LTS) |
| Build | Maven (standard directory layout, `mvn test` / `mvn package` must succeed) |
| GUI (MVP) | Java Swing desktop client |
| Testing | JUnit 5 (Jupiter) |
| Modeling | PlantUML |
| Money | `java.math.BigDecimal`, scale 2, `RoundingMode.HALF_UP` unless a clarification says otherwise |
| Source control | Git + GitHub (public repository) |

- The customer's target platforms (web primary, Android and iOS apps) remain in the requirements
  inventory as deferred requirements; the layered architecture of Principle IV exists so that those
  clients can later reuse the domain layer.
- No external services are required to run the MVP; persistence may be local (in-memory or file).

## Development Workflow & Quality Gates

1. **Specify** (`/speckit-specify`) → **Clarify** (`/speckit-clarify`) → **Plan** → **Tasks** →
   **Implement**, in that order. Planning MUST NOT begin while critical clarifications are open.
2. Each change MUST be committed with a message that references the affected requirement IDs.
3. Quality gates before merge/commit to `main`:
   - Specification quality checklist passes.
   - Requirement traceability holds (no orphan requirements, no untraced code or tests).
   - All JUnit 5 tests pass via Maven.
   - PlantUML diagrams render and are consistent with the change.
   - A human has reviewed all AI-generated content (Principle VIII).

## Governance

- This constitution supersedes other project practices. Where a plan, spec, or task conflicts with
  it, the constitution wins until it is amended.
- Amendments require a documented rationale, human approval, and a version bump using semantic
  versioning: MAJOR for removing/redefining a principle, MINOR for adding a principle or section,
  PATCH for wording clarifications.
- Every review MUST verify compliance with these principles; any justified deviation MUST be
  recorded in the plan's complexity/deviation notes.

**Version**: 1.0.0 | **Ratified**: 2026-10-29 | **Last Amended**: 2026-10-29
