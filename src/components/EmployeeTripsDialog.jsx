import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plane, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { StoredDocButton } from "@/components/VaultDocLink";
import { useI18n } from "@/lib/i18n";

export default function EmployeeTripsDialog({ open, onClose, employee }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: (n) => `انتدابات الموظف — ${n}`,
    loading: "جارٍ التحميل...",
    empty: "لا توجد انتدابات مسجلة لهذا الموظف.",
    thType: "النوع", thDest: "الوجهة", thPeriod: "الفترة", thDays: "الأيام", thStatus: "الحالة", thDoc: "المستند",
    internal: "داخلية", external: "خارجية",
  } : {
    title: (n) => `Employee trips — ${n}`,
    loading: "Loading...",
    empty: "No trips recorded for this employee.",
    thType: "Type", thDest: "Destination", thPeriod: "Period", thDays: "Days", thStatus: "Status", thDoc: "Document",
    internal: "Internal", external: "External",
  };
  const statusLabel = isAr ? {
    draft: { label: "مسودة", cls: "bg-slate-100 text-slate-600" },
    pending: { label: "قيد الاعتماد", cls: "bg-amber-50 text-amber-600" },
    approved: { label: "معتمدة", cls: "bg-blue-50 text-blue-600" },
    in_progress: { label: "قيد التنفيذ", cls: "bg-indigo-50 text-indigo-600" },
    completed: { label: "مكتملة", cls: "bg-emerald-50 text-emerald-600" },
    cancelled: { label: "ملغاة", cls: "bg-rose-50 text-rose-600" },
    rejected: { label: "مرفوضة", cls: "bg-rose-100 text-rose-700" },
  } : {};
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !employee?.id) return;
    setLoading(true);
    base44.entities.BusinessTrip.filter({ employee_id: employee.id }, "-created_date", 500)
      .then(setTrips)
      .catch(() => setTrips([]))
      .finally(() => setLoading(false));
  }, [open, employee?.id]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Plane size={18} /> {t.title(employee?.employee_number)}</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">{t.loading}</div>
        ) : trips.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground">{t.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground bg-muted/50">
                <tr>
                  <th className="text-right px-3 py-2 font-medium">{t.thType}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thDest}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thPeriod}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thDays}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thStatus}</th>
                  <th className="text-right px-3 py-2 font-medium">{t.thDoc}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {trips.map((tr) => {
                  const st = statusLabel[tr.status] || { label: tr.status, cls: "bg-slate-100 text-slate-600" };
                  return (
                    <tr key={tr.id}>
                      <td className="px-3 py-2">{tr.trip_type === "external" ? t.external : t.internal}</td>
                      <td className="px-3 py-2">{tr.destination || "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{tr.start_date} ← {tr.end_date}</td>
                      <td className="px-3 py-2">{tr.days_count || 0}</td>
                      <td className="px-3 py-2"><span className={cn("text-xs px-2 py-0.5 rounded-full", st.cls)}>{st.label}</span></td>
                      <td className="px-3 py-2">
                        {tr.approval_pdf_url ? (
                          <StoredDocButton value={tr.approval_pdf_url} className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100">
                            <Download size={13} /> مستند الانتداب
                          </StoredDocButton>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}