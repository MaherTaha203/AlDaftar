# 05 — Purchase Editing

> Purchase Architecture Freeze. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension].

## 1. Before posting (Draft)

[Business Rule] A draft is fully editable by the owner:

- All header fields — supplier, date, supplier-invoice reference /
  "without invoice" flag, currency slot (BDR-02), notes.
- All lines — add, edit, remove, reorder.
- Attachments — add; removal while draft is permitted (design 01 §5),
  final policy pending BDR-08.

Draft deletion: **Decision Pending (BDR-15)** — until answered, drafts are
kept (they affect nothing).

## 2. After posting (Posted)

[Approved Fact] "Purchase becomes immutable after Posting."

**Allowed** (none of these change document content):

- View, print.
- Attach files (the late-arriving supplier invoice is the canonical case —
  journey J3). [Approved Fact]
- Be referenced by new Purchase Returns (06).
- Accumulate audit entries about it (02 §Audit).

**Forbidden — permanently** [Business Rule]:

- Changing any header field (including the supplier-invoice reference: a
  late invoice is **attached**, never typed into the frozen content).
- Adding, editing, or removing lines.
- Changing date, supplier, notes, totals.
- Renumbering, un-posting, deleting.

## 3. Correction strategy

[Approved Fact — BDD-011 / DL-036, 2026-08-01] Corrections are performed by
immutable linked documents under a strict boundary rule: **goods physically
moved back → Purchase Return; only financial value changes → Supplier Credit
Note «إشعار دائن للمورد»**. The two instruments never overlap. There is no
void and no un-post — permanently.

| Mistake discovered after posting                      | Correction                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Too much quantity received/recorded, goods going back | Return of the excess quantity (06).                                                                                             |
| Over-billed price / supplier issued a credit          | **Supplier Credit Note** — value-only, decrease-only, with reason type (+ optional description) and optional line attributions. |
| Invoiced line that never existed physically           | **Supplier Credit Note** for that line's value.                                                                                 |
| Duplicate invoice / wrong supplier (no goods to move) | **Supplier Credit Note** for the full value; both documents remain in the books, linked.                                        |
| Under-billed / additional money owed                  | A **new purchase invoice** — positive corrections do not exist.                                                                 |

[Business Rule] Shared no-negative cap: posted credit notes on a purchase
may never exceed `purchase total − posted returns value − prior posted
credit notes` — a purchase's net value never goes below zero.

[Business Rule] Every correction leaves both the mistake and the correction
visible and linked — the books never hide history. Both directions are
navigable via the Linked Documents section and the Document History
(«سجلّ المستند»).

## 4. Relationship with Purchase Return (summary)

The return is the _only_ instrument that reduces what a posted purchase
asserted (quantity in, amount owed). Full detail in
06_purchase_return_relationship.md.
