# 05 — Allocation Architecture (Future — NOT Implemented)

> Payments Design Gate. Design only. This document defines the architecture
> for allocating payments to specific purchases **without implementing it**,
> so that if BDR-04 is approved the seam already exists and no rewrite of the
> frozen payment document is needed. Labels: [Business Rule] /
> [Future Extension] / [Decision Pending].

## 1. Status

[Approved Fact — BDR-04, DL-016, 2026-07-04] AlDaftar uses the
**running-balance model**: a payment credits the supplier's overall balance
with no per-purchase link. Allocation-to-invoice is **not built in v1**; the
rest of this document defines it as a [Future Extension] so that, if the
business later needs per-invoice paid status, the seam already exists and no
rewrite of the frozen payment document is required.

## 2. The invariant that makes allocation optional

[Business Rule] The supplier balance and statement (03) are computed the
same way regardless of allocation. Allocation is a **projection on top** of
posted documents; it never changes:

- the supplier balance,
- the statement rows,
- the payment document's amount/discount.

This invariant (also stated in docs/purchase/07 §4 and 03 §4 here) is what
lets allocation be added later as a pure addition.

## 3. Architecture, if BDR-04 approves allocation-to-purchase

[Future Extension] — described, not built:

- **Allocation lines** become an optional array inside the payment aggregate
  (composition; addressed only via the payment, business-architecture R3):
  each line = { purchaseId, amount } in ILS.
- **Constraint:** Σ(allocation amounts) ≤ the payment amount; each purchase
  receives ≤ its open amount. Enforced at posting inside the payment service
  (validation tier: application service, R5).
- **Derived "paid status" per purchase** = Σ(allocations to it from posted
  payments), yielding open/partially-paid/paid views — a **read model**,
  never stored on the purchase (which is immutable).
- **Suggested default:** oldest-open-first distribution, user-adjustable
  (design 02 §S-42 / journey J4). This is a UI default only.
- **Storage seam:** the frozen payment structure (02) already permits an
  optional `allocations` array; adding it is additive and backward
  compatible — no migration of existing payments, which simply have none.

## 4. What this document forbids

[Business Rule] Even when allocation is implemented:

- It must not mutate posted purchases or the supplier balance math.
- It must not merge into the payment amount/discount fields.
- It must not become a second source of truth for the balance.

Allocation is reporting/UX; the ledger stays the posted documents.

## 5. Refund receipts (related future counterpart)

[Future Extension] Supplier cash-back (a refund after a purchase return) is
a Payments-side counterpart that would reference a purchase return the same
identifier-only way and appear as a **debit** on the statement (increasing
what is owed, since cash came back). Pending business approval; noted here so
the payment architecture anticipates it without modeling it.
