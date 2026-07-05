import { MasterDataService, type MasterRepository } from '../shared/master-data';
import { RepositoryFactory } from '../shared/repository-factory';
import type { Currency, CurrencyInput } from './currency';

/**
 * Currencies — repository seam and service, instantiated from the frozen
 * Reference Framework. Module-specific rule (stays here per governance
 * Rule 3): the code is normalized to trimmed uppercase.
 */
export type CurrencyRepository = MasterRepository<Currency>;

export function getCurrencyRepository(): CurrencyRepository {
  return RepositoryFactory.get<Currency>('aldaftar.currencies');
}

export class CurrencyService extends MasterDataService<Currency, CurrencyInput> {
  constructor(repo: CurrencyRepository = getCurrencyRepository()) {
    super('currencies', repo);
  }

  protected sanitize(input: CurrencyInput, name: string) {
    return { name, code: input.code?.trim().toUpperCase() ?? '' };
  }
}

let service: CurrencyService | undefined;

/** Module singleton used by the Currencies screen. */
export function getCurrencyService(): CurrencyService {
  if (service === undefined) {
    service = new CurrencyService();
  }
  return service;
}
