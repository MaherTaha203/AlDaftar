import { cn } from './cn';
import { uiText } from './ui-text';

/**
 * Spinner — inline loading indicator (03_UI_Specification.md §7: spinners
 * appear only inside buttons or small inline contexts; screens use
 * skeletons). Decorative by default; pass `label` to announce loading to
 * assistive technology in standalone use.
 */
export interface SpinnerProps {
  className?: string;
  /** Accessible label; when set the spinner becomes a status region. */
  label?: string;
}

export function Spinner({ className, label }: SpinnerProps) {
  return (
    <span
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : true}
      className="inline-flex"
    >
      <span
        className={cn(
          'inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent',
          className,
        )}
      />
      {label ? <span className="sr-only">{label ?? uiText.loading}</span> : null}
    </span>
  );
}
