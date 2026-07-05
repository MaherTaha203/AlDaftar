# AlDaftar — Business Decision Questionnaire

Answer each question in the `Answer:` line below it. Every question resolves
exactly one pending decision from BDD-003 … BDD-010. When all questions are
answered, no pending decision remains. Plain business language only — if a
question is unclear, say so instead of guessing.

---

## BDD-003 — Document Types

**Q1.** What paper or official documents does the company use with suppliers
today? Please list every kind.

Answer:

**Q2.** For each document kind listed in Q1: what information must be kept
from it?

Answer:

**Q3.** Do purchase documents list the items bought — each with its quantity
and price — or only total amounts?

Answer:

**Q4.** Does a document pass through more than one stage before it is
considered final? If yes, name the stages.

Answer:

**Q5.** If a mistake is discovered in a document after it is recorded, what
does the company do today?

Answer:

**Q6.** Is anything ever removed from the books entirely? If yes, what and
when?

Answer:

## BDD-004 — Payment Allocation

**Q1.** When the company pays a supplier, is the payment made for specific
invoices, or against the supplier's overall balance?

Answer:

**Q2.** Does the company sometimes pay only part of what is owed?

Answer:

**Q3.** If partial payments happen: how do you know today what remains unpaid?

Answer:

**Q4.** Does the company ever pay a supplier before receiving any invoice?

Answer:

**Q5.** Has the company ever paid more than what was owed? What happened to
the extra amount?

Answer:

**Q6.** On the day the system starts, will some suppliers already be owed
money?

Answer:

**Q7.** If yes: from where will those starting amounts be taken (old
notebook, statement, memory)?

Answer:

## BDD-005 — Numbering System

**Q1.** Do the supplier documents you receive already carry their own printed
numbers?

Answer:

**Q2.** Should the system give each document its own number, record only the
number printed on the paper, or both?

Answer:

**Q3.** If the system numbers documents: one numbering shared by everything,
or separate numbering for each document kind?

Answer:

**Q4.** Should numbering restart each year, or continue without restarting?

Answer:

**Q5.** Is it acceptable for some numbers to be skipped, or must the sequence
be continuous with no missing numbers?

Answer:

**Q6.** Is there a required shape for the number (letters, year, number of
digits)? Give an example if yes.

Answer:

**Q7.** At what moment should a document get its number — as soon as it is
first saved, or at a later step?

Answer:

## BDD-006 — Currency Rules

**Q1.** In which currency does the company keep its books?

Answer:

**Q2.** Are any supplier dealings in a different currency? If yes, which, and
how do you record them today?

Answer:

**Q3.** How many decimal places do amounts carry on your documents?

Answer:

**Q4.** When a total comes out with a fraction, how is it rounded on your
documents?

Answer:

## BDD-007 — Attachments

**Q1.** Which papers or files do you want to keep a copy of inside the
system?

Answer:

**Q2.** Should files be attachable only to documents, or also to suppliers
and items?

Answer:

**Q3.** What kinds of files should be accepted (photos, PDF, other)? Any size
limit?

Answer:

**Q4.** Should it ever be possible to replace or remove an attached file? If
yes, in what situations?

Answer:

**Q5.** How long must stored files be kept?

Answer:

## BDD-008 — Inventory Rules

**Q1.** Do you need the system to tell you how many of each item you have?

Answer:

**Q2.** If yes: which events change the quantity (purchases, returns,
anything else)?

Answer:

**Q3.** In what units are items measured (piece, box, kilogram, other)? Can
one item be handled in more than one unit?

Answer:

**Q4.** Do you physically count the items? What happens today when the count
does not match the records?

Answer:

**Q5.** Do you need to know the money value of the stock, or the quantities
only?

Answer:

## BDD-009 — Reporting

**Q1.** What questions must the system be able to answer about your books?
List them all.

Answer:

**Q2.** For each one listed in Q1: what exactly must appear in the answer
(which figures, which details)?

Answer:

**Q3.** Over which time periods do you look at these (day, month, year, a
range you choose)?

Answer:

**Q4.** Does anything need to be printed or sent to someone (accountant, tax
office)? In what form?

Answer:

## BDD-010 — Audit and Security

**Q1.** Do you want the system to keep a record of every action taken in it,
even though you are the only user?

Answer:

**Q2.** If yes: which actions matter, and for how long should that history be
kept?

Answer:

**Q3.** Will anyone besides you ever open the system or see its reports?

Answer:

**Q4.** Are any records especially private?

Answer:

**Q5.** If something goes wrong with the device or the system, how much data
loss is acceptable — none, one day of work, or more?

Answer:

---

## Additional areas (no BDD assigned yet)

These pending areas from the business architecture have no BDD document yet
(see `README.md` — Known gaps). Answering them now lets us create and approve
their documents in one step.

**A1. Tax:** Do supplier invoices include tax?

Answer:

**A2. Tax:** If yes — must the system record the tax amount separately from
the goods amount?

Answer:

**A3. Rules:** Are there rules that must always be respected when recording
(required information, limits, allowed dates)? List them.

Answer:

**A4. Periods:** Does the company close its books at a regular time (monthly,
yearly, never)?

Answer:

**A5. Periods:** After such a closing, may older entries still be changed?

Answer:

**A6. Search:** When you look for something old today, what do you search by
(supplier name, date, number, amount, other)?

Answer:

**A7. Daily work:** Describe step by step what happens today from receiving
goods until the supplier's paper is filed.

Answer:

**A8. Daily work:** Describe step by step how a supplier gets paid today,
from deciding to pay until recording it.

Answer:

**A9. Daily work:** Describe step by step what happens today when goods are
returned to a supplier.

Answer:

---

## Statistics

| Metric              | Count |
| ------------------- | ----- |
| **Total Decisions** | 38    |
| **Answered**        | 10    |
| **Pending**         | 28    |

> Update 2026-07-04: BDD-005 (6 decisions) and BDD-006 (4 decisions) were
> answered and approved by the owner (BDR-01 / BDR-02) — see the Approved
> Decision sections in those documents.

- The 38 decisions are the Decision Table rows of BDD-003 … BDD-010
  (5 + 5 + 6 + 4 + 4 + 5 + 4 + 5), each covered by the 43 questions Q1–Q7
  above (some decisions need more than one question; no question covers more
  than one decision).
- The 9 additional questions (A1–A9) cover the unassigned areas and are not
  counted in the 38 until their BDDs are created.
- Update this table as answers arrive; a decision counts as Answered only
  when its BDD Decision Table row leaves Pending.
