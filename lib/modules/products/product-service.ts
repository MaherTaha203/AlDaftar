import { ErrorFactory, isNonEmptyString } from '@/lib/core';
import { MasterDataService, type MasterRepository } from '../shared/master-data';
import { RepositoryFactory } from '../shared/repository-factory';
import type { Product, ProductInput } from './product';

/**
 * Products — repository seam and service on the frozen Reference Framework.
 * Module-specific rule (governance Rule 3): the unit of measure is required
 * — purchase lines derive their unit from the product.
 */
export type ProductRepository = MasterRepository<Product>;

export function getProductRepository(): ProductRepository {
  return RepositoryFactory.get<Product>('aldaftar.products');
}

export class ProductService extends MasterDataService<Product, ProductInput> {
  constructor(repo: ProductRepository = getProductRepository()) {
    super('products', repo);
  }

  protected sanitize(input: ProductInput, name: string) {
    if (!isNonEmptyString(input.unitId)) {
      throw ErrorFactory.validation('Product unit is required', { field: 'unitId' });
    }
    return {
      name,
      code: input.code?.trim() ?? '',
      categoryId: input.categoryId?.trim() ?? '',
      unitId: input.unitId.trim(),
      notes: input.notes?.trim() ?? '',
    };
  }
}

let service: ProductService | undefined;

/** Module singleton used by the Products screen and the Purchases module. */
export function getProductService(): ProductService {
  if (service === undefined) {
    service = new ProductService();
  }
  return service;
}
