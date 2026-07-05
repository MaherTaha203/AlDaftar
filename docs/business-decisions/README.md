# Business Decision Documents (BDD)

This folder holds the official Business Decision Documents for AlDaftar. Each
BDD turns one area of the business domain from _unknown_ into _approved_,
under the neutrality rules of `docs/business-architecture.md` (DL-010):
engineering never invents business behavior; every unknown is marked
**Decision Pending** or **Requires Business Approval**.

## Document registry and order

Documents are processed in numeric order; later documents depend on earlier
ones.

| #       | Document                                            | Status in repository                                                                 |
| ------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| BDD-001 | [placeholder](BDD-001-PLACEHOLDER.md)               | **Approved externally — pending verbatim import** (placeholder only; no content).    |
| BDD-002 | [placeholder](BDD-002-PLACEHOLDER.md)               | **Approved externally — pending verbatim import** (placeholder only; no content).    |
| BDD-003 | [Document Types](BDD-003-Document-Types.md)         | Template — awaiting PD-03/PD-04; lifecycle states `Draft → Posted` approved (DL-020) |
| BDD-004 | [Payment Allocation](BDD-004-Payment-Allocation.md) | Approved (running-balance, DL-016)                                                   |
| BDD-005 | [Numbering System](BDD-005-Numbering-System.md)     | Approved (DL-013)                                                                    |
| BDD-006 | [Currency Rules](BDD-006-Currency-Rules.md)         | Approved (DL-014)                                                                    |
| BDD-007 | [Attachments](BDD-007-Attachments.md)               | Template, awaiting business input (BDR-08)                                           |
| BDD-008 | [Inventory Rules](BDD-008-Inventory-Rules.md)       | Template, awaiting business input                                                    |
| BDD-009 | [Reporting](BDD-009-Reporting.md)                   | **Approved** (DL-026; Supplier-Aging contents deferred)                              |
| BDD-010 | [Audit and Security](BDD-010-Audit-and-Security.md) | **Approved** (DL-021)                                                                |

## Decisions with no dedicated BDD (recorded in the decision log)

Several pending decisions from `docs/business-architecture.md` §3 have no
dedicated BDD file. Per the approval workflow, an approved decision is
propagated by updating `business-architecture.md` §5 and adding a
`decision-log` row — a BDD file is not mandatory. The following are now
**approved** and recorded there and in the relevant system-design documents:

- **Tax (PD-08)** — no tax system in v1 (DL-022).
- **Business validation rules (PD-09)** — DL-023.
- **Fiscal periods (PD-14)** — single period, no closing (DL-024).
- **Search (PD-16)** — DL-025; design in `system-design/06_Search_Specification.md`.
- **Workflows (PD-17)** — `Draft → Posted` (DL-020); Locked deferred.
- **Presentation:** digit style (BDR-17 / DL-027), date format (BDR-18 /
  DL-028), amount in words (BDR-19 / DL-029).

Still without a home and still pending:

- **Opening balances (PD-10 / BDR-06).**
- **Backup/recovery (BDR-12).**
- **Product catalog master data** — referenced by BDD-008 (unless covered by
  BDD-001/BDD-002, whose verbatim text is still pending import — placeholders
  only).

## Approval workflow

1. **Business input.** The business owner answers the _Business Questions_
   section, ideally with samples of real paper documents.
2. **Drafting.** Answers are written into _Pending Decisions_ as concrete
   statements; unresolved items stay marked **Decision Pending**.
3. **Engineering review.** Engineering checks the draft for internal
   consistency, conflicts with other BDDs, and feasibility — without altering
   business intent.
4. **Approval.** The owner approves; every row in the document's _Decision
   Table_ is set to **Approved** or **Rejected** (no row may remain Pending
   in an approved document unless explicitly deferred).
5. **Propagation.** On approval: update the decision table in
   `docs/business-architecture.md` §5 and add a `DL-xxx` row to
   `docs/decision-log.md`. Only then may implementation of the affected
   module begin (DL-010).

## Document dependencies

- **BDD-003 (Document Types) is the keystone** — BDD-004, BDD-005, BDD-008,
  and BDD-009 cannot be finalized before it: allocation references document
  types, numbering numbers them, inventory moves on them, reports read them.
- **BDD-006 (Currency)** affects every document with an amount; approve it
  no later than BDD-003's drafting.
- **BDD-004 (Payment Allocation)** depends on BDD-003 and feeds BDD-009
  (balance/paid-status reporting).
- **BDD-008 (Inventory)** depends on BDD-003 (which documents move stock)
  and feeds BDD-009 (stock reports).
- **BDD-007 (Attachments)** depends on BDD-003 only for the list of
  attachment targets.
- **BDD-010 (Audit and Security)** crosses all documents; finalize last.
- **BDD-001/BDD-002** precede everything; their content is approved but only a
  placeholder exists here (`BDD-001-PLACEHOLDER.md`, `BDD-002-PLACEHOLDER.md`)
  until the verbatim text is imported, so they cannot yet be referenced
  precisely.

Suggested processing order: 001, 002 (add files) → 003 + 006 → 004, 005,
007, 008 → 009 → 010.

## Review process

- Any change to an **approved** BDD requires re-running the approval workflow
  for the changed rows and a new decision-log entry; silent edits are
  forbidden.
- Each BDD review checks: (a) no invented business behavior, (b) every
  unknown is explicitly Pending, (c) the four-way separation of facts /
  recommendations / pending / future is intact, (d) the Decision Table is
  complete and matches the body.
- Conflicts between BDDs are resolved in favor of the earlier-numbered
  document unless the owner decides otherwise, and both documents are updated
  in the same review.
