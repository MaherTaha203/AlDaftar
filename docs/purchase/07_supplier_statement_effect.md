# 07 — Supplier Statement Effects

> Purchase Architecture Freeze. Business flow only. Labels:
> [Approved Fact] / [Business Rule] / [Future Extension].

## 1. The statement model

[Approved Fact] The supplier balance is **calculated**, never stored. The
statement is the ordered projection of the supplier's **posted** documents:

> balance = opening balance (Decision Pending — BDR-06) + purchases −
> returns − payments − payment-time discounts

[Business Rule] Rows appear in date order (tie-break: posting order). Draft
documents never appear. Every row shows: date, document type + number,
debit/credit amount, running balance.

## 2. Effect of each document

| Document                     | Statement effect                                                                                                                                                                            | Label                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| **Purchase (posted)**        | Debit row (+ total): the company owes more.                                                                                                                                                 | [Approved Fact] — purchases create supplier debt                                            |
| **Purchase Return (posted)** | Credit row (− total): owed less.                                                                                                                                                            | [Approved Fact]                                                                             |
| **Payment (posted)**         | Credit row (− amount paid).                                                                                                                                                                 | [Approved Fact] — "Track payments"                                                          |
| **Payment-time discount**    | Its own labeled credit row (− discount), recorded with the payment but **never** silently merged into the paid amount — the statement shows what was paid and what was forgiven separately. | [Approved Fact] — "Track supplier discounts during payment"; [Business Rule] — separate row |

## 3. Ordering and integrity rules

[Business Rule]

1. Only **posted** documents produce rows; posting order is immutable
   history.
2. The statement is fully recomputable at any time from the documents; two
   computations over the same documents always agree (no caches with
   authority).
3. A row never changes after it appears (documents are immutable); new
   information arrives only as new rows.
4. The statement total for "now" IS the supplier balance shown everywhere
   else (list, detail header) — one derivation, many displays.

## 4. Pending inputs

- Opening balance: **BDR-06** — if approved, it is row zero of the
  statement, established once per the decision's rules.
- Payment ↔ purchase allocation (**BDR-04**) does not change the statement
  math above; it adds per-document "paid status" views on top.

[Future Extension] Statement export/print periods and formats follow the
Reports/Printing phases; the math here is what they render.
