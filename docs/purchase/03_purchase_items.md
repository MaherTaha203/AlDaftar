# 03 — Purchase Items (Lines)

> Purchase Architecture Freeze. Design only. Labels: [Approved Fact] /
> [Business Rule] / [Future Extension].

## 1. Definition

A Purchase Line records the receipt of one product in one unit at one
price. Lines live inside their purchase (composition — business-architecture
R3): they are never addressed from outside the document, and they share the
document's lifecycle (draft-editable, frozen at posting). [Business Rule]

## 2. Required fields

| Field      | Rule                                                                   | Label                                                           |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------------- |
| Product    | Reference by id; must exist and be Active at posting.                  | [Business Rule]                                                 |
| Quantity   | Number > 0.                                                            | [Business Rule] (04 validation)                                 |
| Unit       | Reference by id; defaults from the product; must be Active at posting. | [Business Rule] — units are approved master data (Phase 10)     |
| Unit price | Number ≥ 0 in ILS, 2 decimals, half-up ([Approved — BDR-02]).          | [Business Rule] (zero allowed: free/bonus goods are receivable) |

## 3. Calculated fields

- **Line total = quantity × unit price.** Never entered, never editable.
  [Business Rule], from the approved calculated-values principle.

## 4. Optional fields

- **Notes** — free text per line. [Business Rule]

## 5. Explicitly absent (pending decisions — not modeled)

- **Line discount** — the approved discount is **at payment time**
  ([Approved Fact] — project facts: "Track supplier discounts during
  payment"). Purchase-entry discounts (line or document level) remain
  **Decision Pending** (BDR-03 residual) and are NOT part of the frozen line.
- **Tax per line** — pending BDR-09.
- **Second unit / unit conversion** — pending BDD-008 answers.

## 6. Line rules

[Business Rule], enforced at posting (04):

1. A purchase must contain **at least one** line.
2. The same product **may** appear on multiple lines (different units or
   prices at one receipt are real-world normal); no uniqueness constraint.
3. Line order is preserved as entered (matches the paper).
4. A line is atomic: partial line data (product without quantity, …) blocks
   posting, never auto-completes.

## 7. Future extensibility

[Future Extension] — the line reserves room for, without modeling:
discount columns (if BDR-03 residual is approved), tax columns (BDR-09),
expiry/batch tracking (would extend inventory 08), and costing inputs
(08 §Future). Each lands as new optional columns; existing fields and math
above never change meaning — that is what this freeze guarantees.
