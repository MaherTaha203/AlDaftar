# 02 — Payment Document Structure

> Payments Design Gate. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension] / [Decision Pending].

## 1. Identity

- **Internal id** — permanent UUID, assigned at first save (Draft), never
  shown as the official number. [Business Rule]
- **Official number** — assigned only at posting; drafts have none. Plain
  integer from the Payment type's own sequence (BDR-01). [Approved Fact]

## 2. Header — Supplier

- Reference to exactly one Active supplier by id (identifier-only,
  business-architecture R2). Part of the immutable content after posting.
  [Business Rule]

## 3. Header — Document information

| Field         | Rule                                                                                                                                                                  | Label                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **Date**      | Required; the payment date.                                                                                                                                           | [Business Rule]                                                                           |
| **Amount**    | Required; number > 0 in ILS, 2 decimals, half-up. The cash actually paid.                                                                                             | [Business Rule], currency [Approved Fact — BDR-02]                                        |
| **Currency**  | Not a field — single bookkeeping currency ILS (system constant).                                                                                                      | [Approved Fact — BDR-02]                                                                  |
| **Discount**  | Optional; number ≥ 0 in ILS. Settlement discount granted by the supplier at payment (04). Recorded separately from Amount, never merged.                              | [Approved Fact] "Track supplier discounts during payment"; [Business Rule] separate field |
| **Method**    | Required. The payment channel (cash / bank transfer / cheque / …). The **enumerated list is [Decision Pending — BDR-05]**; the field and its required-ness are fixed. | [Business Rule]; list [Decision Pending]                                                  |
| **Reference** | Optional free text — the method's reference (transfer no., cheque no.). LTR.                                                                                          | [Business Rule]                                                                           |
| **Notes**     | Optional free text; document content → immutable after posting.                                                                                                       | [Business Rule]                                                                           |
| **Tax**       | Absent. Payments carry no tax (tax pending BDR-09 for documents that have it).                                                                                        | [Business Rule]                                                                           |

## 4. Attachments

Zero or more archived files (payment proof — receipt/transfer image),
linked by (entity type, id). Permitted in every state, including Posted.
[Approved Fact] — project purpose "archive attachments"; deletion policy
pending BDR-08.

## 5. Audit

Audit entries reference the payment (records **about** it, not content
inside it); posting immutability does not block audit accumulation.
[Business Rule] Scope pending BDR-11.

## 6. Status

Exactly one lifecycle state (01). [Business Rule]

## 7. Calculated fields

- **Total credit to supplier = amount + discount** — the amount the
  supplier's balance decreases by when this payment posts. Never entered;
  the two components remain separately visible (03/04). [Business Rule]

Nothing else is stored as an aggregate: the supplier balance itself is
calculated across all documents (07 of the purchase architecture; approved
calculated-values principle). [Approved Fact]

## 8. Relationships

| Related record | Cardinality | Nature                                                                     |
| -------------- | ----------- | -------------------------------------------------------------------------- |
| Supplier       | N : 1       | Identifier reference; a credit row (or two) in the statement (03).         |
| Purchase       | indirect    | Same-supplier balance; direct allocation [Decision Pending — BDR-04] (05). |
| Attachments    | 1 : N       | Polymorphic link. [Approved Fact]                                          |
| Audit entries  | 1 : N       | Reference-only.                                                            |

[Future Extension] The optional **allocations** array (05) and a
**refund-receipt** counterpart (supplier cash-back) attach here if approved;
neither changes the fields above. [Business Rule] The frozen structure
reserves those seams without modeling them.
