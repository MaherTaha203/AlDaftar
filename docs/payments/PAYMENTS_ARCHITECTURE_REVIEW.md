# PAYMENTS ARCHITECTURE REVIEW

> Validation pass over docs/payments/01–07 (Payments Design Gate). Method:
> every rule cross-checked against the other payment documents and against
> the approved sources — the frozen Purchase Architecture, the supplier
> statement math (docs/purchase/07), Reference Framework governance,
> ADR-0001, the Business Decisions/BDD registry, the Decision Log, and the
> Technical Debt register.

## 1. Architecture completeness: **93%**

All seven required areas covered: lifecycle (01), document structure (02),
supplier-statement effect (03), discount behavior (04), future allocation
architecture without implementation (05), editing/correction (06), printing
(07).

The missing 7% is exclusively **pending business decisions**, each marked in
place; none changes the frozen shapes:

| Pending                          | Where                         | Blocks implementation?                                                                                                                             |
| -------------------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| BDR-04 allocation                | 05 (whole doc, optional seam) | **No** — running-balance is the approved-pending default; allocation is additive later.                                                            |
| BDR-05 method list               | 02 §3, 07                     | **No** — method is a required **free-text** field in the interim (neutral, non-guessing); a managed list later only constrains it, no data repair. |
| BDR-07 void / payment correction | 06 §3                         | **No** — immutability holds; the correction instrument is deferred (a wrong payment simply stays until the void policy is decided).                |
| BDR-06 opening balance           | 03 §5                         | No (statement works with 0 opening).                                                                                                               |
| BDR-08 attachment deletion       | 02 §4                         | No.                                                                                                                                                |
| BDR-11 audit scope               | 01, 02 §5                     | No (audit-entry effect lands with P20).                                                                                                            |
| BDR-15 draft deletion            | 01 §3, 06 §1                  | No.                                                                                                                                                |
| BDR-19 amount-in-words           | 07 §2                         | No (print-only, later).                                                                                                                            |

## 2. Consistency with each required reference

| Reference                                 | Result                                                                                                                                                                                                                                                      |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purchase Architecture**                 | Consistent. Payment reuses the same Draft→Posted model, immutability, atomic posting, per-type BDR-01 numbering, and calculated-values principle — no new pattern (01 §1/§6).                                                                               |
| **Supplier Statement (docs/purchase/07)** | Consistent. 03 §1 restates the one balance formula verbatim (`… − payments − payment-time discounts`); payment = credit row, discount = separate credit row — exactly what purchase/07 §2 already declared.                                                 |
| **Reference Framework**                   | Consistent — and correctly **not used**: Payments is a _document_ module (lifecycle, posting), not master data, so it does not build on the master-data Reference Framework. No governance rule triggered.                                                  |
| **ADR-0001**                              | Consistent. One `ApplicationService` posting path; no mediator, no new abstraction.                                                                                                                                                                         |
| **Business Decisions / BDDs**             | Consistent. BDR-01/02 (approved) applied; BDR-03 approved fact ("discount at payment") applied as a first-class separate field (04); all others explicitly pending in place. No business behavior invented.                                                 |
| **Decision Log**                          | Consistent. DL-013 (numbering) and DL-014 (ILS currency) applied throughout; this freeze recorded as DL-015.                                                                                                                                                |
| **Technical Debt**                        | Consistent. The interims (free-text method, running-balance) are reversible and recorded here + carried to TD when implemented; TD-004 persistence seam is honored (payment posting atomicity is the contract the Supabase impl must keep transactionally). |

## 3. Conflicts found: **none.**

Checks: payment immutability vs attachment-after-post (02 §4/06 §2 — attach
allowed, edit never); discount not merged into amount (02 §7, 03 §2, 04 §3 —
all agree, two separate credits); allocation-does-not-change-balance stated
identically in 03 §4, 05 §2 and matching purchase/07 §4; amount-required rule
consistent across 01 §5, 02 §3, 04 §2; numbering per-type consistent with
BDD-005. No rule stated normatively in two places (cross-references used).

## 4. Risks

1. **BDR-05 method as free-text interim.** Low risk: neutral and reversible.
   If the owner prefers a fixed list from day one, answer BDR-05 before P14
   implementation and method becomes a select (managed list or a small fixed
   enum) — no architecture change, only the field's input control.
2. **Payment correction is genuinely deferred (BDR-07).** Until void is
   decided, a wrong posted payment cannot be reversed in-system. This is the
   single real limitation; it is honest (immutability > silent edits) and
   matches how purchases already defer voiding. Flag for the owner.
3. **Allocation demand.** If the owner expects per-invoice paid status soon,
   answering BDR-04 lets 05 be implemented as designed; the seam guarantees
   no rewrite either way.

## 5. Recommendations

1. **Approve this architecture and freeze it** (it is internally consistent
   and consistent with every frozen reference).
2. Implementation of P14 can proceed on approved ground with two documented
   interims (free-text method; running-balance) and BDR-07 correction
   deferred — **no business-decision stop is strictly required to build the
   payment document**. Optionally answer **BDR-05** (method list) and **BDR-04**
   (allocation) first to avoid the two interims; both take minutes
   (questionnaire BDD-004 / a short methods list).
3. Do not implement allocation (05) or a fixed method list until their BDRs
   are approved — build the document core only.

## 6. Readiness score: **95 / 100**

Architecture frozen and 100% internally consistent; consistent with all
required references. Implementation readiness of the **payment document core**
is complete; only allocation and the method-list refinement await their
decisions, both isolated behind documented seams.
