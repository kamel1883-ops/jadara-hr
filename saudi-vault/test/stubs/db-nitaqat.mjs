// بديل db.js للاختبار — نسخة كتالوج nitaqat: صف واحد في جدول vault_nitaqat_catalog
globalThis.__catRow = globalThis.__catRow || null;
globalThis.__catCalls = globalThis.__catCalls || [];

export async function query(text, params) {
  const sql = String(text).trim();
  globalThis.__catCalls.push({ sql, params });

  if (/^SELECT source_url, content_hash/i.test(sql)) {
    const row = globalThis.__catRow;
    return {
      rows: row ? [{ source_url: row.source_url, content_hash: row.content_hash, data: row.data, fetched_at: row.fetched_at, last_error: row.last_error }] : [],
      rowCount: row ? 1 : 0,
    };
  }
  if (/^INSERT INTO vault_nitaqat_catalog/i.test(sql)) {
    globalThis.__catRow = {
      id: params[0], source_url: params[1], content_hash: params[2],
      data: params[3], fetched_at: new Date(), last_error: null,
    };
    return { rows: [], rowCount: 1 };
  }
  if (/SET fetched_at = now\(\)/i.test(sql)) {
    if (globalThis.__catRow) { globalThis.__catRow.fetched_at = new Date(); globalThis.__catRow.last_error = null; }
    return { rows: [], rowCount: globalThis.__catRow ? 1 : 0 };
  }
  if (/SET last_error = \$2/i.test(sql)) {
    if (globalThis.__catRow) globalThis.__catRow.last_error = params[1];
    return { rows: [], rowCount: globalThis.__catRow ? 1 : 0 };
  }
  return { rows: [], rowCount: 0 };
}
