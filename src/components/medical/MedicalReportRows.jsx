import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { medicalReportRequest, medicalReportError } from '@/components/medical/medicalReportClient';
import { reserveDocumentWindow, finishDocumentWindow } from '@/lib/documentWindow';

export default function MedicalReportRows({ items, employeeId, session, isAr }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const openReport = async (report) => {
    const tab = reserveDocumentWindow();
    setBusy(report.doc_ref); setError('');
    try {
      const result = await medicalReportRequest(employeeId, { action: 'open', doc_ref: report.doc_ref }, session);
      if (!result.download_url) throw new Error(result.error || 'unavailable');
      finishDocumentWindow(tab, result.download_url);
    } catch (err) { finishDocumentWindow(tab, null); setError(medicalReportError(err, isAr)); }
    finally { setBusy(''); }
  };
  return <div className="space-y-2">
    {items.map(report => <div key={report.doc_ref} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
      <div className="min-w-0 text-sm"><div className="truncate">{report.file_name || (isAr ? 'تقرير طبي' : 'Medical report')}</div>
        <div className="text-xs text-muted-foreground">{report.start_date ? `${report.start_date} — ${report.end_date}` : String(report.uploaded_at || '').slice(0, 10)}</div>
        {!report.leave_id && <div className="text-xs text-muted-foreground">{isAr ? 'محفوظ للموظف، غير مربوط بطلب محدد' : 'Employee archive, not linked to a specific request'}</div>}
        {!report.available && <div className="text-xs text-destructive">{isAr ? 'الملف غير موجود في الأرشيف' : 'File missing from archive'}</div>}
      </div>
      <Button variant="outline" size="sm" disabled={!!busy || !report.available} onClick={() => openReport(report)}>{busy === report.doc_ref ? <Loader2 className="animate-spin" /> : <FileText />}{isAr ? 'عرض التقرير' : 'Open report'}</Button>
    </div>)}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}