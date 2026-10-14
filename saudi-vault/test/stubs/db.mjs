// بديل db.js للاختبار: يحاكي جدولاً واحداً بسجل واحد لكل ref/tenant
globalThis.__vaultRows = globalThis.__vaultRows || [];
globalThis.__vaultCalls = globalThis.__vaultCalls || [];

export async function query(text, params) {
  const sql = String(text).trim();
  globalThis.__vaultCalls.push({ sql, params });
  if (/^SELECT data_enc/i.test(sql)) {
    const row = globalThis.__vaultRows.find((r) => r.ref === params[0] && r.tenant === params[1]);
    return { rows: row ? [{ data_enc: row.data_enc }] : [], rowCount: row ? 1 : 0 };
  }
  if (/^UPDATE/i.test(sql)) {
    const row = globalThis.__vaultRows.find((r) => r.ref === params[1] && r.tenant === params[3]);
    if (!row) return { rows: [], rowCount: 0 };
    row.data_enc = params[0];
    if (params[2]) row.emp_ref = params[2];
    return { rows: [], rowCount: 1 };
  }
  return { rows: [], rowCount: 0 };
}
