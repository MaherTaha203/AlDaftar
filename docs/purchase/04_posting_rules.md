# 04 — Posting Rules

> Purchase Architecture Freeze. Design only — what POST means, without code.
> Labels: [Approved Fact] / [Business Rule] / [Future Extension].

## 1. Validation order

[Business Rule] POST validates in this exact order and stops at the first
failure (nothing is persisted on failure):

1. **State** — the document is a Draft (01 forbids everything else).
2. **Supplier** — exists and is Active.
3. **Lines present** — at least one line.
4. **Each line** — product exists + Active; unit exists + Active;
   quantity > 0; unit price ≥ 0 (03).
5. **Date** — present and a real date. (Whether future dates or locked
   periods are forbidden: **Decision Pending** — BDR/PD fiscal-periods; no
   rule is frozen.)
6. **Supplier-invoice info** — either a reference is present or the
   "without supplier invoice" flag is explicitly set (02); never both empty
   silently. [Business Rule]

## 2. Effects on success — one atomic unit

[Approved Fact + Business Rule] All of the following happen together or not
at all (business-architecture R4; ADR-0001 single service path):

| #   | Effect                      | Detail                                                                                                                                                                                                                  |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Number assignment**       | The official number is issued at this moment and never reused ([Approved Fact] — drafts have no number). [Approved Fact — BDR-01]: next plain integer of the Purchase sequence (per-type, no prefix/year, never reset). |
| 2   | **State change**            | Draft → Posted; content frozen from this instant (05).                                                                                                                                                                  |
| 3   | **Inventory effect**        | Each line becomes an incoming-quantity source row (08). No stored stock counter is mutated — inventory is calculated ([Approved Fact]).                                                                                 |
| 4   | **Supplier balance effect** | The document total now counts in the supplier's calculated balance and statement (07). No stored balance is mutated ([Approved Fact]).                                                                                  |
| 5   | **Audit effect**            | One audit entry: actor (the owner), action = posted, document reference, timestamp, total. Scope details pending BDR-11.                                                                                                |

## 3. Attachment behavior

[Business Rule] Attachments are independent of posting: files attached
before POST remain; attaching after POST stays allowed (02). Posting never
requires, copies, or locks attachments. Deletion policy pending BDR-08.

## 4. Atomicity and rollback

[Business Rule]

- POST is all-or-nothing. If any effect cannot be applied (numbering,
  persistence, audit), **no** effect persists: the document remains a Draft,
  no number is consumed, no inventory/balance/audit trace exists.
- POST is idempotent-safe: re-executing POST on an already-Posted document
  is rejected by validation step 1 — it can never double-apply effects.
- There is no partial-posted state, ever.

## 5. After POST

[Approved Fact] The document is immutable (05). The only subsequent
operations touching it: viewing, printing, attaching files, and being
referenced by Purchase Returns (06).

[Future Extension] If BDR-07 approves voiding, void will be a mirror-image
atomic operation (reversal + counter inventory rows + audit), never a
mutation of this document's content.
