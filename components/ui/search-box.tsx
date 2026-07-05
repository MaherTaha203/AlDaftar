'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type InputHTMLAttributes,
} from 'react';
import { cn } from './cn';
import { CloseIcon, SearchIcon } from './icons';
import { inputBaseClasses } from './input';
import { uiText } from './ui-text';

/**
 * SearchBox — 04_Component_Library.md §2. Debounced text search with icon
 * and clear button. Two usages per 06_Search_Specification.md: global
 * (header) and in-list filtering; both are this component — the results
 * behavior belongs to the caller via `onQueryChange`.
 *
 * The field owns its text and reports a debounced query. `initialQuery`
 * seeds it (e.g. from a URL query, 06 §4) without ever firing
 * `onQueryChange` — only user edits do. The forwarded ref exposes the input
 * so the shell can focus it for the global-search `/` shortcut (06 §1.1).
 */
export interface SearchBoxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'defaultValue'
> {
  /** Debounced query callback (fires after `debounceMs` of inactivity). */
  onQueryChange: (query: string) => void;
  /** Seeds the field on mount without triggering onQueryChange. */
  initialQuery?: string;
  debounceMs?: number;
  /** Minimum characters before `onQueryChange` fires (0 = always). */
  minLength?: number;
  clearLabel?: string;
}

export const SearchBox = forwardRef<HTMLInputElement, SearchBoxProps>(function SearchBox(
  {
    onQueryChange,
    initialQuery = '',
    debounceMs = 300,
    minLength = 0,
    clearLabel = uiText.clear,
    placeholder = uiText.search,
    className,
    ...props
  },
  ref,
) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);
  useImperativeHandle(ref, () => inputRef.current as HTMLInputElement, []);

  const callbackRef = useRef(onQueryChange);
  useEffect(() => {
    callbackRef.current = onQueryChange;
  });

  // Skip the mount run so the seeded value is not reported as a user query.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      return;
    }
    const timer = setTimeout(() => {
      callbackRef.current(query.length >= minLength ? query : '');
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [query, debounceMs, minLength]);

  return (
    <span className={cn('relative inline-block w-full', className)}>
      <SearchIcon className="pointer-events-none absolute start-md top-1/2 -translate-y-1/2 text-neutral-400" />
      <input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        {...props}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className={cn(inputBaseClasses, 'ps-xl', query !== '' && 'pe-xl')}
      />
      {query !== '' ? (
        <button
          type="button"
          aria-label={clearLabel}
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
          className="absolute end-sm top-1/2 -translate-y-1/2 rounded-sm p-xs text-neutral-400 hover:text-neutral-500 focus-visible:outline-2 focus-visible:outline-primary"
        >
          <CloseIcon />
        </button>
      ) : null}
    </span>
  );
});
