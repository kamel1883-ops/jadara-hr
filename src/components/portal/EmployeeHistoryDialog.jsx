import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { leaveTypeLabel, formatCurrency } from "@/lib/hr";
import { StoredDocButton } from "@/components/VaultDocLink";
import { warmRecords } from "@/lib/vaultGeneric";
import { VAULT_MODULES } from "@/lib/vaultGeneric";

/**
 * سجل طلبات الموظف الكامل — يُفتح عند الضغط على اسم الموظف في أي طلب.
 * يعرض الاسم ورقم الهوية، وكل طلباته السابقة (إجازات، سلف، انتدابات، نهاية خدمة،
 * طلبات إدارية/نماذج، عهد) بحالتها وتفاصيلها ومستنداتها المرفقة.
 */
const STATUS = {
  ar: {
    draft: ["مسودة", "bg-slate-100 text-slate-600"],
    pending: ["بانتظار المراجعة", "bg-amber-50 text-amber-700"],
    pending_manager: ["بانتظار المدير", "bg-amber-50 text-amber-700"],
    pending_hr: ["بانتظار الموارد البشرية", "bg-amber-50 text-amber-700"],
    manager_approved: ["بانتظار الموارد البشرية", "bg-blue-50 text-blue-700"],
    hr_approved: ["معتمد من الموارد البشرية", "bg-blue-50 text-blue-700"],
    hr_settled: ["مخالصة جاهزة", "bg-blue-50 text-blue-700"],
    awaiting_finance: ["بانتظار المالية", "bg-violet-50 text-violet-700"],
    paid: ["مصروف ✅", "bg-emerald-100 text-emerald-700"],
    approved: ["معتمد ✅", "bg-emerald-100 text-emerald-700"],
    completed: ["مكتمل ✅", "bg-emerald-100 text-emerald-700"],
    settled: ["مكتمل ✅", "bg-emerald-100 text-emerald-700"],
    in_progress: ["جارٍ", "bg-sky-50 text-sky-700"],
    rejected: ["مرفوض", "bg-rose-50 text-rose-600"],
    cancelled: ["ملغى", "bg-slate-100 text-slate-600"],
  },
  en: {
    draft: ["Draft", "bg-slate-100 text-slate-600"],
    pending: ["Pending", "bg-amber-50 text-amber-700"],
    pending_manager: ["Awaiting manager", "bg-amber-50 text-amber-700"],
    pending_hr: ["Awaiting HR", "bg-amber-50 text-amber-700"],
    manager_approved: ["Awaiting HR", "bg-blue-50 text-blue-700"],
    hr_approved: ["HR approved", "bg-blue-50 text-blue-700"],
    hr_settled: ["Settlement ready", "bg-blue-50 text-blue-700"],
    awaiting_finance: ["Awaiting finance", "bg-violet-50 text-violet-700"],
    paid: ["Paid ✅", "bg-emerald-100 text-emerald-700"],
    approved: ["Approved ✅", "bg-emerald-100 text-emerald-700"],
    completed: ["Completed ✅", "bg-emerald-100 text-emerald-700"],
    settled: ["Completed ✅", "bg-emerald-100 text-emerald-700"],
    in_progress: ["In progress", "bg-sky-50 text-sky-700"],
    rejected: ["Rejected", "bg-rose-50 text-rose-600"],
    cancelled: ["Cancelled", "bg-slate-100 text-slate-600"],
  },
};

const DOC_LABELS = {
  medical_report_url: ["تقرير طبي", "Medical report"],
  hr_document_url: ["مستند الموارد البشرية", "HR document"],
  settlement_pdf_url: ["المخالصة", "Settlement"],
  finance_proof_url: ["إثبات التحويل", "Transfer proof"],
  statement_pdf_url: ["كشف السلفة", "Loan statement"],
  employee_document_url: ["مرفق الموظف", "Employee attachment"],
  approval_pdf_url: ["موافقة الانتداب", "Trip approval"],
  attachment_ref: ["مرفق الطلب", "Request attachment"],
  hr_document_ref: ["مستند الطلب المعتمد", "Approved document"],
};

const docList = (row) =>
  Object.keys(DOC_LABELS)
    .map((k) => ({ key: k, value: row?.[k] }))
    .filter((d) => d.value);

const dateOf = (row) =>
  row?.request_date || row?.start_date || row?.submitted_date || row?.generated_date || row?.last_working_date ||
  (row?.created_date || "").slice(0, 10) || "";

