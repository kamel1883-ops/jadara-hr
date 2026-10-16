-- ============================================================
-- Saudi Data Vault — database schema (موسّع)
-- كل القيم الحساسة تُخزّن مشفّرة AES-256-GCM
-- ============================================================

-- بيانات الموظفين الحساسة + الحقول الوظيفية المالية
CREATE TABLE IF NOT EXISTS vault_employees (
  emp_ref            TEXT PRIMARY KEY,
  tenant_id          TEXT NOT NULL,
  full_name_enc      TEXT,
  national_id_enc    TEXT,
  passport_number_enc TEXT,
  bank_account_enc   TEXT,
  birth_date_enc      TEXT,
  phone_enc          TEXT,
  address_enc         TEXT,
  emergency_contact_enc TEXT,
  health_insurance_number_enc TEXT,
  base_salary_enc    TEXT,
  housing_enc        TEXT,
  transport_enc      TEXT,
  other_enc          TEXT,
  ticket_value_enc   TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  updated_at         TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_employees_tenant ON vault_employees(tenant_id);

-- القيم المالية الحساسة (رواتب، بدلات، تأمينات) — لكل فترة
CREATE TABLE IF NOT EXISTS vault_payroll (
  payroll_ref        TEXT PRIMARY KEY,
  emp_ref            TEXT NOT NULL,
  tenant_id          TEXT NOT NULL,
  period_key         TEXT,
  base_salary_enc    TEXT,
  housing_enc        TEXT,
  transport_enc      TEXT,
  other_enc          TEXT,
  gross_enc          TEXT,
  net_enc            TEXT,
  gosi_employee_enc  TEXT,
  gosi_employer_enc  TEXT,
  created_at         TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (emp_ref) REFERENCES vault_employees(emp_ref) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vault_payroll_emp ON vault_payroll(emp_ref);
CREATE INDEX IF NOT EXISTS idx_vault_payroll_tenant_period ON vault_payroll(tenant_id, period_key);

-- المستندات المُولّدة — الملف على القرص المحلي
CREATE TABLE IF NOT EXISTS vault_documents (
  doc_ref     TEXT PRIMARY KEY,
  tenant_id   TEXT NOT NULL,
  emp_ref     TEXT,
  doc_type    TEXT NOT NULL,
  file_name   TEXT,
  mime_type   TEXT,
  file_path   TEXT NOT NULL,
  sha256      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_documents_tenant ON vault_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_emp ON vault_documents(emp_ref);
CREATE INDEX IF NOT EXISTS idx_vault_documents_type ON vault_documents(tenant_id, doc_type);

-- ============================================================
-- الجداول الموسّعة — السجل الكامل مشفّر كـ JSON في data_enc
-- Base44 يحتفظ بالـ ref + البيانات الوصفية للفلترة فقط
-- ============================================================

CREATE TABLE IF NOT EXISTS vault_complaints (
  complaint_ref TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_complaints_tenant ON vault_complaints(tenant_id);

CREATE TABLE IF NOT EXISTS vault_warnings (
  warning_ref   TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_warnings_tenant ON vault_warnings(tenant_id);

CREATE TABLE IF NOT EXISTS vault_licenses (
  license_ref   TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_licenses_tenant ON vault_licenses(tenant_id);

CREATE TABLE IF NOT EXISTS vault_platform_subs (
  sub_ref       TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_platform_subs_tenant ON vault_platform_subs(tenant_id);

CREATE TABLE IF NOT EXISTS vault_org_structure (
  org_ref       TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_org_structure_tenant ON vault_org_structure(tenant_id);

CREATE TABLE IF NOT EXISTS vault_succession (
  succession_ref TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_succession_tenant ON vault_succession(tenant_id);

CREATE TABLE IF NOT EXISTS vault_training (
  training_ref  TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_training_tenant ON vault_training(tenant_id);

CREATE TABLE IF NOT EXISTS vault_performance (
  perf_ref      TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_performance_tenant ON vault_performance(tenant_id);

CREATE TABLE IF NOT EXISTS vault_eos (
  eos_ref       TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_eos_tenant ON vault_eos(tenant_id);

CREATE TABLE IF NOT EXISTS vault_equipment (
  equip_ref     TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_equipment_tenant ON vault_equipment(tenant_id);

CREATE TABLE IF NOT EXISTS vault_expenses (
  expense_ref   TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_expenses_tenant ON vault_expenses(tenant_id);

CREATE TABLE IF NOT EXISTS vault_business_trips (
  trip_ref      TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_business_trips_tenant ON vault_business_trips(tenant_id);

CREATE TABLE IF NOT EXISTS vault_leaves (
  leave_ref     TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_leaves_tenant ON vault_leaves(tenant_id);

CREATE TABLE IF NOT EXISTS vault_approvals (
  approval_ref  TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_approvals_tenant ON vault_approvals(tenant_id);

CREATE TABLE IF NOT EXISTS vault_appointees (
  appointee_ref TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_appointees_tenant ON vault_appointees(tenant_id);

CREATE TABLE IF NOT EXISTS vault_reports (
  report_ref    TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_reports_tenant ON vault_reports(tenant_id);

CREATE TABLE IF NOT EXISTS vault_gosi (
  gosi_ref      TEXT PRIMARY KEY,
  tenant_id     TEXT NOT NULL,
  emp_ref       TEXT,
  period_key    TEXT,
  data_enc      TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vault_gosi_tenant ON vault_gosi(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vault_gosi_tenant_period ON vault_gosi(tenant_id, period_key);
-- ============================================================
-- كتالوج نطاقات قوى (Nitaqat) — بيانات مرجعية عامة ليست حسّاسة
-- يُحدَّث تلقائياً من المصدر الرسمي؛ الفشل لا يمسّ آخر نسخة سليمة
-- ============================================================
CREATE TABLE IF NOT EXISTS vault_nitaqat_catalog (
  id            TEXT PRIMARY KEY,          -- 'main'
  source_url    TEXT,
  content_hash  TEXT,                      -- sha256 للمحتوى المُعتمد
  data          JSONB,
  fetched_at    TIMESTAMPTZ,
  last_error    TEXT,
  updated_at    TIMESTAMPTZ DEFAULT now()
);
