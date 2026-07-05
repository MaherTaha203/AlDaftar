# BDD-008 — Inventory Rules

> **Status: Template — awaiting business input.** Created under the neutrality
> rules of `docs/business-architecture.md` (§Pending: PD-13).
> Business sections are filled only by the business owner; engineering never
> invents inventory behavior here.

## Purpose

Once approved, this document defines whether and how AlDaftar tracks
inventory: scope (none / quantities / valuation), what moves stock, and how
corrections are handled.

## Scope

- Covers: whether inventory is tracked, what changes stock levels, units of
  measure, stock corrections, and valuation (if any).
- Does not cover: the product catalog itself (its BDD is not yet defined —
  see `README.md` gaps), document types (BDD-003).

## Approved Facts

- F9: Inventory and Product are mentioned vocabulary only.
- Whether inventory is tracked at all is **not approved**.

## Pending Decisions

- PD-13 — inventory scope: none / quantity-only / with valuation.
  **Decision Pending.**
- What movements affect stock, units of measure, and correction mechanism —
  all **Requires Business Approval** (only if inventory is in scope).

## Business Questions

1. Does the company need to know stock quantities from this system, or is it
   purely financial record-keeping?
2. If yes: which events change stock (purchases? returns? anything else —
   losses, own use, counting differences)?
3. Are items counted physically? How are differences handled today?
4. What units are items measured in? Can one item have multiple units?
5. Does the company need stock **value**, or quantities only?

## Engineering Notes

- If inventory is approved, recommendation R1/R3 applies: a derived stock
  ledger rebuildable from approved documents, with no hand-edited balances.
  If inventory is out of scope, no inventory module is built.
- Valuation (costing methods) is a materially larger scope than quantities;
  the answer to question 5 sizes the module.

## Future Expansion

- Inventory valuation and dedicated stock-adjustment documents — listed in
  `docs/business-architecture.md` §4; only if promoted and approved.

## Decision Table

| Decision                             | Status  |
| ------------------------------------ | ------- |
| Inventory in scope at all (PD-13)    | Pending |
| Stock-affecting events (PD-13)       | Pending |
| Units of measure (PD-13)             | Pending |
| Physical count / corrections (PD-13) | Pending |
| Valuation vs quantity-only (PD-13)   | Pending |
