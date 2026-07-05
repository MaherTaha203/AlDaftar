# Business Architecture — AlDaftar

> **Authority:** this document is the authoritative reference for the business
> domain (decision log DL-010). No business module may be implemented before
> the relevant decisions below are approved.
>
> **Neutrality rule (Phase 6 Revision):** this document contains **only
> approved facts**. Everything else is explicitly labeled. It is divided into
> four sections that are never mixed:
>
> 1. Approved Facts — sourced, binding.
> 2. Engineering Recommendations — structural proposals; not business rules.
> 3. Pending Business Decisions — every open question, marked
>    **Requires Business Approval**.
> 4. Future Possibilities — explicitly out of scope until promoted.
>
> Nothing in sections 2–4 is binding. A pending decision becomes binding only
> when its status changes to Approved in the decision table (§5).

---

## 1. Approved Facts

Each fact cites its source. No other business facts are approved.

| ID  | Fact                                                                                                                                                                                                                                                                     | Source                                               |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| F1  | AlDaftar is a **bookkeeping system**.                                                                                                                                                                                                                                    | Phase 6 directive                                    |
| F2  | It serves a **single company**.                                                                                                                                                                                                                                          | Phase 6 directive                                    |
| F3  | It is **not an ERP**.                                                                                                                                                                                                                                                    | Phase 6 directive                                    |
| F4  | It is a **private, single-user supplier financial archive and purchasing management system**.                                                                                                                                                                            | `docs/system-architecture.md` §1                     |
| F5  | Single application, single database, single deployment; no microservices, no distributed messaging.                                                                                                                                                                      | Phase 3 review directive                             |
| F6  | The UI is an **RTL** document shell (Arabic-oriented presentation).                                                                                                                                                                                                      | `docs/system-architecture.md` §6                     |
| F7  | The engineering foundation is approved: `lib/core`, `lib/application` (single `ApplicationService` abstraction per ADR-0001), `lib/infrastructure`, `lib/domain` (generic Entity/AggregateRoot/ValueObject/Identifier/DomainRule bases).                                 | Phases 2–5 approvals; `docs/adr/ADR-0001.md`; DL-009 |
| F9  | The project vocabulary **mentions** these business concepts: Supplier, Product, Invoice, Payment, Receipt, Voucher, Inventory, Customer, Account, Journal. Their mention establishes vocabulary only — **inclusion, scope, and behavior of each are NOT approved** (§3). | Phase 2–5 directives (scope-exclusion lists)         |

## 2. Engineering Recommendations

Structural proposals from the engineering side. They introduce **no business
rules**; where a recommendation touches a business question, it defers to the
corresponding pending decision (PD-xx). All are reversible until adopted.

- **R1 — Module kinds.** Organize future business code into four kinds with
  one-way dependencies: master data (reference records), documents (records
  with a lifecycle), derived read models (rebuildable, never hand-corrected),
  and cross-cutting services (business-blind: files, numbering, audit).
  Which concrete modules exist depends on PD-01.
- **R2 — Boundary rules.** Cross-module references by identifier only (using
  `Identifier<T>` from `lib/domain/common`); no module reads another module's
  internal structures; no dependency cycles; master data never depends on
  documents; read models write nothing.
- **R3 — Aggregate mapping.** Each business record that must be consistent as
  a unit becomes one `AggregateRoot`; line items (if approved in PD-04) live
  inside their document aggregate; derived values (balances, stock levels)
  are not stored as aggregate state but computed/projected, so stored totals
  cannot drift from the documents behind them.
- **R4 — Transaction principle.** One aggregate per write transaction for
  master data; a document state transition and its side effects (numbering,
  derived-ledger entries, audit entry — whichever of these are approved)
  execute as one atomic unit.
- **R5 — Validation tiers.** A rule lives at exactly one tier: value objects
  (format/range), aggregates/domain rules (single-document invariants),
  application services (cross-aggregate checks), entry points (shape parsing
  only). Which rules exist at all is business-owned (PD-09).
- **R6 — Physical layout.** When business modules are approved, place each in
  its own folder (proposed: `lib/modules/<name>/`), depending only on the
  approved engineering layers. Layout is an engineering choice and can be
  fixed at first implementation without business impact.
- **R7 — Operational logging vs audit.** `ApplicationService.execute()`
  telemetry is operational logging; if a business audit trail is approved
  (PD-11), it must be a separate, append-only record — logs are not an audit
  trail.

## 3. Pending Business Decisions

Every item below **Requires Business Approval** unless its §5 status says
otherwise. None is assumed. Where alternatives are listed, they are options,
not recommendations.

