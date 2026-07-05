# 02 — Purchase Structure

> Purchase Architecture Freeze. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension]. A Purchase **is** the goods receipt
> ([Approved Fact] — "Purchase = Goods Receipt").

## 1. Identity

- **Internal id** — permanent unique identifier, assigned at first save
  (Draft). Never shown as the official number. [Business Rule]
- **Official number** — assigned only at posting; drafts have none
  ([Approved Fact] — design 01 §0.1). [Approved Fact — BDR-01, BDD-005]:
  plain integer from the Purchase type's own sequence (1, 2, 3…), no
  prefix/year, never reset, never reused.

## 2. Sections

### Header — Supplier

- Reference to exactly one supplier by id ([Business Rule]; identifier-only
  references per business-architecture R2). Must be Active at posting (04).
- The supplier reference is part of the immutable content after posting.

### Header — Document information

- **Date** (required): the receipt date. [Business Rule]
- **Supplier-invoice reference** (their number/date) **or** the explicit
  "بدون فاتورة مورد / without supplier invoice" flag — the core monitoring
  purpose. [Approved Fact] — project purpose "purchases that may arrive
  without supplier invoices"; design S-20/S-22.
- **Currency** — [Approved Fact — BDR-02, BDD-006]: single bookkeeping
  currency ILS; the document carries no currency field (system constant).
- Tax fields — **absent**; pending BDR-09. [Approved Fact: pending]

### Items

- One or more Purchase Lines (03). At least one line is required to post
  (04). [Business Rule]

### Totals

- Calculated only, never entered: sum of line totals ([Approved Fact] —
  "reports/balances are calculated"; 03 fixes the line math). Stored totals
  may be persisted for display but are always recomputable and never
  authoritative over the lines. [Business Rule]

### Attachments

- Zero or more archived files linked by (entity type, id). Permitted in
  every state, including Posted — the archive grows even when the books are
  frozen. [Approved Fact] — project purpose "archive attachments"; design
  01 §5. Deletion rules pending BDR-08.

### Notes

- Free text, part of document content → immutable after posting (05).
  [Business Rule]

### Audit

- Audit entries reference the document; they are records **about** it, not
  content **inside** it — posting immutability does not block audit
  accumulation. [Business Rule] Scope pending BDR-11.

### Status

- Exactly one lifecycle state (01). [Approved Fact]

## 3. Relationships

| Related record         | Cardinality | Nature                                                                                     |
| ---------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| Supplier               | N : 1       | Identifier reference; purchase is a row in the supplier's statement (07).                  |
| Purchase Return        | 1 : N       | Returns reference the purchase; returnable quantity derives from them (06).                |
| Payment                | indirect    | Payments affect the same supplier balance; direct allocation is BDR-04 (Decision Pending). |
| Inventory (stock rows) | 1 : N       | Posted lines are the incoming-quantity source rows (08).                                   |
| Attachments            | 1 : N       | Polymorphic link. [Approved Fact]                                                          |
| Audit entries          | 1 : N       | Reference-only (above).                                                                    |

[Future Extension] Costing data on relationships (08 §Future), tax
breakdown (BDR-09), and voiding linkage (BDR-07) attach here if approved —
none changes the frozen sections above.
