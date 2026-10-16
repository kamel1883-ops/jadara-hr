#!/bin/sh
# Focused repair for the EXISTING deployed vault; does not rebuild or change keys/networks.
set -eu
umask 077
command -v docker >/dev/null 2>&1 || { echo 'Docker غير متوفر.' >&2; exit 1; }
[ -f docker-compose.yml ] || [ -f compose.yml ] || [ -f compose.yaml ] || { echo 'شغّل الإصلاح من مجلد الخزنة الحالي الذي يحتوي إعدادات Docker Compose.' >&2; exit 1; }
backup="backups/documents-repair-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -p "$backup"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > "$backup/database.dump"
[ -s "$backup/database.dump" ] || { echo 'تعذر أخذ نسخة احتياطية؛ لم يتغير شيء.' >&2; exit 1; }
echo 'حُفظت نسخة احتياطية. يبدأ إصلاح جدول المستندات دون حذف أي سجل أو ملف.'
docker compose exec -T db sh -c 'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB"' <<'SQL'
BEGIN;
SET LOCAL lock_timeout = '15s';
SELECT pg_advisory_xact_lock(hashtext('jadara-vault-schema'));
CREATE TABLE IF NOT EXISTS vault_documents (
  doc_ref TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, emp_ref TEXT,
  doc_type TEXT NOT NULL DEFAULT 'other', file_name TEXT, mime_type TEXT,
  file_path TEXT NOT NULL, sha256 TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS doc_ref TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS tenant_id TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS emp_ref TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS doc_type TEXT DEFAULT 'other';
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS mime_type TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS sha256 TEXT;
ALTER TABLE vault_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
-- Recover missing keys ONLY from the documented original tenant/ref storage path.
-- Existing nonempty keys must agree with the path; never move a document to another tenant.
WITH proven AS (
  SELECT ctid AS row_id, regexp_match(file_path,
    '^(/app/storage/|([.]/)?storage/)([A-Za-z0-9][A-Za-z0-9_-]{0,127})/(doc_[a-fA-F0-9]{32})[.]bin$') AS parts
  FROM vault_documents
  WHERE NULLIF(doc_ref, '') IS NULL OR NULLIF(tenant_id, '') IS NULL
)
UPDATE vault_documents AS d
SET doc_ref = COALESCE(NULLIF(d.doc_ref, ''), p.parts[4]),
    tenant_id = COALESCE(NULLIF(d.tenant_id, ''), p.parts[3])
FROM proven AS p
WHERE d.ctid = p.row_id AND p.parts IS NOT NULL
  AND (NULLIF(d.doc_ref, '') IS NULL OR d.doc_ref = p.parts[4])
  AND (NULLIF(d.tenant_id, '') IS NULL OR d.tenant_id = p.parts[3]);
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM vault_documents WHERE NULLIF(doc_ref, '') IS NULL OR NULLIF(tenant_id, '') IS NULL OR NULLIF(file_path, '') IS NULL) THEN
    RAISE EXCEPTION 'DOCUMENT_OWNERSHIP_UNRESOLVED: stopped safely; no guessing or reassignment. Restore or review original document metadata.';
  END IF;
  IF EXISTS (SELECT 1 FROM vault_documents GROUP BY doc_ref HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'DOCUMENT_REFERENCE_DUPLICATE: stopped safely; original rows preserved.';
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_vault_documents_ref_unique ON vault_documents(doc_ref);
CREATE INDEX IF NOT EXISTS idx_vault_documents_tenant ON vault_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vault_documents_emp ON vault_documents(emp_ref);
CREATE INDEX IF NOT EXISTS idx_vault_documents_type ON vault_documents(tenant_id, doc_type);
SELECT doc_ref, tenant_id, emp_ref, doc_type, file_name, mime_type, file_path, sha256, created_at FROM vault_documents LIMIT 0;
COMMIT;
SQL
# Probe the running old service, not just SQL or a separate replacement container.
docker compose exec -T vault node -e '
(async () => {
  const port = process.env.PORT || 4000;
  const res = await fetch(`http://127.0.0.1:${port}/api/vault/documents/doc_healthcheck_nonexistent/link`, {
    method: "POST", headers: {"X-Vault-Key":process.env.VAULT_API_KEY,"X-Tenant-Id":"doc_healthcheck","Content-Type":"application/json"},
    body: "{}", signal: AbortSignal.timeout(10000)
  });
  const body = await res.json();
  if (res.status !== 404 || body.error !== "not_found") {
    console.error("فشل فحص الخدمة بعد الترحيل:", res.status, body.code || body.error || "unknown");
    process.exit(1);
  }
  console.log("نجح استعلام المستندات في الخدمة العاملة. افتح الآن مستندًا محفوظًا للتأكد من ملفه وصلاحياته.");
})().catch(() => {console.error("تعذر فحص الخدمة؛ لا تُعد الخزنة جاهزة بعد.");process.exit(1);});'
echo "مكان النسخة الاحتياطية: $backup"