import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { medicalReportRequest, medicalReportError } from '@/components/medical/medicalReportClient';
import MedicalReportRows from '@/components/medical/MedicalReportRows';

export default function MedicalReportsDialog({ employee, isAr = true, session = null }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ items: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const load = async (cursor = null) => {
    const current = generation.current;
    setBusy(true); setError('');
    try {
      const result = await medicalReportRequest(employee.id, { action: 'list', cursor }, session);
      if (current !== generation.current) return;
      setData(previous => ({ ...result, items: cursor ? [...new Map([...previous.items, ...result.items].map(row => [row.doc_ref, row])).values()] : result.items }));
    } catch (err) { if (current === generation.current) setError(medicalReportError(err, isAr)); }
    finally { if (current === generation.current) setBusy(false); }
  };
  useEffect(() => { generation.current++; if (open && employee?.id) { setData({ items: [] }); load(); } return () => { generation.current++; }; }, [open, employee?.id]);
  const warning = data.warning === 'archive_update_required'
    ? (isAr ? 'استرجاع الملفات السابقة غير المفهرسة يتطلب نشر تحديث خادم الخزنة؛ لم يُفحص الأرشيف بعد.' : 'The vault server update is required to find unlinked older files. The archive has not been checked yet.')
    : (isAr ? 'تعذّر فحص الأرشيف السابق بأمان؛ المعروض هو التقارير المربوطة بطلبات الموظف فقط.' : 'The older archive could not be checked safely; only linked reports are shown.');
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" size="sm" disabled={!employee?.id}>{isAr ? 'التقارير الطبية' : 'Medical reports'}</Button></DialogTrigger>
    <DialogContent dir={isAr ? 'rtl' : 'ltr'} className="max-w-xl max-h-[85vh] overflow-y-auto">
      <DialogHeader><DialogTitle>{isAr ? 'التقارير الطبية للموظف' : 'Employee medical reports'}</DialogTitle></DialogHeader>
      <div className="text-sm"><div className="font-semibold">{data.employee?.full_name || employee?.full_name}</div><div className="text-xs text-muted-foreground">{isAr ? 'الرقم الموحد للمنشأة' : 'Establishment unified number'}: {data.employee?.unified_number || employee?.unified_number || '—'}</div></div>
      {data.warning && <p role="status" className="text-sm text-muted-foreground rounded-lg border border-border p-3">{warning}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <MedicalReportRows items={data.items} employeeId={employee?.id} session={session} isAr={isAr} />
      {busy && <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />{isAr ? 'جارٍ فحص التقارير...' : 'Loading reports...'}</div>}
      {!busy && !error && !data.warning && !data.items.length && <p className="text-sm text-muted-foreground">{isAr ? 'لم يُعثر على تقارير طبية محفوظة لهذا الموظف.' : 'No stored medical reports were found for this employee.'}</p>}
      {data.has_more && <Button variant="outline" disabled={busy} onClick={() => load(data.next_cursor)}>{isAr ? 'تحميل المزيد' : 'Load more'}</Button>}
    </DialogContent>
  </Dialog>;
}