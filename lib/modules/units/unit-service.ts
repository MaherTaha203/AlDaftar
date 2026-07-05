import { MasterDataService, type MasterRepository } from '../shared/master-data';
import { RepositoryFactory } from '../shared/repository-factory';
import type { Unit, UnitInput } from './unit';

/**
 * Units — repository seam and service, instantiated from the frozen
 * Reference Framework. Implementation comes from the central
 * RepositoryFactory (single persistence entry point / Supabase swap seam).
 */
export type UnitRepository = MasterRepository<Unit>;

export function getUnitRepository(): UnitRepository {
  return RepositoryFactory.get<Unit>('aldaftar.units');
}

export class UnitService extends MasterDataService<Unit, UnitInput> {
  constructor(repo: UnitRepository = getUnitRepository()) {
    super('units', repo);
  }

  protected sanitize(input: UnitInput, name: string) {
    return { name, notes: input.notes?.trim() ?? '' };
  }
}

let service: UnitService | undefined;

/** Module singleton used by the Units screen. */
export function getUnitService(): UnitService {
  if (service === undefined) {
    service = new UnitService();
  }
  return service;
}
