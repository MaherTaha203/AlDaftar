import { ApplicationService } from '@/lib/application';
import { type AsyncResult, type Result } from '@/lib/core';
import { getPurchaseService } from '@/lib/modules/purchases';
import { getPurchaseReturnService } from '@/lib/modules/purchase-returns';
import { getPaymentService } from '@/lib/modules/payments';
import { getSupplierService } from '@/lib/modules/suppliers';
import { getProductService } from '@/lib/modules/products';
import { getCategoryService } from '@/lib/modules/categories';
import { getUnitService } from '@/lib/modules/units';
import { getAttachmentService } from '@/lib/modules/attachments';
import { getAuditService } from '@/lib/modules/audit';
import type { ReportingSnapshot } from './aggregations';

/**
 * ReportingService — the read-model loader (business-architecture R1). It only
 * READS: it fetches every module's records once and returns an immutable
 * snapshot; the pure functions in `aggregations.ts` turn that snapshot into
 * report data. It writes nothing and stores nothing (R2). All figures are
 * derived from posted documents at read time (approved decision).
 */
export class ReportingService extends ApplicationService {
  constructor() {
    super('reporting');
  }

  /** Loads a consistent read snapshot of every module the reports draw from. */
  loadSnapshot(): AsyncResult<ReportingSnapshot> {
    return this.execute('reporting.loadSnapshot', async () => {
      const [
        purchases,
        returns,
        payments,
        suppliers,
        products,
        categories,
        units,
        attachments,
        auditEntries,
      ] = await Promise.all([
        getPurchaseService().list(),
        getPurchaseReturnService().list(),
        getPaymentService().list(),
        getSupplierService().list(),
        getProductService().list(),
        getCategoryService().list(),
        getUnitService().list(),
        getAttachmentService().listAll(),
        getAuditService().list(),
      ]);

      return {
        purchases: this.unwrap(purchases),
        returns: this.unwrap(returns),
        payments: this.unwrap(payments),
        suppliers: this.unwrap(suppliers),
        products: this.unwrap(products),
        categories: this.unwrap(categories),
        units: this.unwrap(units),
        attachments: this.unwrap(attachments),
        auditEntries: this.unwrap(auditEntries),
      };
    });
  }

  private unwrap<T>(result: Result<T>): T {
    if (!result.ok) {
      throw result.error;
    }
    return result.value;
  }
}

let service: ReportingService | undefined;

/** Module singleton used by report/dashboard screens. */
export function getReportingService(): ReportingService {
  if (service === undefined) {
    service = new ReportingService();
  }
  return service;
}
