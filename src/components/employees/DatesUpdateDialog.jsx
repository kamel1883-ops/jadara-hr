import React, { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, BadgeCheck, AlertTriangle, IdCard, FileClock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { extractDatesFromFile, planDateUpdates, applyDateUpdates } from "@/lib/dateReportImport";

const COPY = {
  iqama: {
    ar: { title: "رفع تقرير لتحديث الهويات أو الإقامات", btn: "تحديث تواريخ الإقامات", field: "iqama_expiry" },
    en: { title: "Upload a report to update IDs / Iqamas", btn: "Update Iqama dates", field: "iqama_expiry" },
  },
  contract: {
    ar: { title: "رفع تقرير لتحديث تواريخ انتهاء العقود", btn: "تحديث تواريخ انتهاء العقود", field: "contract_end_date" },
    en: { title: "Upload a report to update contract end dates", btn: "Update contract end dates", field: "contract_end_date" },
  },
};

export default function DatesUpdateDialog({ open, onClose, kind = "iqama", employees = [], onSaved }) {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const meta = COPY[kind]?.[isAr ? "ar" : "en"] || COPY.iqama.ar;
  const field = meta.field;
  const t = isAr ? {
    desc: "ارفع الملف بأي صيغة (Excel أو PDF أو CSV أو صورة). يُقرأ الملف ويُطابَق كل صف برقم الهوية/الإقامة للموظف، ثم يُحدَّث التاريخ فقط لمن تختلف قيمته في النظام عما ورد في الملف.",
    pick: "اختر الملف",
    analyze: "تحليل الملف",
    analyzing: "جارٍ قراءة الملف…",
    apply: (n) => `تحديث ${n} موظف الآن`,
    applying: "جارٍ التحديث…",
    updated: "سيُحدَّث", same: "مطابق بلا تغيير", missing: "رقم هوية غير موجود",
    colEmp: "الموظف", colId: "الهوية/الإقامة", colFrom: "التاريخ الحالي", colTo: "التاريخ الجديد",
    done: (n) => `تم تحديث ${n} سجل بنجاح`,
    errNoRows: "لم أتمكن من قراءة أي رقم هوية وتاريخ انتهاء من هذا الملف — تأكد أن الملف يحتوي على رقم الهوية وتاريخ الانتهاء.",
    errGeneric: "تعذّر قراءة الملف، عاود المحاولة.",
    close: "إغلاق",
    note: "المطابقة برقم الهوية/الإقامة فقط — لا يُعدَّل أي موظف بلا تطابق.",
    unmatchedTitle: "أرقام هوية في الملف غير موجودة في المنشأة",
  } : {
    desc: "Upload the file in any format (Excel, PDF, CSV or an image). Every row is matched to an employee by national ID / Iqama, and only dates that differ from the system are updated.",
    pick: "Choose file",
    analyze: "Analyze file",
    analyzing: "Reading the file…",
    apply: (n) => `Update ${n} employees now`,
    applying: "Updating…",
    updated: "Will update", same: "Matching, no change", missing: "ID not found",
    colEmp: "Employee", colId: "National ID", colFrom: "Current", colTo: "New",
    done: (n) => `${n} record(s) updated successfully`,
    errNoRows: "Could not read any national ID with an expiry date from this file — make sure both are present.",
    errGeneric: "Could not read the file, please retry.",
    close: "Close",
    note: "Matched by national ID / Iqama only — employees without a match are never modified.",
    unmatchedTitle: "IDs in the file that are not in this organization",
  };

  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [applying, setApplying] = useState(false);
  const [plan, setPlan] = useState(null);
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");

  const reset = () => { setFile(null); setBusy(false); setApplying(false); setPlan(null); setDone(null); setErr(""); };
  const handleClose = () => { reset(); onClose(); };

  const analyze = async () => {
    if (!file) return;
    setBusy(true); setErr(""); setPlan(null); setDone(null);
    try {
      const records = await extractDatesFromFile(file, kind);
      setPlan(planDateUpdates(records, employees, field));
    } catch (e) {
      setErr(e?.message === "no_rows" ? t.errNoRows : t.errGeneric);
    } finally {
      setBusy(false);
    }
  };

  const apply = async () => {
    if (!plan?.updates?.length) return;
    setApplying(true); setErr("");
    try {
      const n = await applyDateUpdates(plan.updates, field);
      setDone(n);
      if (onSaved) onSaved();
    } catch {
      setErr(t.errGeneric);
    } finally {
      setApplying(false);
    }
  };

  const Icon = kind === "contract" ? FileClock : IdCard;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !busy && !applying) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Icon size={18} /> {meta.title}</DialogTitle>
          <DialogDescription>{t.desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-2xl border border-border p-4 space-y-3">
            <Label>{t.pick}</Label>
            <label className="flex items-center justify-center gap-2 cursor-pointer rounded-xl border-2 border-dashed border-border hover:border-violet-400 hover:bg-violet-50/40 transition px-4 py-5">
              <Upload size={18} className="text-violet-600" />
              <span className="text-sm text-muted-foreground truncate">{file ? file.name : t.pick}</span>
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.pdf,.json,.html,.htm,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setPlan(null); setDone(null); setErr(""); }}
              />
            </label>
            <p className="text-[11px] text-muted-foreground">{t.note}</p>

            {err && <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-xl p-3">{err}</div>}

            {done != null && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center gap-2 text-emerald-700 font-medium">
                <BadgeCheck size={18} /> {t.done(done)}
              </div>
            )}

            {plan && done == null && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <Metric label={t.updated} value={plan.updates.length} tone="emerald" />
                  <Metric label={t.same} value={plan.unchanged.length} />
                  <Metric label={t.missing} value={plan.unmatched.length} tone="amber" />
                </div>

                {plan.updates.length > 0 && (
                  <div className="rounded-xl bg-white border border-border overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 text-muted-foreground">
                          <tr>
                            <th className="text-right px-3 py-2 font-medium">{t.colEmp}</th>
                            <th className="text-right px-3 py-2 font-medium">{t.colId}</th>
                            <th className="text-right px-3 py-2 font-medium">{t.colFrom}</th>
                            <th className="text-right px-3 py-2 font-medium">{t.colTo}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {plan.updates.map((u) => (
                            <tr key={u.id}>
                              <td className="px-3 py-1.5 font-medium">{u.name}</td>
                              <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{u.national_id}</td>
                              <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{u.from || "—"}</td>
                              <td className="px-3 py-1.5 tabular-nums font-medium text-emerald-700">{u.to}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {plan.unmatched.length > 0 && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 space-y-1">
                    <div className="flex items-center gap-2 text-amber-700 text-xs font-medium"><AlertTriangle size={14} /> {t.unmatchedTitle} ({plan.unmatched.length})</div>
                    <div className="text-[11px] text-amber-700 tabular-nums break-words">
                      {plan.unmatched.map((u) => u.national_id).join(" · ")}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={handleClose} disabled={busy || applying}>{t.close}</Button>
              {done == null && plan?.updates?.length > 0 ? (
                <Button type="button" onClick={apply} disabled={applying} className="gap-2">
                  {applying ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                  {applying ? t.applying : t.apply(plan.updates.length)}
                </Button>
              ) : done == null ? (
                <Button type="button" onClick={analyze} disabled={!file || busy} className="gap-2 min-w-[150px]">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  {busy ? t.analyzing : t.analyze}
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Metric({ label, value, tone }) {
  const cls = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-foreground";
  return (
    <div className="rounded-lg bg-white border border-border px-3 py-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${cls}`}>{value ?? 0}</div>
    </div>
  );
}