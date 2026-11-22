import { secrets } from 'base44:runtime';

// Keys and employee references are derived by the caller after verifying company membership.
export async function medicalReportPage(keys, empRef, cursor = null, docRef = null) {
  if (!empRef || !keys.length) return { items: [], has_more: false, next_cursor: null };
  const url = secrets.get('VAULT_URL');
  const key = secrets.get('VAULT_API_KEY');
  if (!url || !key) return { items: [], unavailable: 'not_configured' };
  const response = await fetch(`${url.replace(/\/$/, '')}/api/vault/documents/medical-reports/lookup`, {
    method: 'POST',
    headers: { 'X-Vault-Key': key, 'X-Tenant-Id': keys[0], 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenant_ids: keys, emp_refs: [empRef], cursor, doc_ref: docRef }),
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 404) return { items: [], unavailable: 'archive_update_required' };
  if (!response.ok) throw new Error('medical_archive_unavailable');
  const result = await response.json();
  if (!Array.isArray(result.items)) throw new Error('invalid_archive_response');
  // Defense in depth: no document with a foreign employee/storage scope reaches the response.
  return { ...result, items: result.items.filter(row => row.emp_ref === empRef && keys.includes(row.tenant_id)) };
}