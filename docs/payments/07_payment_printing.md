# 07 — Payment Printing Specification

> Payments Design Gate. Design only. Consistent with the shared print rules
> (docs/system-design/05_Printing_Specification.md). The concrete print view
> is built in the Printing phase (P21); this fixes its content. Labels:
> [Business Rule] / [Decision Pending].

## 1. Document

The **payment voucher** (design S-44). A4 portrait, RTL, Arabic typography,
amounts in ILS with 2 decimals; numbers/dates/reference LTR-isolated
(05 §1). Draft prints carry the «مسودة» watermark; posted do not.
[Business Rule]

## 2. Content

| Block              | Content                                                                                                                                | Label                                    |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Header             | Company name/logo (Settings); title «سند دفع»; page x/y; print timestamp; footer «مستند داخلي» (AlDaftar issues no external receipts). | [Business Rule]                          |
| Identity           | Official number (posted) or «مسودة»; date.                                                                                             | [Business Rule]                          |
| Supplier           | Supplier name.                                                                                                                         | [Business Rule]                          |
| Amount             | The paid amount, prominent (MoneyDisplay, ILS).                                                                                        | [Business Rule]                          |
| Discount           | Shown as a separate line only when > 0 (never merged into the amount, 04).                                                             | [Business Rule]                          |
| Method + reference | The payment method (BDR-05 list pending) and its reference.                                                                            | [Business Rule]; list [Decision Pending] |
| Notes              | If present.                                                                                                                            | [Business Rule]                          |
| Allocation table   | Only if BDR-04 approves allocation: purchase number, applied amount (05). Absent otherwise.                                            | [Decision Pending — BDR-04]              |
| Amount in words    | Per BDR-19 (pending) — printed only if approved.                                                                                       | [Decision Pending — BDR-19]              |
| Signatures         | «المستلم» / «الدافع».                                                                                                                  | [Business Rule]                          |

## 3. Rules

[Business Rule] WYSIWYG (what shows in the print view is what prints);
posted content is immutable so the voucher is a faithful, reproducible record
of the posted payment. No PDF generation is designed for v1 (export is part
of BDR-10); the browser print dialog is the mechanism (05 §7).
