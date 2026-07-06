import { failure, success, ErrorFactory, type AsyncResult } from '@/lib/core';
import { getSupabaseClient } from '../database/connection-factory';
import type {
  IFileStorage,
  ListOptions,
  StoredObject,
  UploadData,
  UploadOptions,
} from './file-storage';

/**
 * SupabaseFileStorage — the Supabase Storage implementation of the
 * IFileStorage contract (GA Foundation phase). One instance per bucket;
 * paths are bucket-relative. Errors are normalized into the standard
 * Result form — callers never see provider-specific error shapes.
 *
 * Foundation-only: constructing it performs no network call (the shared
 * client is created lazily). Business modules keep using their existing
 * local file store until the migration phase flips the seam.
 */
export class SupabaseFileStorage implements IFileStorage {
  private readonly bucket: string;

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  async upload(path: string, data: UploadData, options?: UploadOptions): AsyncResult<StoredObject> {
    try {
      const { error } = await getSupabaseClient()
        .storage.from(this.bucket)
        .upload(path, data, {
          contentType: options?.contentType,
          upsert: options?.upsert ?? false,
        });
      if (error) {
        return failure(ErrorFactory.fromUnknown(error, `Upload to '${path}' failed`));
      }
      const size = data instanceof Blob ? data.size : (data as ArrayBuffer | Uint8Array).byteLength;
      return success({ path, size, contentType: options?.contentType });
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Upload to '${path}' failed`));
    }
  }

  async download(path: string): AsyncResult<Blob> {
    try {
      const { data, error } = await getSupabaseClient().storage.from(this.bucket).download(path);
      if (error || data === null) {
        return failure(ErrorFactory.fromUnknown(error, `Download of '${path}' failed`));
      }
      return success(data);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, `Download of '${path}' failed`));
    }
  }

  async remove(paths: readonly string[]): AsyncResult<void> {
    try {
      const { error } = await getSupabaseClient()
        .storage.from(this.bucket)
        .remove([...paths]);
      if (error) {
        return failure(ErrorFactory.fromUnknown(error, 'Removal of stored objects failed'));
      }
      return success(undefined);
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, 'Removal of stored objects failed'));
    }
  }

  async list(options?: ListOptions): AsyncResult<readonly StoredObject[]> {
    try {
      const { data, error } = await getSupabaseClient()
        .storage.from(this.bucket)
        .list(options?.prefix, { limit: options?.limit });
      if (error || data === null) {
        return failure(ErrorFactory.fromUnknown(error, 'Listing stored objects failed'));
      }
      return success(
        data.map((item) => ({
          path: options?.prefix ? `${options.prefix}/${item.name}` : item.name,
          size: (item.metadata as { size?: number } | null)?.size,
          contentType: (item.metadata as { mimetype?: string } | null)?.mimetype,
        })),
      );
    } catch (error) {
      return failure(ErrorFactory.fromUnknown(error, 'Listing stored objects failed'));
    }
  }
}
