import { failure, success, ErrorFactory, type AsyncResult } from '@/lib/core';

/**
 * LocalFileStore — the ONE generic interim file-storage implementation
 * (extends the TD-004 policy to binaries). Attachment files are blobs and do
 * not fit localStorage, so they live in the browser's IndexedDB under a
 * single object store, keyed by the attachment's storage key.
 *
 * Temporary development enabler only — no features beyond save/load/delete.
 * `getFileStore()` is the single swap point where the Supabase Storage
 * implementation lands later (same surface, same Result contract); metadata
 * rows go through the standard RepositoryFactory, never through this store.
 *
 * Browser-only; calls on the server fail with a typed error (attachment
 * screens are client components, so this path is never exercised).
 */
export interface FileStore {
  save(key: string, file: Blob): AsyncResult<void>;
  load(key: string): AsyncResult<Blob>;
  remove(key: string): AsyncResult<void>;
}

const DB_NAME = 'aldaftar-files';
const STORE_NAME = 'files';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(ErrorFactory.internal('File storage is unavailable on the server'));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(ErrorFactory.fromUnknown(request.error));
  });
}

/** Runs one operation in its own transaction and closes the connection. */
async function withStore<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = operation(db.transaction(STORE_NAME, mode).objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(ErrorFactory.fromUnknown(request.error));
    });
  } finally {
    db.close();
  }
}

class LocalFileStore implements FileStore {
  async save(key: string, file: Blob): AsyncResult<void> {
    try {
      await withStore('readwrite', (store) => store.put(file, key));
      return success(undefined);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }

  async load(key: string): AsyncResult<Blob> {
    try {
      const value = await withStore<unknown>('readonly', (store) => store.get(key));
      if (!(value instanceof Blob)) {
        return failure(ErrorFactory.notFound(`File '${key}' was not found`, { key }));
      }
      return success(value);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }

  async remove(key: string): AsyncResult<void> {
    try {
      await withStore('readwrite', (store) => store.delete(key));
      return success(undefined);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error));
    }
  }
}

let store: FileStore | undefined;

/** The single file-storage entry point (Supabase Storage swap seam). */
export function getFileStore(): FileStore {
  if (store === undefined) {
    store = new LocalFileStore();
  }
  return store;
}
