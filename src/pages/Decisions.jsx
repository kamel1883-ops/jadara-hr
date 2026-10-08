import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import DecisionFormDialog from "@/components/decisions/DecisionFormDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollText, Plus, Eye, Trash2, Archive, Printer } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TYPE_LABEL = {
  ar: { appointment: "تعيين", transfer: "نقل", promotion: "ترقية", assignment: "تكليف", secondment: "إعارة", exemption: "إعفاء", reward: "مكافأة", deduction: "خصم", warning: "إنذار", termination: "إنهاء", policy: "سياسة", other: "قرار" },
  en: { appointment: "Appointment", transfer: "Transfer", promotion: "Promotion", assignment: "Assignment", secondment: "Secondment", exemption: "Exemption", reward: "Reward", deduction: "Deduction", warning: "Warning", termination: "Termination", policy: "Policy", other: "Decision" },
};

function trOf(rec) {
  try { return JSON.parse(rec.i18n || "{}"); } catch { return {}; }
}
function localized(rec, lang) {
  const tr = trOf(rec);
  return { title: tr?.title?.[lang] || rec.title || "", body: tr?.body?.[lang] || rec.body || "" };
}

export default function Decisions() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "القرارات الإدارية", sub: "إصدار القرارات وإرسالها لبوابة الموظف (7 لغات) — محفوظة بتاريخها وصيغتها للرجوع مستقبلاً.",
    issue: "إصدار قرار جديد", empty: "لا توجد قرارات بعد", num: "الرقم", type: "النوع", titleL: "العنوان", target: "النطاق", issued: "الإصدار", effective: "النفاذ", status: "الحالة", by: "أصدره", actions: "إجراءات",
    view: "عرض الصيغة", del: "حذف", archive: "أرشفة", print: "طباعة", confirmDel: "حذف هذا القرار نهائياً؟",
    targetAll: "الجميع", targetDept: "قسم", targetEmp: "موظف", langAr: "العربية",
    issued2: "صدر", effL: "ينفذ", revoked: "مؤرشف", active: "ساري",
  } : {
    title: "Administrative Decisions", sub: "Issue decisions and publish them to the employee portal (7 languages) — preserved with date and wording for future reference.",
    issue: "New decision", empty: "No decisions yet", num: "Number", type: "Type", titleL: "Title", target: "Scope", issued: "Issued", effective: "Effective", status: "Status", by: "By", actions: "Actions",
    view: "View wording", del: "Delete", archive: "Archive", print: "Print", confirmDel: "Delete this decision permanently?",
    targetAll: "All", targetDept: "Department", targetEmp: "Employee", langAr: "Arabic",
    issued2: "Issued", effL: "Effective", revoked: "Archived", active: "Active",
  };

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(null);
  const [org, setOrg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, emps, orgs] = await Promise.all([
        base44.entities.AdminDecision.list("-issued_date", 500),
        base44.entities.Employee.list("-created_date", 2000),
        listCurrentOrg(),
      ]);
      setRows(list || []);
      setEmployees(emps || []);
      setOrg(orgs?.[0] || null);
      const depts = Array.from(new Set((emps || []).map((e) => e.department).filter(Boolean))).sort();
      setDepartments(depts);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (r) => {
    if (!window.confirm(t.confirmDel)) return;
    await base44.entities.AdminDecision.delete(r.id);
    load();
  };
  const archive = async (r) => {
    await base44.entities.AdminDecision.update(r.id, { status: "archived" });
    load();
  };

  const printDecision = (r) => {
    const lc = localized(r, isAr ? "ar" : "en");
    const typeLabel = (TYPE_LABEL[isAr ? "ar" : "en"])[r.decision_type] || r.decision_type;
    const targetLabel = r.target === "all" ? t.targetAll : r.target === "department" ? `${t.targetDept}: ${r.department}` : `${t.targetEmp}: ${r.employee_name}`;
    const orgName = org?.name || (isAr ? "جداره" : "Jadara");
    const orgLogo = org?.logo_url || "";
    const orgUnified = org?.unified_number || "";
    const docTitle = isAr ? "قرار إداري" : "Administrative Decision";
    const esc = (s) => String(s || "").replace(/</g, "<").replace(/>/g, ">");
    const crown = `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c5a059" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m2 4 3 12h14l3-12-6.5 6L12 4l-3.5 6L2 4Z"/><path d="M5 20h14"/></svg>`;
    const html = `<!DOCTYPE html><html dir="${isAr ? "rtl" : "ltr"}" lang="${isAr ? "ar" : "en"}"><head><meta charset="utf-8"><title>${(lc.title || r.title || "").replace(/"/g, "")}</title><style>
      @page{size:A4;margin:18mm;}
      body{font-family:'Tajawal','IBM Plex Sans Arabic',Arial,sans-serif;color:#0f172a;margin:0;}
      .doc{max-width:780px;margin:0 auto;padding:8px 0;}
      .head{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0b1120;padding-bottom:12px;margin-bottom:18px;}
      .org{display:flex;flex-direction:column;align-items:${isAr ? "flex-end" : "flex-start"};max-width:240px;}
      .org img{max-width:150px;max-height:64px;object-fit:contain;}
      .org-name{font-size:13px;font-weight:700;color:#0b1120;margin-top:6px;text-align:${isAr ? "right" : "left"};}
      .org-un{font-size:10px;color:#666;}
      .brand{display:flex;align-items:center;gap:10px;}
      .brand-badge{width:44px;height:44px;border-radius:14px;background:#2d234a;box-shadow:0 0 0 1px rgba(197,160,89,.35);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
      .brand-name{font-size:15px;font-weight:800;color:#1a1a2e;}
      .brand-sub{font-size:10px;color:#1a1a2e;opacity:.75;margin-top:1px;}
      .h1{font-size:20px;font-weight:800;margin:14px 0 2px;text-align:center;}
      .meta{font-size:11px;color:#64748b;text-align:center;}
      .chips{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0 20px;justify-content:center;}
      .chip{font-size:11px;padding:5px 12px;border-radius:9999px;background:#f5f3ff;border:1px solid #e9d8fd;color:#4c1d95;}
      .num{font-family:monospace;background:#fffbeb;border-color:#fde68a;color:#92400e;}
      .body-title{font-size:17px;font-weight:800;margin:10px 0 12px;color:#0f172a;text-align:center;}
      .body{font-size:14px;line-height:2;white-space:pre-wrap;text-align:justify;}
      .foot{margin-top:34px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:10px;color:#94a3b8;text-align:center;}
      @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
    </style></head><body><div class="doc">
      <div class="head">
        <div class="org">
          ${orgLogo ? `<img src="${orgLogo}" alt="logo" />` : ""}
          <div class="org-name">${esc(orgName)}</div>
          ${orgUnified ? `<div class="org-un">${isAr ? "الرقم الموحد: " : "Unified No: "}${esc(orgUnified)}</div>` : ""}
        </div>
        <div class="brand">
          <div class="brand-badge">${crown}</div>
          <div>
            <div class="brand-name">${isAr ? "جداره" : "Jadara"}</div>
            <div class="brand-sub">${isAr ? "لإدارة الموارد البشرية" : "HR Platform"}</div>
          </div>
        </div>
      </div>
      <div class="h1">${docTitle}</div>
      <div class="meta">${t.num}: ${r.decision_number || ""}</div>
      <div class="chips">
        <span class="chip num">${r.decision_number || ""}</span>
        <span class="chip">${typeLabel}</span>
        <span class="chip">${t.target}: ${targetLabel}</span>
        <span class="chip">${t.issued2}: ${r.issued_date || "—"}</span>
        ${r.effective_date ? `<span class="chip">${t.effL}: ${r.effective_date}</span>` : ""}
        ${r.created_by_name ? `<span class="chip">${t.by}: ${r.created_by_name}</span>` : ""}
      </div>
      <div class="body-title">${(lc.title || r.title || "").replace(/</g,"<")}</div>
      <div class="body">${(lc.body || r.body || "").replace(/</g,"<")}</div>
      <div class="foot">${isAr ? "تم إنشاء هذا المستند عبر نظام جداره للموارد البشرية" : "Generated by Jadara HR System"}</div>
    </div></body></html>`;
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch (e) {} }, 400);
  };

  return (
    <div>
      <PageHeader title={t.title} subtitle={t.sub} action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus size={18} /> {t.issue}</Button>} />
      <div className="rounded-2xl border border-border bg-white overflow-hidden">
        {loading ? <div className="p-10 text-center text-muted-foreground text-sm">…</div> : rows.length === 0 ? (
          <div className="p-10 text-center text-muted-foreground flex flex-col items-center gap-2"><ScrollText size={28} className="opacity-40" /> {t.empty}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-muted-foreground border-b border-border">
                <th className="text-right font-medium px-4 py-3">{t.num}</th>
                <th className="text-right font-medium px-4 py-3">{t.type}</th>
                <th className="text-right font-medium px-4 py-3">{t.titleL}</th>
                <th className="text-right font-medium px-4 py-3">{t.target}</th>
                <th className="text-right font-medium px-4 py-3">{t.issued}</th>
                <th className="text-right font-medium px-4 py-3">{t.status}</th>
                <th className="text-right font-medium px-4 py-3">{t.actions}</th>
              </tr></thead>
              <tbody>
                {rows.map((r) => {
                  const typeLabel = (TYPE_LABEL[isAr ? "ar" : "en"])[r.decision_type] || r.decision_type;
                  const targetLabel = r.target === "all" ? t.targetAll : r.target === "department" ? `${t.targetDept}: ${r.department}` : `${t.targetEmp}: ${r.employee_name}`;
                  const statusCls = r.status === "archived" ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-600";
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs">{r.decision_number}</td>
                      <td className="px-4 py-3">{typeLabel}</td>
                      <td className="px-4 py-3 max-w-xs truncate">{localized(r, isAr ? "ar" : "en").title || r.title}</td>
                      <td className="px-4 py-3 text-xs">{targetLabel}</td>
                      <td className="px-4 py-3 text-xs" dir="ltr">{r.issued_date || "—"}</td>
                      <td className="px-4 py-3"><span className={cn("text-xs px-2 py-0.5 rounded-full", statusCls)}>{r.status === "archived" ? t.revoked : t.active}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => setView(r)} className="p-1.5 rounded-md hover:bg-violet-50 text-violet-600" title={t.view}><Eye size={15} /></button>
                          <button onClick={() => printDecision(r)} className="p-1.5 rounded-md hover:bg-violet-50 text-violet-600" title={t.print}><Printer size={15} /></button>
                          {r.status !== "archived" && <button onClick={() => archive(r)} className="p-1.5 rounded-md hover:bg-slate-100 text-slate-500" title={t.archive}><Archive size={15} /></button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <DecisionFormDialog open={open} onClose={() => setOpen(false)} onSaved={load} employees={employees} departments={departments} />

      <Dialog open={!!view} onOpenChange={() => setView(null)}>
        <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{localized(view || {}, isAr ? "ar" : "en").title || view?.title}</DialogTitle></DialogHeader>
          {view && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 font-mono">{view.decision_number}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{(TYPE_LABEL[isAr ? "ar" : "en"])[view.decision_type]}</span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{t.issued2}: {view.issued_date}</span>
                {view.effective_date && <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{t.effL}: {view.effective_date}</span>}
                {view.created_by_name && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{t.by}: {view.created_by_name}</span>}
              </div>
              <div className="rounded-xl border border-border bg-muted/30 p-5">
                <div className="text-xs text-muted-foreground mb-2">{t.langAr}</div>
                <div className="font-semibold text-base mb-2">{view.title}</div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{view.body}</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {["en","hi","ne","bn","fil","ur"].map((l) => {
                  const lc = localized(view, l);
                  return (
                    <div key={l} className="rounded-lg border border-border/70 bg-white p-3">
                      <div className="text-[11px] text-muted-foreground mb-1 uppercase">{l}</div>
                      <div className="text-sm font-medium mb-1">{lc.title}</div>
                      <div className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">{lc.body}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}