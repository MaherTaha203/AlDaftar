# BDD-002 — (title pending verbatim import)

> **Status: Approved externally — pending verbatim import.**
>
> This is a **placeholder only**. BDD-002 was approved outside this repository,
> but its authoritative text has not yet been added here. Its contents are
> therefore **unknown to the repository** and are **deliberately not written,
> reconstructed, or inferred** (DL-010 neutrality: engineering never invents
> business behavior). When the approved document is provided, replace this file
> with its verbatim text and rename it to `BDD-002-<Subject>.md`.

## What this placeholder is

- A marker that BDD-002 exists and is approved, so the gap is tracked rather
  than silently ignored.
- **Not** a source of any business rule. Nothing here may be cited as a
  decision. No decision table, no facts, no pending items are defined, because
  its real content is not available.

## Do not

- Do not copy suspected content from other documents into this file — that
  would risk **duplicating or contradicting** an approved rule.
- Do not implement anything on the basis of this placeholder.

## Documents that reference BDD-002 (dependents)

These existing documents name BDD-002 and cannot be finalized _against_ it
until the verbatim text is imported:

- `README.md` — document registry and the "Document dependencies" note
  ("BDD-001/BDD-002 precede everything").
- `development-plan.md` — listed under outstanding items (files not yet in the
  repository).
- `business-architecture.md` §3 — open scope decisions **PD-01** (v1 module
  scope) and **PD-02** (ledger model) remain Pending; whether BDD-002 bears on
  them is unknown until import (stated here as an open question, not a claim).
- `BDD-008-Inventory-Rules.md` — the README records that "product catalog
  master data referenced by BDD-008" _may_ be covered by BDD-001/BDD-002; this
  is an unresolved pointer, not an assertion of content.

## Import checklist (when the approved text arrives)

1. Replace this file with the verbatim approved document.
2. Confirm it introduces no rule already stated elsewhere (no duplication).
3. If it resolves any Pending decision, update `business-architecture.md` §5
   and add a `decision-log` (DL-xxx) row per the approval workflow.
4. Update the README registry row to link the real file.
