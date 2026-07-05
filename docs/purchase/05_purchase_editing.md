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

[Approved Fact] "Corrections are performed by Purchase Return."

| Mistake discovered after posting                | Correction                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Too much quantity received/recorded             | Return of the excess quantity (06).                                                                                                                      |
| Wrong price / wrong totals agreed with supplier | Return + re-purchase at correct values, or settlement at payment time (approved payment-time discount) as the business chooses.                          |
| Wrong supplier / duplicate document             | Full-quantity return neutralizes it; both documents remain in the books, linked (06 traceability). Voiding as a shortcut: **Decision Pending (BDR-07)**. |

[Business Rule] Every correction leaves both the mistake and the correction
visible and linked — the books never hide history.

## 4. Relationship with Purchase Return (summary)

The return is the _only_ instrument that reduces what a posted purchase
asserted (quantity in, amount owed). Full detail in
06_purchase_return_relationship.md.
