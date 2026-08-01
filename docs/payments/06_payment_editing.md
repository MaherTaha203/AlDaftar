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

| Mistake                                               | Correction                                                                                                                                                                            |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Paid too little                                       | A **new payment** for the remainder. [Business Rule]                                                                                                                                  |
| Paid the wrong supplier, or paid too much / duplicate | **Payment Refund «سند استرداد دفعة»** (BDD-011 / DL-036): a new linked document recording the money returned — cash `amount` capped at the payment's cash minus prior posted refunds. |
| Wrong discount recorded                               | The refund's **discountReversal** component cancels payment-time discount (capped at the payment's discount minus prior reversals) — so a full reversal leaves no phantom credit.     |

Each refund carries a reason type (+ optional description). The posted
payment itself is never edited; a wrong refund is corrected by a further
document.

[Business Rule] Every correction leaves both the original and the correction
visible and linked — the books never hide history. Both directions are
navigable via the Linked Documents section and the Document History
(«سجلّ المستند»).

## 4. Relationship to allocation

[Business Rule] Because allocation (05) never changes the payment's amount or
the balance, editing rules are unaffected by whether allocation is
implemented: the posted payment's financial content is frozen either way.
