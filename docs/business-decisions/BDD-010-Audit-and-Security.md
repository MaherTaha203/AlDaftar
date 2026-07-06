# BDD-010 — Audit and Security

> **Status: Approved (owner, 2026-07-04).** Approved under the neutrality rules
> of `docs/business-architecture.md`; recorded in §5 (PD-11, PD-18) and
> `decision-log` DL-021.

## Purpose

This document defines the business audit trail (what history of actions is
kept) and the access/security model for the system and its data.

## Scope

- Covers: the audit trail (recorded actions and stored fields, immutability)
  and the access model.
- Does not cover: technical authentication implementation (a future phase),
  infrastructure security, and backup/recovery (BDR-12, still pending).

## Approved Facts

### Access model (PD-18)

- The system is **private** and **single-user** (the owner), with **full
  access**. No roles, no multi-user access in v1.
- **Implemented (DL-032):** exactly one administrator account (Supabase Auth,
  email + password); every route requires the signed-in session; data access
  is enforced by authenticated-only RLS. The session persists per device
  until explicit sign-out ("remember me" — the owner's convenience choice).

### Audit trail (PD-11)

- A business audit trail **is required**. It is **immutable and append-only**:
  entries are never edited or deleted.
- **Recorded actions:** `Create`, `Update`, `Delete`, `Post`, `Unpost`,
  `Login`, `Logout`.
- **Stored per entry:** Timestamp, User, Device, Action, Document (the
  affected record), Before, After.

## Engineering Notes

- R7 applies: `ApplicationService.execute()` operational logs are **not** the
  audit trail; the trail is a separate append-only record (this BDD).
- **Producers.** The four actions with producers today are wired across the
  existing services: `Create`, `Update`, `Delete` (master data + drafts,
  within the deletion rules of BDR-15/BDR-08), and `Post` (documents).
- **Reserved action with no producer yet:**
  - `Unpost` — presupposes a reversal/void action, which is the still-pending
    **BDR-07**; no un-post capability is built (that would invent behavior
    forbidden by DL-010).
- **`Login` / `Logout` now have producers (DL-032):** the single-administrator
  authentication records `Login` after a successful sign-in and `Logout`
  immediately before sign-out (while the session can still write). RLS
  (migration 0002) additionally enforces the trail's append-only rule at the
  database: the authenticated role holds INSERT + SELECT only.
- With a single user, `User` is a constant owner identity and `Device` is the
  capturing client — both stored for forward-compatibility.
- The Audit Log screen is **read-only**: list, filter by period/module/action,
  view detail. No edit, no delete, ever (enforces immutability).

## Future Expansion

- Multi-user access and roles — remains a future possibility
  (`docs/business-architecture.md` §4); its arrival is what would give
  `Login`/`Logout` and a non-constant `User` real meaning.

## Decision Table

| Decision                                 | Status                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| Audit trail required (PD-11)             | Approved (required)                                                 |
| Audited actions (PD-11)                  | Approved (Create/Update/Delete/Post/Unpost/Login/Logout)            |
| Fields per entry (PD-11)                 | Approved (timestamp, user, device, action, document, before, after) |
| Immutability (PD-11)                     | Approved (append-only, never edited/deleted)                        |
| Retention (PD-11)                        | Not limited in v1 (no purge)                                        |
| Single-owner access confirmation (PD-18) | Approved                                                            |
| Backup/recovery expectations (BDR-12)    | Pending                                                             |
