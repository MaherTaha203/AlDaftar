# BDD-003 — Document Types

> **Status: Template — awaiting business input** on the document catalog
> (PD-03) and structure (PD-04). One part of PD-05 is now settled: the
> **lifecycle state machine is `Draft → Posted`** (PD-17 / DL-020), matching
> the frozen implementation; the approved but undefined **Locked** state is
> deferred (DL-020), and editability/void/deletion of a posted document
> (BDR-07, BDR-15) remain open. Created under the neutrality rules of
> `docs/business-architecture.md`; engineering never invents business behavior
> here.

## Purpose

Once approved, this document is the authoritative list of business document
types AlDaftar records (e.g. purchase invoice, purchase return, payment
voucher, receipt voucher, …), what each contains, and its lifecycle.

## Scope

- Covers: the catalog of document types, their required content, whether they
  carry line items, and their lifecycle states (draft/final/void/…).
- Does not cover: how payments map to invoices (BDD-004), numbering
  (BDD-005), currency of amounts (BDD-006), attachments (BDD-007).

## Approved Facts

- F1/F3/F4 (`docs/business-architecture.md` §1): AlDaftar is a bookkeeping
  system, not an ERP, serving a single company as a private, single-user
  supplier financial archive and purchasing management system.
- F9: the project vocabulary mentions Invoice, Payment, Receipt, Voucher —
  vocabulary only; no document type is approved yet.
- No document type, content, or lifecycle is approved at this time.

## Pending Decisions

- PD-03 — the exact list of document types in use. **Decision Pending.**
- PD-04 — whether purchase documents carry product line items or totals only.
  **Decision Pending.**
- PD-05 — lifecycle: **states `Draft → Posted` are Approved** (PD-17 / DL-020;
  the further Locked state is deferred). Editability after posting,
  void/reversal, and deletion policy remain **Decision Pending** (BDR-07,
  BDR-15).

## Business Questions

1. Which paper/real documents does the company use today with suppliers?
   (Please provide one sample of each.)
2. For each document type: what information must be recorded from it?
3. Do purchase documents list items with quantities and prices, or totals only?
4. Can a recorded document ever be changed? If a mistake is found after
   recording, what does the company actually do today?
5. Is anything ever deleted from the books?
6. Are there document types for corrections (returns, credit notes, …)?

## Engineering Notes

Neutral notes only — no business behavior implied:

- The domain foundation (`lib/domain/common`) provides lifecycle-capable
  aggregates; any approved lifecycle can be enforced in the aggregate.
- Recommendation R3/R4 (`docs/business-architecture.md` §2) applies once
  types are approved: one document = one aggregate; line items (if approved)
  live inside it.
- Each approved document type will map to one module per R1/R6.

## Future Expansion

- Sales-side document types (customer invoices/receipts) — see
  `docs/business-architecture.md` §4; only if promoted and approved.

## Decision Table

| Decision                                | Status  |
| --------------------------------------- | ------- |
| List of document types (PD-03)          | Pending |
| Document content per type (PD-03)       | Pending |
| Line items vs totals only (PD-04)       | Pending |
| Lifecycle states (PD-05)                | Pending |
| Correction/void/deletion policy (PD-05) | Pending |
