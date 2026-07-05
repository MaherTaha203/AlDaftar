# BDD-006 — Currency Rules

> **Status: Template — awaiting business input.** Created under the neutrality
> rules of `docs/business-architecture.md` (§Pending: PD-07; tax touches
> PD-08). Business sections are filled only by the business owner; engineering
> never invents currency or rounding rules here.

## Purpose

Once approved, this document defines the currency (or currencies) the books
are kept in and the rules for amounts: precision, rounding, and any
foreign-currency handling.

## Scope

- Covers: bookkeeping currency, amount precision, rounding rules, and whether
  foreign-currency dealings must be recorded.
- Does not cover: tax rates and tax calculation (no BDD assigned yet — see
  `README.md` gaps), document contents (BDD-003).

## Approved Facts

- F2/F4: single company, single-user system.
- No currency, precision, or rounding rule is approved at this time.

## Pending Decisions

- PD-07 — bookkeeping currency and any foreign-currency requirements.
  **Decision Pending.**
- Rounding rules for amounts. **Requires Business Approval.**

## Business Questions

1. In which currency does the company keep its books?
2. Are any supplier dealings in other currencies? If yes: how are they
   recorded today (converted at what rate, from what source)?
3. To how many decimal places are amounts recorded on the paper documents?
4. When totals are computed on paper documents, how are fractions rounded
   (and does any tax authority rule apply)?
5. Could the bookkeeping currency ever change?

## Engineering Notes

- A shared Money value object is the intended home for representation and
  rounding once rules are approved (`lib/domain/value-objects` is reserved
  for it); its design waits for the answers above.
- Multi-currency materially affects every document module; the answer to
  question 2 is needed before any document module is designed.

## Future Expansion

- Multi-currency support with rate management — listed in
  `docs/business-architecture.md` §4; only if promoted and approved.

## Approved Decision (2026-07-04 — BDR-02, owner-approved)

The books are kept in a single currency: **ILS (شيكل)**. All amounts carry
**2 decimal places** with **half-up rounding**. No foreign-currency dealings
are recorded in v1 (multi-currency remains a listed future possibility).
Consequence: documents carry no currency field in the UI — the bookkeeping
currency is a system-level constant.

## Decision Table

| Decision                           | Status                                     |
| ---------------------------------- | ------------------------------------------ |
| Bookkeeping currency (PD-07)       | Approved — ILS, single currency            |
| Foreign-currency recording (PD-07) | Approved — none in v1 (future possibility) |
| Amount precision                   | Approved — 2 decimal places                |
| Rounding rules                     | Approved — half-up                         |
