// Reporting module — read-model loader + pure aggregations (business-blind
// derived read model; writes nothing). Backs the Reports catalog (BDR-10 /
// BDD-009) and the Dashboard (R-01).

export { ReportingService, getReportingService } from './reporting-service';
export * from './aggregations';
