import { success, type AsyncResult } from '@/lib/core';
import type { IFileStorage } from '@/lib/infrastructure';
import type { FileStore } from './local-file-store';

/**
 * SupabaseFileStore — the Supabase Storage implementation of the modules'
 * FileStore surface (save/load/remove), adapting the infrastructure
 * IFileStorage contract. The storage client is INJECTED so this module has
 * no import-time dependency on configuration; wiring lives in
 * `supabase-provider.ts`. Attachment binaries land in the 'attachments'
 * bucket under their existing storage keys — the same keys the metadata rows
 * reference, so no key translation exists to drift.
 */
export class SupabaseFileStore implements FileStore {
  private readonly storage: IFileStorage;

  constructor(storage: IFileStorage) {
    this.storage = storage;
  }

  async save(key: string, file: Blob): AsyncResult<void> {
    const result = await this.storage.upload(key, file, {
      contentType: file.type || undefined,
      upsert: false,
    });
    return result.ok ? success(undefined) : result;
  }

  async load(key: string): AsyncResult<Blob> {
    return this.storage.download(key);
  }

  async remove(key: string): AsyncResult<void> {
    return this.storage.remove([key]);
  }
}
