import { MasterDataService, type MasterRepository } from '../shared/master-data';
import { RepositoryFactory } from '../shared/repository-factory';
import type { Category, CategoryInput } from './category';

/**
 * Categories — repository seam and service, instantiated from the Reference
 * Framework. The implementation comes from the central RepositoryFactory
 * (single persistence entry point / Supabase swap seam, TD-004).
 */
export type CategoryRepository = MasterRepository<Category>;

export function getCategoryRepository(): CategoryRepository {
  return RepositoryFactory.get<Category>('aldaftar.categories');
}

export class CategoryService extends MasterDataService<Category, CategoryInput> {
  constructor(repo: CategoryRepository = getCategoryRepository()) {
    super('categories', repo);
  }

  protected sanitize(input: CategoryInput, name: string) {
    return { name, notes: input.notes?.trim() ?? '' };
  }
}

let service: CategoryService | undefined;

/** Module singleton used by the Categories screen. */
export function getCategoryService(): CategoryService {
  if (service === undefined) {
    service = new CategoryService();
  }
  return service;
}
