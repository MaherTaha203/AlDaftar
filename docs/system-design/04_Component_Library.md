# 04 — Component Library

> Design only — no code. Each component: purpose, variants, states, inputs
> (conceptual, not props-as-code), behavior, RTL notes, and where it is used
> (screen IDs from `02_Screen_Flow.md`). All visuals bind to `lib/theme`
> tokens per `03_UI_Specification.md`. Every component must be reusable and
> business-blind; business meaning enters only through its inputs.

## 1. Primitives

### Button

- Variants: primary, secondary, danger, ghost, link; sizes md/sm; optional
  leading icon; loading state (spinner replaces label, width preserved);
  disabled state with reason tooltip when disabled by a rule.
- Split-button variant for the header "+ new" action.
- Used: everywhere.

### Input (text)

- States: default, focus, invalid (+ message slot), disabled, read-only.
- Supports directional override for LTR content (refs, phone) per 03 §6.5.
- Used: all forms.

### Textarea

- Auto-grows to 6 rows; counter when a max length is set. Used: notes fields.

### Select

- Single-select with type-ahead; clearable when optional; empty, loading,
  and "no matches" states; supports an inline "quick create" footer action
  (used by pickers → D-08). Used: units, categories, methods (BDR-05).

### DatePicker

- Calendar popover; manual entry; today shortcut; min/max bounds
  configurable by the caller. Calendar system is Gregorian; whether a Hijri
  display accompaniment is needed — **BUSINESS DECISION REQUIRED (BDR-18)**.
- Used: document headers, filters, report parameters.

### QuantityInput

- Numeric, > 0 enforced at the field level, step buttons, unit suffix slot.
- Used: lines grids (S-22/32).

### CurrencyInput

- Amount entry honoring precision (BDR-02); groups thousands while typing;
  currency suffix from context; never accepts negatives (credits are always
  separate documents, not negative amounts).
- Used: prices, discounts (BDR-03), payment amount.

### MoneyDisplay

- Read-only formatted amount: tabular numerals, thousands separators,
  precision per BDR-02, digit style per BDR-17, optional currency label,
  optional colorization (positive/negative for balances).
- Used: tables, statement, dashboard tiles, print.

## 2. Composite inputs

### SearchBox

- Debounced input with search icon, clear button, keyboard shortcut hint;
  two modes: global (header — grouped instant results panel per 06) and
  in-list (plain filter). RTL: icon at inline-start.

### EntityPicker (SupplierPicker / ProductPicker)

- Select specialized for master data: searches active records, shows key
  secondary info (supplier balance / product unit), quick-create footer
  (D-08), recently-used section. Business-blind core; each picker is a
  configuration of it.
- Used: S-22, S-32, S-42.

### LinesGrid

- Editable table for document lines: add row, delete row (drafts only),
  per-cell editors (EntityPicker, QuantityInput, CurrencyInput), computed
  line total (read-only), footer totals slot, keyboard navigation
  (Enter = next cell, new row at end). Read-only mode renders the same
  layout for S-21/S-31.

### FilterPanel

- Collapsible toolbar row hosting field slots (Select, DatePicker range,
  toggles); emits active-filter chips; "clear all"; state reflected in the
  URL query so filtered views are shareable/bookmarkable.

### Upload

- Drop zone + file picker; multi-file; per-file progress, retry, remove;
  enforces types/sizes (BDR-08) with Arabic messages; used inside D-05.

## 3. Display components

### DataTable

- Column definitions (header, alignment, width, priority for responsive
  drop), sticky header, row click, row action menu, sortable columns,
  loading skeleton, empty-state slot, pagination slot. RTL per 03 §3/§6.
- Used: every list screen.

### StatusBadge

- Generic colored pill: label + tone (success/warning/danger/neutral/info).

### DocumentStatus

- StatusBadge specialization mapping document states: Draft → warning tone
  («مسودة»), Posted → success tone («مرحّل»), plus the "بدون فاتورة مورد /
  no supplier invoice" informational badge used on purchases. Voided tone
  reserved pending BDR-07.

### Card / StatCard

- Card: container per 03 §3. StatCard: metric card for the dashboard —
  label, big MoneyDisplay or count, optional trend slot (trend content is
  report-defined), navigates on click.

### Tabs

- Horizontal tabs under a detail header; lazily render content; count
  badges (e.g. attachments count); RTL order starts at the right.

### Breadcrumb / Pagination / Toast / Skeleton / EmptyState / ErrorState

- Per the rules in 03 §§2–3, 7, 10. One implementation each; no local
  variants.

### AttachmentList + AttachmentViewer

- AttachmentList: rows/grid of files (icon by type, title, size, date,
  actions: view, download, delete-when-allowed per BDR-08).
- AttachmentViewer (D-06): full-screen; image zoom/rotate; PDF paging;
  prev/next across the owner's attachments; download; metadata footer.

### AuditTrail

- Read-only list of audit entries for one record (used in S-21 Related/Audit
  tab and S-91): time, action, summary; expandable before/after where
  captured.

## 4. Structural components

### Toolbar

- Standard list-screen toolbar: primary action slot (start), SearchBox,
  FilterPanel toggle, secondary actions (print/export) at the end.

### FormPage / FormFooter

- Form scaffolding: title, sections, sticky footer (primary save action,
  cancel), dirty-state tracking wired to D-03, submit-state handling
  (disable + spinner), first-error focus per 03 §8.

### ConfirmDialog / EntryDialog

- ConfirmDialog: icon, title, body, named action buttons (03 §9), danger
  variant. EntryDialog: form-in-dialog scaffolding used by D-05/D-08/D-09.

### AllocationPanel

- The D-10 component: list of open documents with open amount, input per
  row, running "allocated / remaining" footer, over-allocation blocked at
  the field level. Rendered only if BDR-04 approves allocation; designed so
  its absence leaves S-42 complete.

### PrintLayout

- Shared print scaffolding per `05_Printing_Specification.md`: company
  header block, document title/number block, content slot, totals block,
  footer (page x of y, printed-on date). Used by S-24/34/44/82/83.

## 5. Reuse rules

1. No screen may introduce a one-off variant of a library component; new
   needs extend the library first (this document is updated, then used).
2. Components never fetch or compute business data; they render inputs
   given to them (keeps them testable and per ADR-0001 simple).
3. Arabic copy lives in a central UI-copy catalog, not inside components.
4. Every component defines its loading, empty/invalid, and RTL behavior at
   design time — the three most commonly forgotten states.
