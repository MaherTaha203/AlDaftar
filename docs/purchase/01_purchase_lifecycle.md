# 01 — Purchase Lifecycle

> Purchase Architecture Freeze (Phase 11.5). Design only. Labels used
> throughout: **[Approved Fact]** — traceable to an approved source;
> **[Business Rule]** — fixed by this freeze, derived from approved facts;
> **[Future Extension]** — explicitly not part of the frozen architecture.

## 1. States

| State      | Meaning                                                                                    | Label                                                                           |
| ---------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Draft**  | Being entered. No official number. Affects nothing (no balance, no inventory, no reports). | [Approved Fact] — design 01_System_Workflow §0.1                                |
| **Posted** | Official document. Content immutable. Source of balance, inventory, and reports.           | [Approved Fact] — execution contract "Purchase becomes immutable after Posting" |

**Archived — does not exist for documents.** [Business Rule] Archive is a
master-data lifecycle (suppliers, categories, …). A posted purchase is part
of the books forever; hiding it would falsify the statement and inventory.

**Cancelled — not in the frozen architecture.** [Approved Fact: pending]
Whether a posted document can ever be voided is BDR-07 (Decision Pending).
Until approved, the only correction is a Purchase Return
([Approved Fact] — "Corrections are performed by Purchase Return"). If
BDR-07 later approves voiding, it enters as a new state via reversal, never
by deleting or editing (05).

## 2. Actors

[Approved Fact] Single user — the owner (system-architecture §1). Every
transition is performed by the owner; there are no roles or approvals.
[Future Extension] Multi-user roles would constrain transitions per role
without changing the state model.

## 3. Allowed transitions

| From  | To     | Trigger              | Label           |
| ----- | ------ | -------------------- | --------------- |
| (new) | Draft  | First save           | [Business Rule] |
| Draft | Draft  | Any edit / re-save   | [Business Rule] |
| Draft | Posted | POST (04 rules pass) | [Approved Fact] |

Draft deletion: **Decision Pending (BDR-15)** — not part of the frozen
transitions until answered.

[Business Rule] "Save and post" as a single user action is still logically
Draft → Posted: the document is persisted as a draft and posted in the same
atomic flow; no path creates a Posted document that never satisfied draft
validation.

## 4. Forbidden transitions

[Business Rule], all consequences of the immutability Approved Fact:

- Posted → Draft (un-posting) — never.
- Posted → edited-in-place — never (05).
- Posted → deleted — never.
- Draft → any state other than Draft/Posted — never.
- (new) → Posted directly without draft validation — never.

## 5. Effects of every transition

| Transition     | Effects                                                                                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| (new) → Draft  | Internal id assigned. Nothing else: no number, no balance, no inventory, invisible to reports. [Business Rule]                                               |
| Draft → Draft  | Content replaced; still no external effects. [Business Rule]                                                                                                 |
| Draft → Posted | Exactly the posting effects of 04_posting_rules.md, atomically: official number, inventory source rows, balance inclusion, audit entry. [Approved Fact + 04] |

After Posted: the only permitted additions are attachments (02 §Attachments)
and links from returns created against it (06). [Business Rule]
