# 04 — Discount Behavior

> Payments Design Gate. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension].

## 1. Where discounts live

[Approved Fact] Supplier discounts are tracked **at payment time**
(execution-contract project fact: "Track supplier discounts during
payment"). Therefore:

- Purchases carry **no** discount field (frozen docs/purchase/03 §5).
- The discount is a field on the **payment** document (02 §3): the settlement
  discount the supplier grants when the payment is made.

[Business Rule] Entry-time (per-line / per-document) purchase discounts
remain **[Decision Pending — BDR-03 residual]** and are NOT part of this
frozen architecture.

## 2. How a discount is recorded

[Business Rule]

- Optional amount, ≥ 0, in ILS (2 decimals, half-up), entered on the payment
  beside the paid amount — **never inside it**.
- A payment may have amount only, amount + discount, or (edge) discount only
  (a pure write-off the supplier grants without cash changing hands) — the
  latter is allowed because amount and discount are independent credits;
  posting still requires amount > 0 OR discount > 0 is a **[Business Rule]**:
  at least one of them must be positive for the document to have any effect.

  > Refinement: to keep posting rules simple and unambiguous, the frozen rule
  > is **amount > 0 is required** (a payment is a payment); a pure write-off
  > with no cash is a **[Future Extension]** (a separate "discount/credit
  > note" instrument) rather than a zero-amount payment. This avoids a
  > zero-cash "payment" that is really something else.

## 3. How a discount affects balances

[Approved Fact + Business Rule] The discount is a **separate credit** that
reduces the supplier balance by its amount, exactly like the cash payment
reduces it by the paid amount (03 §2). Both are derived from the posted
payment; neither is stored as an aggregate.

## 4. How a discount appears in reports

[Business Rule]

- **Supplier statement (R-02):** its own labeled credit row (03 §2).
- **Payments report (R-07):** the discount is shown in a **separate column**
  from the paid amount; period totals report cash paid and discounts
  obtained distinctly.
- **Discounts report (R-09):** aggregates payment-time discounts by supplier
  and period. Its exact columns are part of the report catalog (BDR-10);
  this document fixes only that the data exists and is separable.

[Business Rule] At no point is a discount silently netted into a price or a
paid amount — visibility of "what was forgiven" is the reason it is a first
-class field.

## 5. Future extensions

[Future Extension] — none required for v1:

- Percentage-entry discounts (enter 5%, system computes the amount) — a UI
  convenience over the same stored amount.
- Pure write-off / credit-note instrument (§2) if the business needs cashless
  forgiveness as its own document.
