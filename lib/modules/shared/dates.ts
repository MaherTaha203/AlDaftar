/**
 * Date validation for business documents (DL-023: "a valid date is required").
 *
 * Documents store dates as ISO calendar strings (`yyyy-mm-dd`); this guard
 * accepts only a well-formed, real calendar date in that form — rejecting
 * empty, malformed, or impossible values (e.g. `2026-13-45`) so an invalid
 * date can never reach a posted, immutable document. Presentation formatting
 * lives in the UI layer (DL-028); this is the storage-form validator.
 */
export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') {
    return false;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) {
    return false;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
