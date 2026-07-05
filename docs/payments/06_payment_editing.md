# 06 — Payment Editing Rules

> Payments Design Gate. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Decision Pending].

## 1. Before posting (Draft)

[Business Rule] A draft payment is fully editable by the owner: supplier,
date, amount, discount, method, reference, notes, attachments (add; removal
while draft permitted, final policy BDR-08). Draft deletion is
[Decision Pending — BDR-15].

## 2. After posting (Posted)

[Business Rule] — the immutability principle, identical to posted purchases
(docs/purchase/05):

**Allowed** (none change document content): view, print, attach files,
accumulate audit entries about it.

**Forbidden — permanently:** changing supplier, date, amount, discount,
method, reference, or notes; renumbering; un-posting; deleting.

## 3. Correction strategy

[Business Rule] A posted payment is immutable, so a mistake is corrected by
a **new document**, never by editing history. The correct instrument depends
on the mistake:

| Mistake                                               | Correction                                                                                                                                                                                                                                                                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paid too little                                       | A **new payment** for the remainder. [Business Rule]                                                                                                                                                                                                                                                                |
| Paid the wrong supplier, or paid too much / duplicate | **[Decision Pending — BDR-07]** (void policy). Reversing cash out needs either a void of the posted payment or a supplier refund receipt (05 §5). Neither is approved yet; until then the frozen rule is: the posted payment stands and the correction instrument is deferred. No editing/deleting is ever allowed. |
| Wrong discount recorded                               | Same as above — deferred to BDR-07; the payment is not edited.                                                                                                                                                                                                                                                      |

[Business Rule] Every correction, once its instrument is approved, will
leave both the original and the correction visible and linked — the books
never hide history (consistent with the purchase correction principle).

## 4. Relationship to allocation

[Business Rule] Because allocation (05) never changes the payment's amount or
the balance, editing rules are unaffected by whether allocation is
implemented: the posted payment's financial content is frozen either way.
