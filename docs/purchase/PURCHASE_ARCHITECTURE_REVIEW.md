# PURCHASE ARCHITECTURE REVIEW

> **STATUS: PURCHASE ARCHITECTURE COMPLETE (2026-07-04).** BDR-01 and BDR-02
> were approved and propagated across all documentation (BDD-005/006,
> business-architecture §5, DL-013/DL-014, system-design BDR registry, and
> docs/purchase 02/03/04). Consistency review re-run: no contradictions.
> The implementation gates in §4/§5 below are cleared; the remaining pending
> items are non-blocking and marked in place. Architecture completeness for
> implementation purposes: **100% of the frozen scope**; readiness: **100**.

> Validation pass over docs/purchase/01–08 (Phase 11.5). Method: every rule
> cross-checked against the other seven documents and against the approved
> sources (execution-contract project facts, approved decisions, system
> design 01–08, BDR registry).

## 1. Architecture completeness: **92%**

Covered end-to-end: lifecycle and transition matrix (01), full document
structure and relationships (02), line definition and math (03), posting
validation order + atomic effects + rollback (04), editing and correction
strategy (05), return relationship and returnable-quantity formula (06),
statement math with per-document effects (07), inventory derivation with
costing seam (08).

The missing 8% is exclusively **pending business decisions**, not
architectural gaps — every one is marked in place and none changes the
frozen shapes:

| Pending                             | Where it bites           | Blocks implementation?                                                                        |
| ----------------------------------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| BDR-01 numbering                    | 04 effect #1             | **RESOLVED — APPROVED 2026-07-04** (per-type plain-integer sequence at posting; BDD-005)      |
| BDR-02 currency                     | 02 header slot, 03 price | **RESOLVED — APPROVED 2026-07-04** (single ILS, 2 decimals, half-up; BDD-006)                 |
| BDR-15 draft deletion               | 01 transitions, 05       | No (drafts can simply persist meanwhile)                                                      |
| BDR-16 over-return / negative stock | 06 §2, 08 §4             | No (warn as safe interim is possible only after the decision — until then entry UI can defer) |
| BDR-06 opening balance              | 07 row zero              | No (statement works with 0 opening)                                                           |
| BDR-04 allocation                   | 02/07 notes              | No (statement math independent)                                                               |
| BDR-07 voiding                      | 01/05                    | No (returns are the approved path)                                                            |
| BDR-08 attachment deletion          | 02/05                    | No                                                                                            |
| BDD-008 unit conversion             | 08 §4                    | No (per-unit reporting is frozen behavior)                                                    |

## 2. Conflicts found: **none** (after one repair during review)

Checks performed: draft-affects-nothing consistency (01/06/07/08 all agree);
immutability vs late-invoice handling (05 resolves: attach, never edit);
discount placement (03 excludes entry-time discounts, 07 carries the
approved payment-time row — consistent with the approved fact); totals
"persisted for display, never authoritative" vs calculated principle
(consistent: recomputable); (new)→Posted forbidden in 01 matches 04
validation step 1.

**Repair made during review:** none required in substance; one _duplicated
statement_ was found and resolved by ownership declaration — the line-field
rules appear in both 03 (owner) and 04's validation list (consumer). 04 now
explicitly cites 03 as the owning document; the rule exists once.

## 3. Duplicated rules: **1 instance, resolved by ownership** (above). No

other rule is stated normatively in two places; cross-references are used
instead.

## 4. Risks

1. **BDR-01/BDR-02 are on the critical path.** Implementing Phase 12 without
   them means either inventing numbering/currency behavior (contract
   violation) or shipping a purchase that cannot post. **Mitigation:** the
   two questionnaire items (BDD-005 Q1–Q7, BDD-006 Q1–Q4) take minutes to
   answer; answer before Phase 12.
2. **Standalone returns are undecided** (06 §1). If the business ever
   records a return with no originating purchase in the system, the
   referenced-only model needs the pending decision resolved first. Low
   likelihood early (all purchases will be in-system), but flagged.
3. **Interim persistence (TD-004)** means posting's atomicity is
   single-writer localStorage-level until Supabase lands — acceptable for a
   single user, and the atomic contract (04 §4) is what the Supabase
   implementation must honor transactionally.
4. **Payment-time discount** is approved as a fact but its document shape
   (part of Payment, per Phase 15's module) is not yet designed — 07 fixes
   only its statement effect, deliberately.

## 5. Recommendations

1. Answer **BDR-01 + BDR-02** (7+4 questionnaire questions) before starting
   Phase 12 — the only true gate.
2. Keep BDR-16 as "warn" candidate for the owner to confirm, since blocking
   needs no schema change later — but do not implement either until decided.
3. Freeze these eight documents now; changes hereafter follow the
   amendment rule (update document + decision log before code).
4. Phase 12 should implement in this order: draft entry (no pending deps) →
   posting (after BDR-01/02) → list/detail/print — keeping the phase
   deliverable but sequencing risk out.

## 6. Readiness score: **90 / 100**

Architecture: frozen and internally consistent. Implementation readiness:
draft-entry scope is 100% ready; posting scope is gated solely by BDR-01
and BDR-02. No architectural unknowns remain.
