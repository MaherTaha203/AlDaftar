# 03 — Supplier Statement Effect of a Payment

> Payments Design Gate. Business flow only. Labels: [Approved Fact] /
> [Business Rule]. This document must agree with the frozen purchase
> statement architecture (docs/purchase/07); it restates the payment side in
> full and adds nothing that contradicts it.

## 1. The one statement model (shared)

[Approved Fact] The supplier balance is **calculated**, never stored:

> balance = opening balance (BDR-06) + posted purchases − posted returns
> − posted payments − posted payment-time discounts

[Business Rule] Only **posted** documents produce rows, in date order
(tie-break: posting order). Rows are immutable; new information arrives only
as new rows.

## 2. Payment rows

A single posted payment produces **up to two credit rows**, always shown
separately (never one merged figure):

| Row                                 | Amount     | Meaning                                                             | Label                                                                                   |
| ----------------------------------- | ---------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| **Payment**                         | − amount   | Cash paid reduces what is owed.                                     | [Approved Fact] "Track payments"                                                        |
| **Discount** (only if discount > 0) | − discount | Amount forgiven by the supplier at settlement reduces what is owed. | [Approved Fact] "Track supplier discounts during payment"; [Business Rule] separate row |

[Business Rule] Total balance reduction from the payment = amount + discount.
Worked example: owe 1000; supplier accepts 950 as settlement → payment row
−950, discount row −50, balance −1000. The books show both what was paid and
what was forgiven.

## 3. Ordering & integrity rules

[Business Rule] — identical to docs/purchase/07 §3:

1. Only posted payments produce rows.
2. The statement is fully recomputable from documents; repeated computation
   agrees (no authoritative cache).
3. A row never changes after it appears.
4. The statement's "now" total IS the supplier balance shown everywhere
   (supplier list, detail header) — one derivation, many displays.

## 4. Interaction with allocation (BDR-04)

[Business Rule] Whether a payment is allocated to specific purchases (05)
**does not change the statement math above.** Allocation adds per-purchase
"paid status" views on top; the supplier balance and its rows are identical
with or without allocation. This is the invariant that lets allocation
remain a future extension without reopening this document.

## 5. Pending inputs

- **Opening balance (BDR-06)** — statement row zero, if approved.
- **Voiding a posted payment (BDR-07)** — if approved, a void produces a
  compensating row; it never edits or deletes the original payment row.
