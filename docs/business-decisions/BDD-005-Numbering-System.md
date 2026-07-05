# BDD-005 — Numbering System

> **Status: Template — awaiting business input.** Created under the neutrality
> rules of `docs/business-architecture.md` (§Pending: PD-06).
> Business sections are filled only by the business owner; engineering never
> invents numbering rules here.

## Purpose

Once approved, this document defines how business documents are numbered:
whether AlDaftar assigns numbers or records numbers from paper documents, and
the exact numbering scheme.

## Scope

- Covers: number assignment (system vs manual), format, sequences, reset
  policy, and gap policy for every approved document type.
- Does not cover: which document types exist (BDD-003).

## Approved Facts

- No numbering rule of any kind is approved at this time.

## Pending Decisions

- PD-06 — the entire numbering model. **Decision Pending.**

## Business Questions

1. Do the company's paper documents already carry numbers (supplier invoice
   numbers, internal voucher numbers)?
2. Should the system generate its own internal numbers, record the paper
   numbers, or both?
3. If system-generated: one sequence for everything, or per document type?
4. Do sequences restart (yearly or otherwise) or run forever?
5. Are gaps in numbering acceptable, or must the sequence be continuous?
6. Is there a required format (prefixes, year, fixed digits)?
7. When exactly should a number be assigned — when a record is first saved,
   or at some later step?

## Engineering Notes

- Recommendation R4 applies: if numbers are system-assigned at a lifecycle
  transition, issuance would occur inside that transition's transaction.
  Whether that is required depends entirely on the answers above.
- Gapless sequences and free sequences have different implementation costs;
  engineering will size this after the decision, not before.

## Future Expansion

- Per-branch or per-user sub-sequences — only if the business ever needs
  them (none approved; single company, single user per F2/F4).

## Approved Decision (2026-07-04 — BDR-01, owner-approved)

System-assigned numbering. Each document type (Purchase, Purchase Return,
Payment, …) has its own independent numeric sequence starting at 1, 2, 3…
Numbers are plain integers — no prefix, no year component — never reset and
never reused. The number is assigned only at posting (inside the posting
transaction); drafts carry only the internal UUID, which is never shown to
the user. The supplier's paper-invoice number is recorded separately as the
supplier-invoice reference on the purchase (approved purchase structure).

## Decision Table

| Decision                                    | Status                                         |
| ------------------------------------------- | ---------------------------------------------- |
| System-assigned vs recorded numbers (PD-06) | Approved — system-assigned (+ paper ref field) |
| Sequence scope (global / per type) (PD-06)  | Approved — independent sequence per type       |
| Reset policy (PD-06)                        | Approved — never resets                        |
| Gap policy (PD-06)                          | Approved — continuous; numbers never reused    |
| Number format (PD-06)                       | Approved — plain integer, no prefix/year       |
| Assignment moment (PD-06)                   | Approved — at posting only                     |
