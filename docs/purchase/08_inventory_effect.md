# 08 — Inventory Effects

> Purchase Architecture Freeze. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension].

## 1. Model

[Approved Fact] "Inventory is calculated." There is no stored stock
counter; quantity-on-hand is derived from posted documents only.

## 2. Incoming quantity

[Business Rule] Every line of a **posted** purchase contributes an incoming
quantity: (product, unit, +quantity, source = purchase id, date). Drafts
contribute nothing.

## 3. Returned (outgoing) quantity

[Business Rule] Every line of a **posted** purchase return contributes an
outgoing quantity: (product, unit, −quantity, source = return id, date).

## 4. Current quantity

[Business Rule]

> on-hand(product) = Σ incoming − Σ outgoing, over posted documents

- Computed per product; grouped by unit until unit-conversion rules exist
  (pending BDD-008 — quantities in different units are NOT summed together;
  they are reported per unit).
- Negative calculated stock: **Decision Pending (BDR-16)** — the
  architecture computes it either way; the decision only sets warn/block at
  return entry.
- The stock figure shown anywhere (product list, product detail, R-08
  report) is this single derivation.

## 5. Integrity rules

[Business Rule]

1. Inventory rows are consequences of posting, never directly creatable or
   editable — no manual stock adjustments exist (a correcting **document**
   is the only instrument; a dedicated adjustment document is a listed
   future possibility requiring approval).
2. Rebuilding inventory from scratch over the same posted documents always
   yields the same result.
3. The purchase and return that produced a quantity are one link away from
   any stock row (source references — traceability).

## 6. Future costing placeholder

[Future Extension] — explicitly out of the frozen scope
([Approved Fact]: quantities only; no costing method in v1):

- If costing is ever approved, each incoming row already carries the data a
  costing method needs (quantity, unit price, date, source); a valuation
  layer would read these rows without altering them.
- Costing method choice (FIFO / weighted average), valuation reports, and
  stock-value effects of returns are all part of that future decision —
  nothing in the frozen architecture presumes any of them.
