import type { AsyncResult } from '@/lib/core';

/*
 * File/object storage abstraction. Contract only — the concrete provider
 * implementation (and any business use such as invoice attachments) belongs
 * to later phases.
 */

export interface StoredObject {
  /** Provider path/key of the object, e.g. 'invoices/2026/07/receipt.pdf'. */
  readonly path: string;
  readonly size?: number;
  readonly contentType?: string;
}

export type UploadData = Blob | ArrayBuffer | Uint8Array;

export interface UploadOptions {
  readonly contentType?: string;
  /** Overwrite an existing object at the same path instead of failing. */
  readonly upsert?: boolean;
}

export interface ListOptions {
  readonly prefix?: string;
  readonly limit?: number;
}

export interface IFileStorage {
  upload(path: string, data: UploadData, options?: UploadOptions): AsyncResult<StoredObject>;
  download(path: string): AsyncResult<Blob>;
  remove(paths: readonly string[]): AsyncResult<void>;
  list(options?: ListOptions): AsyncResult<readonly StoredObject[]>;
}
