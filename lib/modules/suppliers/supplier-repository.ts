import type { MasterRepository } from '../shared/master-data';
import { RepositoryFactory } from '../shared/repository-factory';
import type { Supplier } from './supplier';

/**
 * Supplier repository seam. The module depends only on the contract and
 * obtains the implementation from the central RepositoryFactory (the single
 * persistence entry point and Supabase swap seam). Suppliers are never
 * deleted (01 §1.3 — archive instead), so the contract has no remove
 * operation by design.
 */
export type SupplierRepository = MasterRepository<Supplier>;

export function getSupplierRepository(): SupplierRepository {
  return RepositoryFactory.get<Supplier>('aldaftar.suppliers');
}
