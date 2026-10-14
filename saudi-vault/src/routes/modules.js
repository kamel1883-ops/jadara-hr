import { Router } from 'express';
import { createCrudRouter } from '../lib/crudFactory.js';
import { requireApiKey, requireTenant } from '../middleware/index.js';

const router = Router();

// كل وحدة حساسة: اسم الجدول، عمود المرجع، بادئة المرجع
const MODULES = [
  { path: 'complaints',      table: 'vault_complaints',      refCol: 'complaint_ref', refPrefix: 'cmpl' },
  { path: 'warnings',       table: 'vault_warnings',         refCol: 'warning_ref',   refPrefix: 'wrn' },
  { path: 'licenses',       table: 'vault_licenses',         refCol: 'license_ref',   refPrefix: 'lic' },
  { path: 'platform-subs',  table: 'vault_platform_subs',   refCol: 'sub_ref',        refPrefix: 'psub' },
  { path: 'org-structure', table: 'vault_org_structure',    refCol: 'org_ref',        refPrefix: 'org' },
  { path: 'succession',     table: 'vault_succession',       refCol: 'succession_ref', refPrefix: 'suc' },
  { path: 'training',       table: 'vault_training',         refCol: 'training_ref',   refPrefix: 'trn' },
  { path: 'performance',    table: 'vault_performance',     refCol: 'perf_ref',       refPrefix: 'perf' },
  { path: 'eos',            table: 'vault_eos',             refCol: 'eos_ref',        refPrefix: 'eos' },
  { path: 'equipment',      table: 'vault_equipment',       refCol: 'equip_ref',      refPrefix: 'eqp' },
  { path: 'expenses',       table: 'vault_expenses',         refCol: 'expense_ref',   refPrefix: 'exp' },
  { path: 'business-trips',  table: 'vault_business_trips',   refCol: 'trip_ref',       refPrefix: 'trip' },
  { path: 'leaves',         table: 'vault_leaves',           refCol: 'leave_ref',      refPrefix: 'lv' },
  { path: 'approvals',      table: 'vault_approvals',        refCol: 'approval_ref',   refPrefix: 'appr' },
  { path: 'appointees',     table: 'vault_appointees',       refCol: 'appointee_ref',  refPrefix: 'apt' },
  { path: 'reports',        table: 'vault_reports',          refCol: 'report_ref',    refPrefix: 'rpt' },
  { path: 'gosi',           table: 'vault_gosi',             refCol: 'gosi_ref',       refPrefix: 'gosi' },
];

for (const m of MODULES) {
  router.use(`/${m.path}`, requireApiKey, requireTenant, createCrudRouter(m));
}

export default router;