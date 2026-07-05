# 08 — User Journeys

> Design only. End-to-end journeys of the single user (the owner) through
> the designed screens (S-xx), dialogs (D-xx), and reports (R-xx). Each
> journey names its touchpoints so the design can be walked and verified
> screen by screen. BDR-xx = pending business decision, designed around.

## J1 — New supplier

1. Sidebar → Suppliers (S-10). Empty state offers «مورد جديد».
2. S-12: enters the name; adds phone; opening balance only if BDR-06
   approves the field.
3. Save → S-11 with a success toast. Balance shows 0 (or the opening
   value). The supplier now appears in every picker.

**Outcome:** supplier ready; zero configuration elsewhere.

## J2 — Receive goods WITH a supplier invoice

1. Header quick action «+ شراء جديد» → S-22.
2. Picks the supplier (recently-used shows it first), keeps today's date.
3. Enters the supplier's invoice number and date; attaches the invoice scan
   via D-05 right away (phone photo or file).
4. Adds lines in the LinesGrid; a missing product is created inline through
   D-08 without leaving the form.
5. Reviews the calculated total against the paper; presses «ترحيل / Post» →
   D-01 shows supplier, count, total, and the irreversibility note.
6. Confirms → S-21; toast shows the issued number (BDR-01).

**Outcome:** immutable purchase; balance and stock (R-03/R-08) already
reflect it; the paper is archived.

## J3 — Receive goods WITHOUT a supplier invoice (core scenario)

1. Same as J2 but toggles «بدون فاتورة مورد» — no reference to enter.
2. Attaches whatever evidence exists (delivery note photo), posts.
3. The purchase carries the "no invoice" badge on S-20, S-21, and prints
   (05 §2) — and R-04's "without supplier invoice" toggle lists it.
4. **Weeks later the invoice arrives:** the document is Posted and
   immutable, so she opens S-21 → Attachments tab → uploads the invoice
   scan with a note. If its totals disagree with what was recorded, the
   correction path is a Purchase Return (J5) — content is never edited.

**Outcome:** the exact monitoring loop the system exists for: nothing
undocumented gets lost, and late invoices land in the archive.

## J4 — Partial payment

1. S-11 (supplier) → the balance is visible in the header → «دفع / Pay».
2. S-42 opens pre-filled with the supplier; enters an amount smaller than
   the balance; picks the method (BDR-05); attaches the transfer receipt.
3. If BDR-04 approved allocation: D-10 panel lists open purchases and she
   distributes the amount; otherwise no allocation step exists.
4. Posts (D-01) → S-41; prints the voucher (S-44) for her records.
5. Back on S-11, the calculated balance already shows the reduction; the
   statement tab (R-02) shows the payment row with the running balance.

**Outcome:** partial payments need no special handling — the balance is
always calculated, never maintained.

## J5 — Purchase return (correction path)

1. Realizes 2 of 10 items were damaged. Finds the purchase: global search
   by its number (or S-20 filter) → S-21.
2. «إنشاء مرتجع» → S-32 pre-filled; all quantities default per the design
   to the returnable remainder; she zeroes other lines, sets 2 on the
   damaged item.
3. Attempts to return more than purchased would warn/block per BDR-16.
4. Posts → S-31; the original S-21 now shows the return in its Related tab;
   balance and stock adjust; prints S-34 to send with the goods.

**Outcome:** the approved correction mechanism, linked in both directions.

## J6 — Supplier discount

1. Supplier grants a discount. Where it is recorded depends on **BDR-03**:
   during purchase entry (line/document discount on S-22) or at payment
   time (settlement discount on S-42) — the screens carry the fields for
   whichever the decision approves.
2. Either way it flows into the statement (R-02) as its own labeled row or
   column and aggregates in R-09.

**Outcome:** discounts are visible and reportable, never silently netted
into prices — pending the BDR-03 shape.

## J7 — Find an old attachment

1. Remembers only that it was «عقد التوريد» from months ago.
2. Header search: «عقد» → Attachments group shows title matches → D-06
   viewer opens it; jumps to the owner record from the viewer footer.
3. Alternative path: S-70 library filtered by owner type = supplier +
   period; or S-11 → Attachments tab if the supplier is known.

**Outcome:** three converging paths; the archive is never a dead end.

## J8 — Find a document

1. Knows the supplier's invoice number but not AlDaftar's number: global
   search matches the supplier-invoice reference (06 §1.2) → S-21 directly.
2. Knows only "supplier + around March": S-20 with supplier + date-range
   filters; the URL-held filter state means the view can be bookmarked.

**Outcome:** document numbers, their references, and filters all lead home.

## J9 — Review a supplier's balance before a visit

1. S-10 sorted by balance desc — sees who is owed most.
2. Opens the supplier → S-11 header shows the balance; Statement tab shows
   how it got there (opening balance per BDR-06, every posted document,
   running balance).
3. Prints the statement (S-83) to take along; the print carries the period
   and closing balance per 05 §5.
4. During the visit they agree on a payment → J4 continues.

**Outcome:** the answer to "كم له عندي؟" is two clicks, and provable.

## J10 — Month-end review

1. Dashboard tiles → purchases and payments this month at a glance.
2. Reports hub: R-04 for the month (checks the "without supplier invoice"
   count — chases missing invoices per J3), R-07 for payments, R-03 for the
   payable position.
3. Audit log (S-90) filtered to the month if anything looks off.

**Outcome:** a repeatable closing routine with zero data entry.

## Journey coverage matrix

| Journey | Screens touched                    | Pending decisions encountered |
| ------- | ---------------------------------- | ----------------------------- |
| J1      | S-10, S-12, S-11                   | BDR-06                        |
| J2      | S-22, D-05, D-08, D-01, S-21       | BDR-01, BDR-02, BDR-03        |
| J3      | S-22, S-21, D-05, R-04             | BDR-01                        |
| J4      | S-11, S-42, D-10, D-01, S-41, S-44 | BDR-03, BDR-04, BDR-05        |
| J5      | S-21, S-32, D-01, S-31, S-34       | BDR-16                        |
| J6      | S-22 / S-42, R-02, R-09            | BDR-03                        |
| J7      | header search, D-06, S-70, S-11    | —                             |
| J8      | header search, S-20, S-21          | —                             |
| J9      | S-10, S-11, S-83                   | BDR-06                        |
| J10     | S-00, S-81 (R-03/04/07), S-90      | BDR-10, BDR-11                |
