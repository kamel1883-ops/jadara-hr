import express from 'express';
import fs from 'fs';
import { config } from './config.js';
import { requireApiKey, requireTenant, safeRequestLog, errorHandler } from './middleware/index.js';
import { query } from './db.js';
import employeesRouter from './routes/employees.js';
import documentsRouter from './routes/documents.js';
import payrollRouter from './routes/payroll.js';
import modulesRouter from './routes/modules.js';

fs.mkdirSync(config.storageDir, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(safeRequestLog);

// فحص صحة — بدون مصادقة
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', requireApiKey, async (req, res, next) => {
  try {
    await query('SELECT doc_ref, tenant_id, emp_ref, doc_type, file_name, mime_type, file_path, sha256, created_at FROM vault_documents LIMIT 0');
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'ok', documents_ready: true, schema_version: '2026-10-documents-2' });
  } catch (error) { next(error); }
});

// مسارات البيانات الحساسة — محمية بمفتاح API
app.use('/api/vault/employees', requireApiKey, requireTenant, employeesRouter);
app.use('/api/vault/payroll', requireApiKey, requireTenant, payrollRouter);
// المسارات داخل documents router تحدد requireApiKey بنفسها (التنزيل عام بالرمز)
app.use('/api/vault/documents', documentsRouter);
// الوحدات الحساسة الموسّعة — CRUD عام لكل جدول عبر crudFactory
app.use('/api/vault/modules', modulesRouter);

app.use(errorHandler);

export default app;