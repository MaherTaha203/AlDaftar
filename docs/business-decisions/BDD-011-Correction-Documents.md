# BDD-011 — Correction Documents (resolves BDR-07)

> **Status: Approved (owner, 2026-08-01).** This document records the owner's
> final decision on the correction workflow for posted financial documents,
> closing **BDR-07** (void/reversal policy) — the last open decision of the
> financial core. Architecture reviewed critically against the codebase and
> the frozen design docs before approval; the review confirmed the
> immutable-document model as the strongest long-term architecture for
> Al Daftar (no General Ledger, no document versioning, no ERP complexity).

## Core principle (approved)

A posted financial document is historical truth. It is never edited, never
deleted, never renumbered, never un-posted. History only grows. Every
correction is itself a document, linked to exactly one original document,
and every balance is derived from documents — nothing is stored as a mutable
balance. (This confirms and extends the already-frozen immutability rules in
`docs/purchase/05` and `docs/payments/06`.)

## The correction instruments

There is **no void status and no un-post**. BDR-07 is resolved by two new
correction documents instead:

### 1. إشعار دائن للمورد — Supplier Credit Note

- **Financial value only.** Strict boundary rule: _if goods physically moved
  back to the supplier → Purchase Return; if only financial value changes →
  Supplier Credit Note._ The two instruments never overlap.
- Canonical cases: supplier issued a credit; wrong (over-billed) price; an
  invoiced line that never existed physically; a duplicate invoice
  (full-value note); any pure financial correction.
- **Decrease-only.** A credit note reduces what the purchase asserted, never
  increases it. If additional money is owed to the supplier, the instrument
  is a **new purchase invoice** — positive corrections do not exist.
- Linked to exactly **one posted purchase**; the reference is set at draft
  creation and never changes.
- Fields: date, **amount > 0**, **reason type** (wrong-price /
  undelivered-line / supplier-credit / duplicate / other) with **optional
  description**, notes, and **optional line attributions**
  `{purchaseLineId, amount, note}` that, when present, must sum to the
  document amount (approved from day one).
- **Shared no-negative cap** (posting rule): the sum of all posted credit
  notes on a purchase may never exceed
  `purchase total − value of its posted returns − prior posted credit notes`.
  A purchase's net value can never go below zero through any combination of
  returns and credit notes.

### 2. سند استرداد دفعة — Payment Refund

- Records money returned by the supplier. The original payment is never
  edited.
- Linked to exactly **one posted payment**; the reference never changes.
- Mirrors the payment's two credit components: **amount** (cash refunded,
  capped at the payment's cash minus prior posted refunds) and
  **discountReversal** (cancels payment-time discount, capped at the
  payment's discount minus prior posted reversals). At least one must be
  positive. This makes a full reversal of a wrong payment possible without
  leaving a phantom discount credit.
- Fields: date, amount, discountReversal, **reason type** (money-returned /
  wrong-supplier / overpaid / duplicate / wrong-discount / other) with
  **optional description**, method, reference, notes.

## Shared document rules (both instruments)

- Lifecycle `Draft → Posted`, identical to every financial document
  (01 §0.1). Posted correction documents are themselves immutable — a wrong
  correction is corrected by a further document, never by editing.
- Numbering per the approved policy (BDD-005 / BDR-01): independent plain
  integer sequence per document type, assigned only at posting, never reset,
  never reused, no prefixes.
- Printable via the shared print scaffold; every print references the
  original document's type and number.
- Audit stays append-only; posting a correction writes a `post` entry like
  any document.
- Reports/balances pick corrections up through the derived model only.

## Supplier balance (approved formula)

```
balance = posted purchases
        − posted purchase returns
        − posted supplier credit notes
        − posted payments (amount + discount)
        + posted payment refunds (amount + discountReversal)
```

Derived at read time, as today. Nothing is stored.

## Document relationships & UI commitments

- Every correction document references exactly one original document.
- Every parent document carries a dedicated **«المستندات المرتبطة»
  (Linked Documents)** section listing all derived documents with direct
  navigation in both directions.
- Every document exposes one unified **«سجلّ المستند» (Document History)**
  — creation, posting, derived documents, attachments, audit events, notes —
  in one place. (The name is deliberately not "Timeline".)
- A purchase's history shows its returns and credit notes; a payment's
  history shows its refunds. Payments do **not** appear under purchases —
  the running-balance model (BDR-04 / DL-016) is unchanged and allocation is
  not introduced by this decision.

## Derived Document Framework (engineering commitment)

One **compositional** shared kit — not an inheritance layer, not a generic
table: shared helpers for numbering, lifecycle guards, remaining-basis caps,
derived-document lookup, and document-history building. Every document type
keeps its own table (parity-first), model, service, and screens. The
existing Purchase Return joins the framework as a pure refactor (also
retiring the TD-006 `nextNumber()` duplication). Reason fields extend to the
existing Purchase Return when it joins the framework (additive, optional).

## Amendment — Reversal cancellation of adjustment documents (DL-037)

Approved by the owner (2026-08-01) after live use surfaced the need to
retract a posted adjustment document itself (a note/refund entered by
mistake has no "further correction document" to correct it with).

- **Scope: the two adjustment documents ONLY** — supplier credit notes and
  payment refunds. Purchases, purchase returns, and payments remain
  strictly without any cancellation path; their reversal instruments are
  the correction documents themselves.
- A **POSTED** adjustment document may be **cancelled** («إلغاء») — never
  edited, never deleted, never renumbered. Cancellation is a permanent
  status transition `posted → cancelled` recording `cancelledAt` and a
  **required** `cancelReason`; the document's content and official number
  stay frozen forever and the number is never reused.
- The cancellation is itself an audited event (an `update` audit entry with
  full before/after snapshots and the reason in the summary) — the
  document's history shows it like any other event.
- Effect is purely subtractive and automatic: every derived figure
  (balances, statements, remaining-basis caps) already filters on
  `status = 'posted'`, so a cancelled document simply drops out and its
  value returns to the parent's correctable/refundable remainder.
- Cancelled documents remain fully visible in lists, details, history and
  print — marked «ملغى»; a printed cancelled document carries the marking
  in its title.
- Drafts are unaffected: a draft is still simply deleted.

## Explicitly out of scope / unchanged

- No General Ledger, no document versioning, no editing posted documents.
- No `void`/`cancelled` status on the ORIGINAL financial documents
  (purchases, returns, payments); `Unpost` remains a reserved audit action
  **with no producer, permanently** — reversal of originals happens only
  through correction documents. (The adjustment documents themselves gained
  a reversal cancellation by the DL-037 amendment above.)
- The deferred `Locked` state (DL-020) remains deferred — this decision
  removes its main prerequisite question but defines no lock trigger.
- Payment allocation (BDD-004) unchanged.
- Custody (سندات استلام البضاعة) unchanged — it carries no money.

## Decision trail

- Proposed by the owner (2026-08-01), critically reviewed by engineering
  against the live codebase (services already enforce posted-immutability;
  balances already fully derived; audit already append-only), amended with:
  the physical/financial boundary rule, decrease-only credit notes, the
  two-component refund, the shared no-negative cap, BDD-005 numbering, and
  the compositional (non-inheritance) framework — then **approved by the
  owner** with final naming: «إشعار دائن للمورد» and «سند استرداد دفعة»,
  line attributions from day one, reason type + optional description on
  every derived document, and the Linked Documents section on every parent.
- Recorded as **DL-036**; implementation proceeds in phases (docs → shared
  kit → credit note → refund → balances/reports → UI → document history).
