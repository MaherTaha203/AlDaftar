# BDD-004 — Payment Allocation

> **Status: Template — awaiting business input.** Created under the neutrality
> rules of `docs/business-architecture.md` (§Pending: PD-04, PD-10).
> Business sections are filled only by the business owner; engineering never
> invents business behavior here.

## Purpose

Once approved, this document defines how money paid to (or received from) a
supplier relates to the documents that created the debt: allocation to
specific invoices, a running account per supplier, or another model used by
the company.

## Scope

- Covers: the relationship between payments and invoices/returns, partial
  payments, overpayments, advances, and supplier opening balances.
- Does not cover: the document types themselves (BDD-003), numbering
  (BDD-005), currency (BDD-006).

## Approved Facts

- F4: the system manages supplier finances for a single company.
- F9: Payment, Receipt, and Voucher are mentioned vocabulary only.
- No allocation model, partial-payment behavior, or balance rule is approved
  at this time.

## Pending Decisions

- PD-04 (allocation aspect) — payments allocated to specific invoices vs
  recorded against a running supplier account. **Decision Pending.**
- PD-10 — whether suppliers start with opening balances and how these are
  established. **Decision Pending.**
- Treatment of partial payments, advances, and overpayments.
  **Requires Business Approval.**

## Business Questions

1. When the company pays a supplier, is the payment made against specific
   invoices, or simply against the supplier's overall balance?
2. Do partial payments happen? How are they tracked today?
3. Does the company ever pay in advance (before an invoice exists)?
4. Can a payment exceed what is owed? What happens then?
5. Do suppliers have existing balances that must be carried into the system
   on day one? From what source?
6. How does the company know today what is still owed to a supplier?

## Engineering Notes

- Recommendation R3 applies: derived balances are computed from documents
  rather than stored, whatever allocation model is approved.
- If allocation-to-invoice is approved, allocations would live inside the
  payment aggregate (R3); if running-account is approved, no allocation
  structure is needed. Neither is assumed.

## Future Expansion

- Customer-side receipts and allocation (sales side) — only if promoted from
  `docs/business-architecture.md` §4 and approved.

## Decision Table

| Decision                          | Status  |
| --------------------------------- | ------- |
| Allocation model (PD-04)          | Pending |
| Partial payments treatment        | Pending |
| Advances / prepayments treatment  | Pending |
| Overpayment treatment             | Pending |
| Supplier opening balances (PD-10) | Pending |
