import { MasterDataService } from '../shared/master-data';
import type { Supplier, SupplierInput } from './supplier';
import { getSupplierRepository, type SupplierRepository } from './supplier-repository';

/**
 * SupplierService — the Suppliers module's application service, an
 * instantiation of the shared master-data kit (name required + unique,
 * archive/reactivate, Arabic-collated listing, execute() logging) adding
 * only the supplier-specific fields. Public API unchanged since Phase 7.
 */
export class SupplierService extends MasterDataService<Supplier, SupplierInput> {
  constructor(repository: SupplierRepository = getSupplierRepository()) {
    super('suppliers', repository);
  }

  protected sanitize(input: SupplierInput, name: string) {
    return {
      name,
      phone: input.phone?.trim() ?? '',
      address: input.address?.trim() ?? '',
      taxReference: input.taxReference?.trim() ?? '',
      notes: input.notes?.trim() ?? '',
    };
  }
}

let service: SupplierService | undefined;

/** Module singleton used by the Suppliers screens. */
export function getSupplierService(): SupplierService {
  if (service === undefined) {
    service = new SupplierService();
  }
  return service;
}