| ID    | Question — Decision Pending                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PD-01 | **Scope of v1 business modules.** Which of the mentioned concepts (F9) are in scope: suppliers, products, purchases, returns, payments, receipts, inventory, customers, accounts/journal?                          |
| PD-02 | **Ledger model.** Document-based ledger (balances derived from documents) or double-entry general ledger (accounts + journal entries) — or both?                                                                   |
| PD-03 | **Document types.** The exact list of document types the company actually uses (e.g. purchase invoice, purchase return, payment voucher, receipt voucher, …) and what each contains.                               |
| PD-04 | **Document structure.** Whether purchase documents carry product line items (quantity × price) or only totals; whether payments are allocated to specific invoices or recorded against a running supplier account. |
| PD-05 | **Document lifecycle.** Whether documents have draft/final states; whether finalized documents are editable, void-able, or correctable only by reversal; whether deletion is ever allowed.                         |
| PD-06 | **Official numbering.** Whether the system assigns document numbers or records numbers from the paper documents; if system-assigned: format, per-type/per-year sequences, and whether gaps are acceptable.         |
| PD-07 | **Currency.** Which currency/currencies the books are kept in; whether any foreign-currency dealings must be recorded.                                                                                             |
| PD-08 | **Tax.** Whether tax (e.g. VAT) is recorded at all; if so, at which level (line/document), at which rates, and per which authority's rounding rules.                                                               |
| PD-09 | **Business validation rules.** The actual rules of the business (credit limits? mandatory fields? allowed dates?).                                                                                                 |
| PD-10 | **Opening balances.** Whether suppliers (or other parties) start with opening balances, and how they are established.                                                                                              |
| PD-11 | **Audit trail.** Whether a business-level audit trail is required, what it must record, and its retention.                                                                                                         |
| PD-12 | **Attachments policy.** Which records accept file attachments, allowed types/sizes, and whether/when attachments may be deleted.                                                                                   |
| PD-13 | **Inventory scope.** Whether stock quantities are tracked at all; if so, quantity-only or with valuation (costing method).                                                                                         |
| PD-14 | **Fiscal periods.** Whether a fiscal year / period concept exists in the books and whether periods are ever locked.                                                                                                |
| PD-15 | **Reports.** The actual list of reports the owner needs (statements? aging? summaries?) and their required contents.                                                                                               |
| PD-16 | **Search.** What the owner needs to find and by which criteria.                                                                                                                                                    |
| PD-17 | **Workflows.** The real day-to-day sequences the owner follows (how a purchase is recorded, how payment happens, how corrections are made). To be captured from the owner, not designed by engineering.            |
| PD-18 | **Security/access.** Confirmation that single-owner full access is the v1 model, and any confidentiality constraints on stored documents.                                                                          |

## 4. Future Possibilities

Non-binding ideas recorded so they are not lost. Each becomes relevant only
if explicitly promoted into §3 and approved:

- Customers and a sales side (mirroring the purchasing side).
- Double-entry general ledger projected from documents (interacts with PD-02).
- Multi-currency support (interacts with PD-07).
- Multi-user access and roles.
- Inventory valuation and stock adjustment documents (interacts with PD-13).
- Period locking (interacts with PD-14).
- OCR/extraction over archived attachments feeding search.
- Data exports and tax filings.

## 5. Decision table

| Decision                                                           | Status                                                                                                                                          |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| F1 — Bookkeeping system                                            | Approved                                                                                                                                        |
| F2 — Single company                                                | Approved                                                                                                                                        |
| F3 — Not an ERP                                                    | Approved                                                                                                                                        |
| F4 — Private, single-user supplier archive & purchasing management | Approved                                                                                                                                        |
| F5 — Single app / database / deployment                            | Approved                                                                                                                                        |
| F6 — RTL presentation                                              | Approved                                                                                                                                        |
| F7 — Engineering foundation (layers + ADR-0001)                    | Approved                                                                                                                                        |
| F8 — This document is the business authority (DL-010)              | Approved                                                                                                                                        |
| PD-01 — v1 module scope                                            | Pending                                                                                                                                         |
| PD-02 — Ledger model                                               | Pending                                                                                                                                         |
| PD-03 — Document types                                             | Pending                                                                                                                                         |
| PD-04 — Document structure (lines, allocation)                     | Pending                                                                                                                                         |
| PD-05 — Document lifecycle & correction policy                     | Approved in part (Draft→Posted confirmed — PD-17/DL-020; editability, void, and deletion remain open — BDR-07/BDR-15)                           |
| PD-06 — Official numbering                                         | Approved (BDD-005: per-type plain-integer sequence, assigned at posting)                                                                        |
| PD-07 — Currency                                                   | Approved (BDD-006: single ILS, 2 decimals, half-up)                                                                                             |
| PD-08 — Tax                                                        | Approved (no tax system in v1 — out of scope; DL-022)                                                                                           |
| PD-09 — Business validation rules                                  | Approved (required fields; quantity > 0; amount ≥ 0; price ≥ 0; valid date; existing supplier/product/currency; no advanced validation; DL-023) |
| PD-10 — Opening balances                                           | Pending                                                                                                                                         |
| PD-11 — Audit trail                                                | Approved (BDD-010: immutable append-only trail of Create/Update/Delete/Post/Unpost/Login/Logout; DL-021)                                        |
| PD-12 — Attachments policy                                         | Pending (BDR-08)                                                                                                                                |
| PD-13 — Inventory scope                                            | Pending                                                                                                                                         |
| PD-14 — Fiscal periods                                             | Approved (single period; no closing, reopening, or multi-year; DL-024)                                                                          |
| PD-15 — Reports                                                    | Approved (BDD-009: fixed report catalog, Screen/Print/PDF/Excel; Supplier-Aging contents deferred; DL-026)                                      |
| PD-16 — Search                                                     | Approved (global search over suppliers, products, purchases, payments, purchase returns by name/number/code; DL-025)                            |
| PD-17 — Workflows                                                  | Approved (Draft→Posted lifecycle; no approval/multi-user workflow; the further **Locked** state is deferred — DL-020)                           |
| PD-18 — Security/access confirmation                               | Approved (single-owner full access confirmed; DL-021)                                                                                           |

No decision is currently **Rejected**. The former BA-D1…BA-D6 (from the first
draft of this document) were unapproved engineering assumptions; they have
been removed as decisions and their subject matter reappears above as PD-02,
PD-05, PD-07, PD-06, PD-13, and R6 respectively.

---

_Amendment rule: changing any status in §5 requires updating this document
and `docs/decision-log.md` before any related implementation begins._
