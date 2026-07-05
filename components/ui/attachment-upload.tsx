'use client';

import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react';
import { cn } from './cn';
import { Button } from './button';
import { CloseIcon, FileIcon, UploadIcon } from './icons';
import { Spinner } from './spinner';
import { uiText } from './ui-text';

/**
 * AttachmentUpload — 04_Component_Library.md §2 (Upload). Drop zone + file
 * picker with per-file progress, retry, and remove. Backend-agnostic by
 * design: the caller supplies `uploadFile`; this component owns only the
 * interaction. Accepted types and max size are props because the attachment
 * policy is pending BDR-08 — callers pass the approved limits.
 */
export type UploadStatus = 'uploading' | 'done' | 'failed' | 'rejected';

export interface UploadEntry {
  id: number;
  file: File;
  status: UploadStatus;
  progress: number;
  /** Arabic reason for `rejected`/`failed` entries. */
  message?: string;
}

export interface AttachmentUploadProps {
  /**
   * Performs the actual upload. Resolve = success, reject/throw = failure.
   * `onProgress` receives 0–100.
   */
  uploadFile: (file: File, onProgress: (percent: number) => void) => Promise<void>;
  /** Allowed MIME types/extensions (input `accept` syntax). Empty = any. */
  accept?: string;
  /** Maximum size per file in bytes (pending BDR-08). */
  maxSizeBytes?: number;
  multiple?: boolean;
  disabled?: boolean;
  /** Notified whenever the entry list changes (for form-level state). */
  onEntriesChange?: (entries: readonly UploadEntry[]) => void;
  className?: string;
}

function matchesAccept(file: File, accept: string): boolean {
  const patterns = accept
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p !== '');
  if (patterns.length === 0) {
    return true;
  }
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) {
      return name.endsWith(pattern);
    }
    if (pattern.endsWith('/*')) {
      return type.startsWith(pattern.slice(0, -1));
    }
    return type === pattern;
  });
}

export function AttachmentUpload({
  uploadFile,
  accept = '',
  maxSizeBytes,
  multiple = true,
  disabled = false,
  onEntriesChange,
  className,
}: AttachmentUploadProps) {
  const [entries, setEntries] = useState<readonly UploadEntry[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  // Notify the parent from an effect — never from inside a state updater —
  // so the updater stays pure (safe under Strict Mode / concurrent rendering).
  // The initial empty state is not reported; only real changes are.
  const onEntriesChangeRef = useRef(onEntriesChange);
  useEffect(() => {
    onEntriesChangeRef.current = onEntriesChange;
  });
  const hasChanged = useRef(false);
  useEffect(() => {
    if (hasChanged.current) {
      onEntriesChangeRef.current?.(entries);
      return;
    }
    hasChanged.current = true;
  }, [entries]);

  const updateEntries = useCallback(
    (updater: (current: readonly UploadEntry[]) => readonly UploadEntry[]) => {
      setEntries(updater);
    },
    [],
  );

  const startUpload = useCallback(
    (id: number, file: File) => {
      updateEntries((current) =>
        current.map((entry) =>
          entry.id === id
            ? { ...entry, status: 'uploading', progress: 0, message: undefined }
            : entry,
        ),
      );
      uploadFile(file, (percent) => {
        updateEntries((current) =>
          current.map((entry) =>
            entry.id === id ? { ...entry, progress: Math.max(0, Math.min(100, percent)) } : entry,
          ),
        );
      })
        .then(() => {
          updateEntries((current) =>
            current.map((entry) =>
              entry.id === id ? { ...entry, status: 'done', progress: 100 } : entry,
            ),
          );
        })
        .catch((error: unknown) => {
          updateEntries((current) =>
            current.map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    status: 'failed',
                    message: error instanceof Error ? error.message : uiText.upload.failed,
                  }
                : entry,
            ),
          );
        });
    },
    [updateEntries, uploadFile],
  );

  const addFiles = useCallback(
    (files: readonly File[]) => {
      for (const file of files.slice(0, multiple ? files.length : 1)) {
        const id = nextId.current++;
        let rejection: string | undefined;
        if (accept !== '' && !matchesAccept(file, accept)) {
          rejection = uiText.upload.typeNotAllowed;
        } else if (maxSizeBytes !== undefined && file.size > maxSizeBytes) {
          rejection = uiText.upload.tooLarge;
        }
        updateEntries((current) => [
          ...current,
          {
            id,
            file,
            status: rejection !== undefined ? 'rejected' : 'uploading',
            progress: 0,
            message: rejection,
          },
        ]);
        if (rejection === undefined) {
          startUpload(id, file);
        }
      }
    },
    [accept, maxSizeBytes, multiple, startUpload, updateEntries],
  );

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    if (!disabled) {
      addFiles(Array.from(event.dataTransfer.files));
    }
  }

  return (
    <div className={cn('flex flex-col gap-sm', className)}>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled || undefined}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) {
            setDragOver(true);
          }
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-sm rounded-lg border-2 border-dashed px-lg py-xl text-center transition-colors',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
          dragOver ? 'border-primary bg-primary/5' : 'border-neutral-300 bg-neutral-100/50',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="text-neutral-400">
          <UploadIcon width={28} height={28} />
        </span>
        <p className="text-sm text-neutral-500">{uiText.upload.prompt}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept === '' ? undefined : accept}
          multiple={multiple}
          disabled={disabled}
          className="hidden"
          onChange={(event) => {
            addFiles(Array.from(event.target.files ?? []));
            event.target.value = '';
          }}
        />
      </div>

      {entries.length > 0 ? (
        <ul className="flex flex-col gap-xs">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center gap-sm rounded-md border border-neutral-200 bg-white px-md py-sm text-sm"
            >
              <span className="shrink-0 text-neutral-400">
                {entry.status === 'uploading' ? <Spinner /> : <FileIcon />}
              </span>
              <span className="min-w-0 flex-1 truncate" dir="ltr">
                {entry.file.name}
              </span>
              {entry.status === 'uploading' ? (
                <span className="shrink-0 text-xs text-neutral-400 tabular-nums" dir="ltr">
                  {entry.progress}%
                </span>
              ) : null}
              {entry.status === 'done' ? (
                <span className="shrink-0 text-xs text-success">{uiText.upload.done}</span>
              ) : null}
              {entry.status === 'failed' || entry.status === 'rejected' ? (
                <span className="shrink-0 text-xs text-danger">
                  {entry.message ?? uiText.upload.failed}
                </span>
              ) : null}
              {entry.status === 'failed' ? (
                <Button variant="ghost" size="sm" onClick={() => startUpload(entry.id, entry.file)}>
                  {uiText.upload.retry}
                </Button>
              ) : null}
              <button
                type="button"
                aria-label={uiText.upload.remove}
                onClick={() =>
                  updateEntries((current) => current.filter((item) => item.id !== entry.id))
                }
                className="shrink-0 rounded-sm p-xs text-neutral-400 hover:text-danger focus-visible:outline-2 focus-visible:outline-primary"
              >
                <CloseIcon />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
