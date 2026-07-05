# BDD-007 — Attachments

> **Status: Template — awaiting business input.** Created under the neutrality
> rules of `docs/business-architecture.md` (§Pending: PD-12).
> Business sections are filled only by the business owner; engineering never
> invents archive policy here.

## Purpose

Once approved, this document defines the financial archive: which records
accept file attachments, what kinds of files, and the rules for keeping or
removing them.

## Scope

- Covers: attachment targets, accepted file types/sizes, retention and
  deletion policy, and confidentiality expectations for stored files.
- Does not cover: the documents being attached to (BDD-003), audit of
  attachment actions (BDD-010).

## Approved Facts

- F4: the system is, in part, a supplier financial **archive** — storing
  supporting files is in scope by definition.
- No attachment policy (targets, types, deletion rules) is approved at this
  time.

## Pending Decisions

- PD-12 — the entire attachments policy. **Decision Pending.**

## Business Questions

1. What does the company archive today (scanned invoices, receipts, contracts,
   statements, photos)?
2. To which records should files be attachable — documents only, or also
   suppliers/products?
3. What file formats and sizes should be accepted?
4. May an attachment ever be replaced or deleted? Under what circumstances?
5. Are multiple attachments per record needed?
6. How long must archived files be kept (any legal retention requirement the
   company follows)?

## Engineering Notes

- The storage boundary already exists as a contract
  (`IFileStorage`, `lib/infrastructure/storage`) with no business policy in
  it; the approved policy will be enforced in the attachments module, not in
  storage.
- Private storage with non-public access is the working security posture per
  F4 (private system); specifics belong to BDD-010.

## Future Expansion

- OCR/extraction over archived files feeding search — listed in
  `docs/business-architecture.md` §4; only if promoted and approved.

## Decision Table

| Decision                              | Status  |
| ------------------------------------- | ------- |
| Attachment targets (PD-12)            | Pending |
| Accepted file types and sizes (PD-12) | Pending |
| Replace/delete policy (PD-12)         | Pending |
| Retention requirements (PD-12)        | Pending |
