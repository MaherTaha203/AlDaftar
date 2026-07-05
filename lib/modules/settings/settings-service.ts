import { ApplicationService } from '@/lib/application';
import { type AsyncResult, type Result } from '@/lib/core';
import { type LocalRecordStore } from '../shared/local-record-store';
import { RepositoryFactory } from '../shared/repository-factory';
import { AuditAction, getAuditService } from '../audit';
import {
  EMPTY_COMPANY_PROFILE,
  SETTINGS_RECORD_ID,
  type AppSettingsRecord,
  type CompanyProfile,
} from './settings';

/**
 * SettingsService — reads and writes the single company-profile record. A save
 * upserts the fixed row and writes an audit entry (settings changes are
 * audited, 01 §7). Currency/numbering/display are constants, not stored.
 */
export type SettingsRepository = Pick<
  LocalRecordStore<AppSettingsRecord>,
  'findById' | 'create' | 'update'
>;

export function getSettingsRepository(): SettingsRepository {
  return RepositoryFactory.get<AppSettingsRecord>('aldaftar.settings');
}

function toProfile(record: AppSettingsRecord): CompanyProfile {
  return {
    companyName: record.companyName,
    address: record.address,
    phone: record.phone,
    taxReference: record.taxReference,
    logoDataUrl: record.logoDataUrl,
  };
}

export class SettingsService extends ApplicationService {
  private readonly repository: SettingsRepository;

  constructor(repository: SettingsRepository = getSettingsRepository()) {
    super('settings');
    this.repository = repository;
  }

  /** The company profile, or empty defaults when none has been saved. */
  getProfile(): AsyncResult<CompanyProfile> {
    return this.execute('settings.getProfile', async () => {
      const record = this.unwrap(await this.repository.findById(SETTINGS_RECORD_ID));
      return record ? toProfile(record) : EMPTY_COMPANY_PROFILE;
    });
  }

  /** Upserts the company profile and records an audit entry. */
  saveProfile(profile: CompanyProfile): AsyncResult<CompanyProfile> {
    return this.execute('settings.saveProfile', async () => {
      const existing = this.unwrap(await this.repository.findById(SETTINGS_RECORD_ID));
      const sanitized: CompanyProfile = {
        companyName: profile.companyName.trim(),
        address: profile.address.trim(),
        phone: profile.phone.trim(),
        taxReference: profile.taxReference.trim(),
        logoDataUrl: profile.logoDataUrl,
      };
      const saved = existing
        ? this.unwrap(await this.repository.update(SETTINGS_RECORD_ID, sanitized))
        : this.unwrap(await this.repository.create({ id: SETTINGS_RECORD_ID, ...sanitized }));
      await getAuditService().record({
        action: AuditAction.Update,
        entityType: 'settings',
        entityId: SETTINGS_RECORD_ID,
        entityLabel: 'ملف الشركة',
        summary: 'تحديث ملف الشركة',
        before: existing ? toProfile(existing) : null,
        after: sanitized,
      });
      return toProfile(saved);
    });
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }
}

let service: SettingsService | undefined;

export function getSettingsService(): SettingsService {
  if (service === undefined) {
    service = new SettingsService();
  }
  return service;
}
