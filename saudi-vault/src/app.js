import express from 'express';
import fs from 'fs';
import { config } from './config.js';
import { requireApiKey, safeRequestLog, errorHandler } from './middleware/index.js';
import employeesRouter from './routes/employees.js';
import documentsRouter from './routes/documents.js';
import payrollRouter from './routes/payroll.js';
import modulesRouter from './routes/modules.js';
import nitaqatRouter from './routes/nitaqat.js';

fs.mkdirSync(config.storageDir, { recursive: true });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '10mb' }));
app.use(safeRequestLog);

// فحص صحة — بدون مصادقة
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// مسارات البيانات الحساسة — محمية بمفتاح API
app.use('/api/vault/employees', requireApiKey, employeesRouter);
app.use('/api/vault/payroll', requireApiKey, payrollRouter);
// المسارات داخل documents router تحدد requireApiKey بنفسها (التنزيل عام بالرمز)
app.use('/api/vault/documents', documentsRouter);
// الوحدات الحساسة الموسّعة — CRUD عام لكل جدول عبر crudFactory
app.use('/api/vault/modules', modulesRouter);
// كتالوج نطاقات قوى — بيانات مرجعية عامة تُحدَّث تلقائياً من المصدر الوزاري
app.use('/api/vault/nitaqat', nitaqatRouter);

app.use(errorHandler);

export default app;