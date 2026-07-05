# 06 — Purchase ↔ Purchase Return Relationship

> Purchase Architecture Freeze. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension].

## 1. Nature of the relationship

- A Purchase Return is its own document with the same lifecycle discipline
  (Draft → Posted, immutable after posting). [Approved Fact] — approved
  module + same lifecycle model (design 01 §0.1).
- A return **references** the purchase it corrects (identifier-only,
  one-directional storage; the reverse view is derived). [Business Rule]
- One purchase may have many returns (partial returns over time); one
  return corrects at most one purchase. Whether a return may exist with
  **no** purchase reference (standalone): **Decision Pending** — recorded in
  the design (01 §3) and unresolved; the frozen architecture supports the
  referenced form and leaves the standalone question open.

## 2. Returnable quantity

[Business Rule] For each line of a posted purchase:

> returnable(product, line) = posted quantity − Σ(quantities of the same
> line already returned by **posted** returns)

- Draft returns reserve nothing.
- A return exceeding the returnable quantity (or driving calculated stock
  negative): behavior is **Decision Pending (BDR-16** — warn vs block**)**;
  the calculation above is frozen either way.

## 3. Effects on balance

[Approved Fact] Balance is calculated. A **posted** return subtracts its
total from the supplier's calculated balance and appears as a credit row in
the statement (07). Draft returns have zero effect.

## 4. Effects on inventory

[Approved Fact] Inventory is calculated. A **posted** return's lines are
outgoing-quantity source rows (08), exactly mirroring the purchase's
incoming rows.

## 5. History and traceability

[Business Rule]

- Both documents are permanent: a fully-returned purchase is never hidden
  or deleted; the pair tells the true story.
- From a purchase, the derived view lists all returns against it (with
  state); from a return, the referenced purchase is one link away.
- Audit entries exist on both sides (their own post events).
- The chain purchase → returns → statement rows → inventory rows is fully
  reconstructible from posted documents alone — no stored aggregates.
  [Approved Fact] (calculated-values principle).

[Future Extension] Refund receipts (cash back from the supplier after a
return) belong to the Payments side and would reference the return the same
identifier-only way — pending business approval; nothing here changes.
