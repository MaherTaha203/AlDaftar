# 01 — Payment Lifecycle

> Payments Design Gate (Phase 14 preparation). Design only, no code. Labels:
> **[Approved Fact]** (sourced), **[Business Rule]** (fixed by this freeze
> from approved facts), **[Future Extension]** (not in the frozen scope),
> **[Decision Pending]** (named BDR, unresolved). Payments reuse the frozen
> document model already proven for Purchases (docs/purchase/01) — this is
> not a new pattern.

## 1. States

| State      | Meaning                                                                 | Label                                                             |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Draft**  | Being entered. No official number. Affects nothing (no balance effect). | [Business Rule] — mirrors the approved document model             |
| **Posted** | Official. Content immutable. Credits the supplier balance/statement.    | [Business Rule] — same immutability principle as posted purchases |

**Archived / Cancelled — do not exist for payment documents.** [Business
Rule] A posted payment is part of the books forever. Voiding a posted
payment is **[Decision Pending — BDR-07]**; until approved, the only states
are Draft and Posted.

## 2. Actors

[Approved Fact] Single user — the owner. Every transition is performed by
the owner; no roles, no approvals.

## 3. Allowed transitions

| From  | To     | Trigger            | Label           |
| ----- | ------ | ------------------ | --------------- |
| (new) | Draft  | First save         | [Business Rule] |
| Draft | Draft  | Any edit / re-save | [Business Rule] |
| Draft | Posted | POST (rules in §5) | [Business Rule] |

Draft deletion: **[Decision Pending — BDR-15]** (shared with purchases).

## 4. Forbidden transitions

[Business Rule] — consequences of immutability:

- Posted → Draft (un-posting) — never.
- Posted → edited / deleted / renumbered — never.
- (new) → Posted without draft validation — never.

## 5. Posting rules (summary; full effects in 03)

[Business Rule] POST validates in order, stops at first failure, persists
nothing on failure:

1. **State** — the document is a Draft.
2. **Supplier** — exists and is Active.
3. **Amount** — a number > 0 in ILS (BDR-02).
4. **Discount** — if present, a number ≥ 0 in ILS (04).
5. **Method** — a method is selected (the enumerated list is
   **[Decision Pending — BDR-05]**; the field is required once that list
   exists — until then the field is validated as non-empty text).
6. **Date** — present and a real date.

On success, **atomically** [Business Rule] (business-architecture R4;
ADR-0001 single service path):

| #   | Effect                                                                                                                          | Label                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| 1   | Official number issued from the **Payment** sequence (plain integer, per-type, never reset/reused, assigned only now).          | [Approved Fact — BDR-01, BDD-005] |
| 2   | Draft → Posted; content frozen.                                                                                                 | [Business Rule]                   |
| 3   | Supplier balance/statement now include the payment credit (and discount credit, 03/04). No stored balance mutated — calculated. | [Approved Fact]                   |
| 4   | One audit entry (actor, action=posted, reference, timestamp, amount). Scope pending BDR-11.                                     | [Business Rule]                   |

## 6. Atomicity & rollback

[Business Rule] All-or-nothing; idempotent-safe (re-POST rejected by step 1);
no partial-posted state — identical guarantees to purchase posting
(docs/purchase/04 §4), reusing the same service pattern.

## 7. Relations

- Payment `N : 1` Supplier (identifier reference; a row in the statement, 03).
- Payment ↔ Purchases: **indirect** — payments reduce the same supplier
  balance; **direct allocation is [Decision Pending — BDR-04]**, architected
  in 05 without implementation.
- Payment `1 : N` Attachments (proof of payment; 02).
- Payment `1 : N` Audit entries (reference-only).