export default function EmployeeHistoryDialog({ open, onOpenChange, employee, portalSession = null, isAr = true }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setFilter("all");
    (async () => {
      try {
        const payload = {
          target_employee_id: employee?.id || "",
          target_national_id: employee?.national_id || "",
        };
        if (portalSession?.token && portalSession?.employee_id) {
          payload.portal_token = portalSession.token;
          payload.portal_employee_id = portalSession.employee_id;
        }
        const res = await base44.functions.invoke("employeeRequestHistory", payload);
        const out = res?.data || res;
        if (cancelled) return;
        if (!out?.ok) {
          setError(
            out?.error === "forbidden"
              ? (isAr ? "لا تملك صلاحية عرض سجل هذا الموظف." : "You are not allowed to view this employee's history.")
              : out?.error === "no_company"
                ? (isAr ? "تعذّر تحديد منشأة الحساب." : "Could not determine the account's company.")
                : (isAr ? "تعذّر تحميل السجل." : "Could not load the history.")
          );
          setData(null);
          return;
        }
        // الطلبات الإدارية (نماذج) تُحفظ في الخزنة — نملأ وصفها وعنوانها من هناك.
        const hr = Array.isArray(out?.requests?.hrRequests) ? out.requests.hrRequests : [];
        if (hr.length) {
          try {
            await warmRecords(hr, VAULT_MODULES.hrRequests, "vault_ref", ["request_title", "description", "reason", "hr_note"]);
          } catch { /* يبقى ما في السجل */ }
        }
        setData(out);
      } catch (e) {
        if (cancelled) return;
        const d = e?.response?.data || {};
        setError(
          d?.error === "forbidden"
            ? (isAr ? "لا تملك صلاحية عرض سجل هذا الموظف." : "You are not allowed to view this employee's history.")
            : d?.error === "invalid_session"
              ? (isAr ? "انتهت الجلسة — أعد الدخول." : "Session expired — sign in again.")
              : (isAr ? "تعذّر تحميل السجل." : "Could not load the history.")
        );
        setData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, employee?.id, employee?.national_id, portalSession?.token, isAr]);

  const emp = data?.employee || employee || {};

  const rows = useMemo(() => {
    const r = data?.requests || {};
    const list = [];
    const push = (kind, items, mapper) => {
      for (const it of items || []) list.push({ kind, row: it, ...mapper(it) });
    };
    push("leave", r.leaves, (x) => ({
      title: leaveTypeLabel(x.leave_type, isAr ? "ar" : "en") || (isAr ? "إجازة" : "Leave"),
      date: dateOf(x),
      lines: [
        [isAr ? "من" : "From", x.start_date],
        [isAr ? "إلى" : "To", x.end_date],
        [isAr ? "عدد الأيام" : "Days", x.days_count],
        [isAr ? "السبب" : "Reason", x.reason],
        [isAr ? "قرار المدير" : "Manager", [x.manager_name, x.manager_date].filter(Boolean).join(" · ")],
        [isAr ? "قرار الموارد البشرية" : "HR", [x.hr_name, x.hr_date, x.hr_note].filter(Boolean).join(" · ")],
        [isAr ? "المالية" : "Finance", [x.finance_name, x.finance_paid_date, x.finance_note].filter(Boolean).join(" · ")],
      ],
    }));
    push("loan", r.loans, (x) => ({
      title: isAr ? "سلفة" : "Loan",
      date: dateOf(x),
      lines: [
        [isAr ? "المبلغ المعتمد" : "Approved amount", x.amount ? formatCurrency(x.amount) : ""],
        [isAr ? "المبلغ المطلوب" : "Requested", x.requested_amount ? formatCurrency(x.requested_amount) : ""],
        [isAr ? "الأقساط" : "Installments", x.installment_count ? `${x.installment_count} × ${formatCurrency(x.monthly_installment)}` : ""],
        [isAr ? "المسدد" : "Paid", x.paid_amount ? formatCurrency(x.paid_amount) : ""],
        [isAr ? "السبب" : "Reason", x.reason],
        [isAr ? "قرار الموارد البشرية" : "HR", [x.hr_name, x.hr_date, x.hr_note].filter(Boolean).join(" · ")],
        [isAr ? "المالية" : "Finance", [x.finance_name, x.finance_paid_date, x.finance_note].filter(Boolean).join(" · ")],
      ],
    }));
    push("trip", r.trips, (x) => ({
      title: x.trip_type === "external" ? (isAr ? "انتداب خارجي" : "External trip") : (isAr ? "انتداب داخلي" : "Internal trip"),
      date: dateOf(x),
      lines: [
        [isAr ? "الوجهة" : "Destination", x.destination],
        [isAr ? "من" : "From", x.start_date],
        [isAr ? "إلى" : "To", x.end_date],
        [isAr ? "عدد الأيام" : "Days", x.days_count],
        [isAr ? "الغرض" : "Purpose", x.purpose],
        [isAr ? "العهدة/السلفة" : "Advance", x.advance_amount ? formatCurrency(x.advance_amount) : ""],
        [isAr ? "الاعتماد" : "Approval", [x.approver_name, x.approved_date].filter(Boolean).join(" · ")],
      ],
    }));
    push("eos", r.eos, (x) => ({
      title: isAr ? "نهاية الخدمة / مخالصة" : "End of service",
      date: dateOf(x),
      lines: [
        [isAr ? "آخر يوم عمل" : "Last working day", x.last_working_date],
        [isAr ? "مبلغ نهاية الخدمة" : "EOS amount", x.eos_amount ? formatCurrency(x.eos_amount) : ""],
        [isAr ? "التذكرة" : "Ticket", x.ticket_amount ? formatCurrency(x.ticket_amount) : ""],
        [isAr ? "رصيد الإجازات" : "Leave balance", x.leave_balance_days],
        [isAr ? "السبب" : "Reason", x.reason],
        [isAr ? "الخصم" : "Deduction", x.deduction_amount ? `${formatCurrency(x.deduction_amount)} ${x.deduction_note || ""}` : ""],
        [isAr ? "الموارد البشرية" : "HR", [x.hr_name, x.hr_date, x.hr_note].filter(Boolean).join(" · ")],
        [isAr ? "المالية" : "Finance", [x.finance_name, x.finance_paid_date].filter(Boolean).join(" · ")],
      ],
    }));
    push("hr", r.hrRequests, (x) => ({
      title: x.request_title || (isAr ? "طلب إداري" : "HR request"),
      date: dateOf(x),
      lines: [
        [isAr ? "الوصف" : "Description", x.description],
        [isAr ? "السبب" : "Reason", x.reason],
        [isAr ? "قرار الموارد البشرية" : "HR", [x.hr_name, x.hr_date, x.hr_note].filter(Boolean).join(" · ")],
      ],
    }));
    push("equipment", r.equipment, (x) => ({
      title: isAr ? "طلب عهدة" : "Equipment request",
      date: dateOf(x),
      lines: [
        [isAr ? "العهدة" : "Item", x.item_label || x.custom_type || x.item_type],
        [isAr ? "السبب" : "Reason", x.reason],
      ],
    }));
    return list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  }, [data, isAr]);

  const counts = useMemo(() => {
    const c = { all: rows.length };
    for (const r of rows) c[r.kind] = (c[r.kind] || 0) + 1;
    return c;
  }, [rows]);

  const visible = filter === "all" ? rows : rows.filter((r) => r.kind === filter);
  const statusMap = isAr ? STATUS.ar : STATUS.en;
  const TABS = [
    ["all", isAr ? "الكل" : "All"],
    ["leave", isAr ? "إجازات" : "Leaves"],
    ["loan", isAr ? "سلف" : "Loans"],
    ["trip", isAr ? "انتدابات" : "Trips"],
    ["eos", isAr ? "نهاية الخدمة" : "EOS"],
    ["hr", isAr ? "طلبات إدارية" : "HR requests"],
    ["equipment", isAr ? "عهد" : "Equipment"],
  ].filter(([k]) => k === "all" || counts[k]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[88vh] overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <UserRound size={18} /> {isAr ? "سجل طلبات الموظف" : "Employee request history"}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <div className="font-semibold text-sm">{emp.full_name || emp.name || "—"}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="tabular-nums" dir="ltr">{isAr ? "الهوية" : "ID"}: {emp.national_id || "—"}</span>
            {emp.employee_number && <span>{isAr ? "الرقم الوظيفي" : "Employee no."}: {emp.employee_number}</span>}
            {emp.department && <span>{emp.department}</span>}
            {emp.position && <span>{emp.position}</span>}
          </div>
        </div>

        {!loading && !error && rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {TABS.map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setFilter(k)}
                className={cn(
                  "text-xs px-2.5 py-1 rounded-full border transition",
                  filter === k ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-600 border-border hover:bg-muted"
                )}
              >
                {label} {counts[k] ? <span className="tabular-nums opacity-70">({counts[k]})</span> : null}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> {isAr ? "جارٍ تحميل السجل..." : "Loading history..."}
          </div>
        ) : error ? (
          <div className="py-8 text-center text-sm text-rose-600">{error}</div>
        ) : rows.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">{isAr ? "لا توجد طلبات سابقة لهذا الموظف." : "No previous requests for this employee."}</div>
        ) : (
          <div className="space-y-3">
            {visible.map(({ kind, row, title, date, lines }) => {
              const st = statusMap[row.status] || [row.status || "—", "bg-slate-100 text-slate-600"];
              const docs = docList(row);
              const real = lines.filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
              return (
                <div key={`${kind}-${row.id}`} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{title}</div>
                      <div className="text-xs text-muted-foreground tabular-nums">{date || "—"}</div>
                    </div>
                    <span className={cn("text-[11px] px-2.5 py-1 rounded-full font-medium whitespace-nowrap", st[1])}>{st[0]}</span>
                  </div>
                  {real.length > 0 && (
                    <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {real.map(([label, value], i) => (
                        <div key={i} className="whitespace-pre-wrap">
                          <span className="text-slate-500">{label}:</span>{" "}
                          <span className="text-foreground">{[String(value)].join("")}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {docs.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {docs.map((d) => (
                        <StoredDocButton
                          key={d.key}
                          value={d.value}
                          isAr={isAr}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-medium bg-white border border-border text-slate-700 hover:bg-muted"
                        >
                          <FileText size={12} /> {(DOC_LABELS[d.key] || [d.key])[isAr ? 0 : 1]}
                        </StoredDocButton>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange?.(false)}>{isAr ? "إغلاق" : "Close"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
