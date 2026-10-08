import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Search, Printer, MessageSquareWarning, Check, X, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { todayISO } from "@/lib/hr";
import PullToRefresh from "@/components/PullToRefresh";
import ComplaintResolutionDoc from "@/components/docs/ComplaintResolutionDoc";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";

const TYPES = {
  ethical: "شكوى أخلاقية", pressure: "ضغط من موظف/مسؤول", sexual_harassment: "شكوى تحرّش",
  discrimination: "شكوى تمييز", safety: "شكوى سلامة مهنية", work_environment: "بيئة عمل", other: "أخرى",
};
const typeLabel = (v, custom) => v === "other" ? (custom || "أخرى") : (TYPES[v] || v || "—");
const stBadge = (s) => {
  const m = {
    pending_manager: { label: "بانتظار المدير", cls: "bg-amber-50 text-amber-600" },
    manager_approved: { label: "بانتظار الموارد البشرية", cls: "bg-blue-50 text-blue-600" },
    resolved: { label: "تم الحل ✅", cls: "bg-emerald-100 text-emerald-700" },
    rejected: { label: "مرفوضة", cls: "bg-rose-50 text-rose-600" },
  };
  return m[s] || { label: s || "—", cls: "bg-slate-100 text-slate-600" };
};

export default function Complaints() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الشكاوى", subtitle: "مسار: المدير المباشر ← الموارد البشرية (حلّ) ← أرشفة المستند بين الأطراف",
    loading: "جارٍ التحميل...", empty: "لا توجد شكاوى", searchPh: "ابحث برقم الهوية...",
    mgrApprove: "إحالة للموارد البشرية", resolve: "تقديم حل وإغلاق", reject: "رفض", print: "طباعة المحضر",
    cancel: "إلغاء", confirmReject: "تأكيد الرفض", rejectTitle: "رفض الشكوى", rejectReason: "سبب الرفض",
    resolveTitle: "حلّ الشكوى — الموارد البشرية", resolution: "الحل المُقدّم", resolveWarn: "عند الحفظ تُغلق الشكوى (تم الحل) ويُؤرشف المحضر بين الموظف والمدير والموارد البشرية.",
    confidential: "سرية", submitted: "تاريخ التقديم",
  } : {
    title: "Complaints", subtitle: "Flow: direct manager ← HR (resolution) ← archived to all parties",
    loading: "Loading...", empty: "No complaints", searchPh: "Search by ID...",
    mgrApprove: "Forward to HR", resolve: "Resolve & close", reject: "Reject", print: "Print record",
    cancel: "Cancel", confirmReject: "Confirm", rejectTitle: "Reject complaint", rejectReason: "Reason",
    resolveTitle: "Resolve complaint — HR", resolution: "Resolution", resolveWarn: "On save the complaint is closed (resolved) and the record is archived.",
    confidential: "Confidential", submitted: "Submitted",
  };

  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [acting, setActing] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [printC, setPrintC] = useState(null);

  const load = async () => {
    setLoading(true);
    const [list, emps, orgs] = await Promise.all([
      base44.entities.Complaint.list("-created_date", 500),
      base44.entities.Employee.list("-created_date", 500),
      listCurrentOrg(),
    ]);
    // جلب النصوص الحسّاسة من الخزنة (الوصف/الحل/الملاحظات) ودمجها للعرض
    const enriched = await enrichRecordsWithVault(list, VAULT_MODULES.complaints, "complaint_ref", ["description", "hr_resolution", "manager_note", "hr_note", "notes"]);
    setItems(enriched); setEmployees(emps); setOrg(orgs[0]);
    try { setMe(await base44.auth.me()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const empOf = (id) => employees.find((e) => e.id === id);
  const myEmployee = employees.find((e) => e.user_id && e.user_id === me?.id) || null;
  const isAdmin = me?.role === "admin";
  const isHR = isAdmin || !!myEmployee?.is_approver_hr;
  // مرحلة المدير المباشر حصراً له — الموارد البشرية/الأدمن لا يتجاوزانها.
  const isManager = !!myEmployee?.is_approver_manager;
  const isManagerOf = (r) => isManager && !!r.manager_id && r.manager_id === myEmployee?.id;

  const query = q.trim();
  const matchedIds = query ? new Set(employees.filter((e) => (e.national_id || "").replace(/\s/g, "").includes(query.replace(/\s/g, ""))).map((e) => e.id)) : null;
  const vis = matchedIds ? items.filter((r) => matchedIds.has(r.employee_id)) : items;

  const managerForward = async (r) => {
    await base44.entities.Complaint.update(r.id, { manager_status: "approved", manager_id: me?.id, manager_name: me?.full_name, manager_date: todayISO(), manager_note: note || "", status: "manager_approved" });
    setNote(""); load();
  };
  const managerReject = async (r) => {
    await base44.entities.Complaint.update(r.id, { manager_status: "rejected", manager_note: note, status: "rejected" });
    setNote(""); load();
  };
  const openResolve = (r) => { setActing({ req: r, action: "resolve" }); setNote(""); };
  const confirmResolve = async () => {
    if (!acting || !note.trim()) return;
    setBusy(true);
    try {
      const r = acting.req;
      await base44.entities.Complaint.update(r.id, {
        hr_status: "resolved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(),
        hr_resolution: note, status: "resolved",
        prepared_by_name: me?.full_name || "", prepared_by_id: myEmployee?.national_id || "",
      });
      const fresh = { ...r, hr_status: "resolved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(), hr_resolution: note, status: "resolved" };
      setPrintC(fresh);
    } catch (e) {}
    setBusy(false); setActing(null); setNote(""); load();
  };
  const openReject = (r) => { setActing({ req: r, action: "reject" }); setNote(""); };
  const confirmReject = async () => {
    if (!acting) return;
    await base44.entities.Complaint.update(acting.req.id, { hr_status: "rejected", hr_resolution: note, status: "rejected" });
    setActing(null); setNote(""); load();
  };
  const printRec = (r) => { setPrintC(r); setTimeout(() => window.print(), 200); };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : (
        <PullToRefresh onRefresh={load}>
        <>
          <div className="relative mb-4">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.searchPh} className="pr-9 max-w-md" />
          </div>

          <div className="space-y-3">
            {vis.length === 0 ? (
              <div className="p-14 text-center bg-white rounded-2xl border border-border">
                <MessageSquareWarning size={40} className="mx-auto text-slate-300 mb-3" />
                <p className="text-muted-foreground">{t.empty}</p>
              </div>
            ) : vis.map((r) => {
              const emp = empOf(r.employee_id);
              const actions = [];
              if (r.status === "pending_manager" && isManagerOf(r)) {
                actions.push({ label: t.mgrApprove, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => { setActing({ req: r, action: "mforward" }); setNote(""); } });
                actions.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => { setActing({ req: r, action: "mreject" }); setNote(""); } });
              } else if (r.status === "manager_approved" && isHR) {
                actions.push({ label: t.resolve, cls: "bg-violet-600 hover:bg-violet-700", onClick: () => openResolve(r) });
                actions.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject(r) });
              }
              if (r.status === "resolved") actions.push({ label: t.print, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", onClick: () => printRec(r) });
              return (
                <div key={r.id} className="bg-white rounded-2xl border border-border p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-medium text-sm">{emp?.full_name || r.employee_name}</div>
                        <span className="text-xs text-muted-foreground tabular-nums">{emp?.national_id || "—"}</span>
                        {r.is_confidential && <span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 inline-flex items-center gap-1"><ShieldAlert size={11} /> {t.confidential}</span>}
                      </div>
                      <div className="text-xs text-violet-700 mt-1 font-medium">{typeLabel(r.complaint_type, r.custom_type)}</div>
                      <div className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.description}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{t.submitted}: <b className="text-foreground tabular-nums">{r.submitted_date || (r.created_date || "").slice(0, 10) || "—"}</b></div>
                      {r.manager_note && <div className="text-[11px] text-muted-foreground mt-1">ملاحظة المدير: {r.manager_note}</div>}
                      {r.hr_resolution && <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-1.5"><b>الحل:</b> {r.hr_resolution} {r.hr_name ? `— ${r.hr_name} · ${r.hr_date || ""}` : ""}</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                      <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", stBadge(r.status).cls)}>{stBadge(r.status).label}</span>
                      {actions.map((a, i) => <Button key={i} size="sm" onClick={a.onClick} className={cn("h-8 text-xs", a.cls)}>{a.label}</Button>)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
        </PullToRefresh>
      )}

      {/* حلّ الشكوى — الموارد البشرية */}
      <Dialog open={acting?.action === "resolve"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t.resolveTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name} · {typeLabel(acting.req.complaint_type, acting.req.custom_type)}</div>
              <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-3 whitespace-pre-wrap">{acting.req.description}</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.resolution} <span className="text-rose-500">*</span></Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={14} required
                  placeholder={isAr ? "اكتب ما تم التوصل إليه: نتائج الفحص، التوصيات، الإجراءات التصحيحية، النصائح والمخرجات..." : "Findings, recommendations, corrective actions, outcomes..."} />
              </div>
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3">{t.resolveWarn}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmResolve} disabled={busy || !note.trim()} className="gap-1 bg-violet-600 hover:bg-violet-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.resolve}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* إحالة المدير */}
      <Dialog open={acting?.action === "mforward"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.mgrApprove}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-3">
              <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
              <Label className="text-xs font-medium text-muted-foreground">ملاحظة المدير</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)}>{t.cancel}</Button>
                <Button onClick={() => managerForward(acting.req)} className="gap-1 bg-emerald-600 hover:bg-emerald-700"><Check size={16} /> {t.mgrApprove}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* رفض */}
      <Dialog open={acting?.action === "reject" || acting?.action === "mreject"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-3">
              <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
              <Label className="text-xs font-medium text-muted-foreground">{t.rejectReason}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)}>{t.cancel}</Button>
                <Button variant="destructive" onClick={acting.action === "mreject" ? () => managerReject(acting.req) : confirmReject} className="gap-1"><X size={16} /> {t.confirmReject}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {printC && (
        <div className="print-mount">
          <ComplaintResolutionDoc complaint={printC} org={org} employee={empOf(printC.employee_id)} isAr={isAr} />
        </div>
      )}
    </div>
  );
}