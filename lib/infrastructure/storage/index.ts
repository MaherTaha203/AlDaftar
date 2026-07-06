// Storage boundary — the IFileStorage contract + the Supabase implementation
// (GA Foundation). Business-blind: buckets/paths only, no business meaning.

export type {
  IFileStorage,
  ListOptions,
  StoredObject,
  UploadData,
  UploadOptions,
} from './file-storage';
export { SupabaseFileStorage } from './supabase-file-storage';
