import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ClipboardCheck, Check, X, Loader2, Download, Plane, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { leaveTypeLabel, formatCurrency } from "@/lib/hr";
import { badge } from "@/lib/approvals";
import { usePortalI18n, usePortalT, portalDir } from "@/lib/portalI18n";
import ManagerAttendanceSection from "@/components/portal/ManagerAttendanceSection";
import SettlementSheet from "@/components/SettlementSheet";
import { StoredDocButton } from "@/components/VaultDocLink";

export default function ApprovalsPortal({ portalSession }) {
  const { lang } = usePortalI18n();
  const t = usePortalT("approvals");
  const isAr = lang === "ar";

  const [me, setMe] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [histSearch, setHistSearch] = useState("");
  const [finHistSearch, setFinHistSearch] = useState("");
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    const after = () => setPrinting(null);
    window.addEventListener("afterprint", after);
    return () => window.removeEventListener("afterprint", after);
  }, []);

  const printSet = (rec) => {
    setPrinting(rec);
    let done = false;
    const run = () => { if (done) return; done = true; window.print(); };
    requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(run, 60)));
  };

  const portalArgs = portalSession
    ? { portal_token: portalSession.token, portal_employee_id: portalSession.employee_id }
    : {};

  const load = async () => {
    setLoading(true);
    try {
      if (!portalSession) {
        const m = await base44.auth.me();
        setMe(m);
      } else {
        setMe(portalSession.employee);
      }
      const res = await base44.functions.invoke("approvalQueue", portalArgs);
      setData(res.data);
    } catch (e) {
      setData({ error: e.message });
    }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const role = data?.role;

  const call = async (payload) => {
    await base44.functions.invoke("approvalAction", { ...payload, ...portalArgs });
    setActing(null); setNote(""); setProofFile(null);
    await load();
  };

  const openReject = (type, r) => { setActing({ type, req: r, action: "reject" }); setNote(""); };
  const confirmReject = async () => {
    if (!acting) return;
    setBusy(true);
    try { await call({ type: acting.type, action: "reject", id: acting.req.id, note }); }
    finally { setBusy(false); }
  };

  const openFinance = (type, r) => { setActing({ type, req: r, action: "confirm" }); setNote(""); setProofFile(null); };
  const confirmFinance = async () => {
    if (!acting) return;
    setBusy(true);
    let url = "";
    if (proofFile) { const up = await base44.integrations.Core.UploadFile({ file: proofFile }); url = up.file_url; }
    try { await call({ type: acting.type, action: "confirm", id: acting.req.id, note, proof_url: url }); }
    finally { setBusy(false); }
  };

  const managerApprove = async (type, r) => {
    setBusy(r.id);
    try { await call({ type, action: "approve", id: r.id }); }
    finally { setBusy(false); }
  };

  const Card = ({ r, children, actions, kindBadge }) => (
    <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <div className="font-medium text-sm">{r.employee_name || "—"}</div>
              {r.national_id && <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{r.national_id}</div>}
            </div>
            {kindBadge || (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {r.leave_type ? leaveTypeLabel(r.leave_type) : t.loan}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {r.start_date ? t.days(r.start_date, r.end_date, r.days_count) : t.loanLine(r.amount, r.reason)}
          </div>
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", badge(r.status).cls)}>{badge(r.status).label}</span>
            {children}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {actions.map((a, i) => a.doc ? (
            <StoredDocButton key={i} value={a.doc} className={cn("inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium", a.cls)}>
              <Download size={14} /> {a.label}
            </StoredDocButton>
          ) : (
            <Button key={i} size="sm" onClick={a.onClick} disabled={a.busyKey ? busy === a.busyKey : busy}
              className={cn("h-8 text-xs gap-1", a.cls)}>
              {a.busyKey && busy === a.busyKey ? <Loader2 size={14} className="animate-spin" /> : null}
              {a.label}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );

  const Empty = () => (
    <div className="p-14 text-center bg-white/40 backdrop-blur-md rounded-2xl border border-white/60">
      <ClipboardCheck size={40} className="mx-auto text-slate-300 mb-3" />
      <p className="text-muted-foreground">{t.empty}</p>
    </div>
  );

  if (loading) return <div className="p-10 text-center text-muted-foreground animate-fade-in">{t.loading}</div>;
  if (!role || (role !== "manager" && role !== "finance"))
    return <div className="p-10 text-center text-muted-foreground">{t.noLink}</div>;

  // ===== المدير المباشر =====
  if (role === "manager") {
    const leaves = data?.leaves || [];
    const loans = data?.loans || [];
    const trips = data?.trips || [];
    const equipment = data?.equipment || [];
    const complaints = data?.complaints || [];
    const total = leaves.length + loans.length + trips.length + equipment.length + complaints.length;
    return (
      <div dir={portalDir(lang)} className="animate-fade-in">
        <PageHeader title={t.mTitle} subtitle={t.mSub} />
        {data?.message && <div className="mb-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{data.message}</div>}
        {data?.subordinates?.length > 0 && <div className="mb-3 text-xs text-muted-foreground">{t.subInfo(data.subordinates.length)}</div>}
        {total === 0 && <Empty />}
        {leaves.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground mt-5 mb-2">{isAr ? "الإجازات والاستئذان" : "Leaves & permissions"}</h3>}
        <div className="space-y-3">
          {leaves.map((r) => (
            <Card key={r.id} r={r}
              actions={[
                { label: t.approve, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove("leaves", r), busyKey: r.id },
                { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("leaves", r) },
              ]}>
              {r.leave_type === "permission" && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                  {isAr ? `استئذان · ${Math.floor((r.permission_minutes||0)/60)}س ${(r.permission_minutes||0)%60}د` : `Permission · ${Math.floor((r.permission_minutes||0)/60)}h ${(r.permission_minutes||0)%60}m`}
                </span>
              )}
              {r.leave_type === "annual" && (
                <span className={cn("text-xs px-2 py-0.5 rounded-full", r.annual_leave_mode === "encash_continue" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700")}>
                  {isAr ? (r.annual_leave_mode === "encash_continue" ? "تصفية مع مواصلة العمل" : "إجازة سفر فعلي") : (r.annual_leave_mode === "encash_continue" ? "Encash & continue" : "Travel leave")}
                </span>
              )}
              {r.is_full_clearance && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{t.fullClear}</span>}
              {r.reason && <span className="text-xs text-muted-foreground">{r.reason}</span>}
            </Card>
          ))}
        </div>
        {loans.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground mt-5 mb-2">{isAr ? "طلبات السلف" : "Loans"}</h3>}
        <div className="space-y-3">
          {loans.map((r) => (
            <Card key={r.id} r={r}
              kindBadge={<span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{t.loan}</span>}
              actions={[
                { label: t.approve, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove("loans", r), busyKey: r.id },
                { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("loans", r) },
              ]}>
              <span className="text-xs text-muted-foreground">{formatCurrency(r.amount)}</span>
              {r.reason && <span className="text-xs text-muted-foreground">· {r.reason}</span>}
            </Card>
          ))}
        </div>
        {trips.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground mt-5 mb-2">{isAr ? "طلبات الانتداب" : "Business trips"}</h3>}
        <div className="space-y-3">
          {trips.map((r) => (
            <Card key={r.id} r={r}
              kindBadge={<span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 flex items-center gap-1"><Plane size={11} /> {r.trip_type === "external" ? t.tripExt : t.tripInt}</span>}
              actions={[
                { label: t.approve, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove("trips", r), busyKey: r.id },
                { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("trips", r) },
              ]}>
              <span className="text-xs text-muted-foreground">{r.destination}</span>
            </Card>
          ))}
        </div>

        {equipment.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground mt-5 mb-2">{isAr ? "طلبات العهد" : "Equipment requests"}</h3>}
        <div className="space-y-3">
          {equipment.map((r) => (
            <Card key={r.id} r={r}
              kindBadge={<span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{isAr ? "عهدة" : "Equipment"}</span>}
              actions={[
                { label: isAr ? "إحالة للموارد البشرية" : "Forward to HR", cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove("equipment", r), busyKey: r.id },
                { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("equipment", r) },
              ]}>
              <span className="text-xs text-muted-foreground">{r.item_label || r.custom_type || r.item_type}</span>
              {r.reason && <span className="text-xs text-muted-foreground">· {r.reason}</span>}
            </Card>
          ))}
        </div>

        {complaints.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground mt-5 mb-2">{isAr ? "الشكاوى" : "Complaints"}</h3>}
        <div className="space-y-3">
          {complaints.map((r) => (
            <Card key={r.id} r={r}
              kindBadge={<span className="text-xs px-2 py-0.5 rounded-full bg-rose-50 text-rose-600">{isAr ? "شكوى" : "Complaint"}</span>}
              actions={[
                { label: isAr ? "إحالة للموارد البشرية" : "Forward to HR", cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove("complaints", r), busyKey: r.id },
                { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("complaints", r) },
              ]}>
              <span className="text-xs text-muted-foreground whitespace-pre-wrap">{r.description}</span>
            </Card>
          ))}
        </div>

        <ManagerAttendanceSection records={data?.attendance || []} subs={data?.subordinates || []} />

        {(() => {
          const docBtn = (url, label) => url ? (
            <StoredDocButton value={url}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-violet-700 text-white hover:bg-violet-800 whitespace-nowrap">
              <Download size={13} /> {label}
            </StoredDocButton>
          ) : null;
          const proofBtn = (url) => url ? (
            <StoredDocButton value={url}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap">
              <Download size={13} /> {isAr ? "إثبات التحويل" : "Transfer proof"}
            </StoredDocButton>
          ) : null;
          const rows = [
            ...(data?.leaveHistory || []).map((r) => ({
              key: "L" + r.id, emp: r.employee_name, nat: r.national_id || "", date: r.start_date, sort: r.start_date,
              kind: leaveTypeLabel(r.leave_type), detail: isAr ? `${r.start_date} → ${r.end_date}` : `${r.start_date} → ${r.end_date}`,
              status: r.status, doc: r.settlement_pdf_url, docLabel: isAr ? "المخالصة" : "Settlement", proof: r.finance_proof_url,
            })),
            ...(data?.loanHistory || []).map((r) => ({
              key: "N" + r.id, emp: r.employee_name, nat: r.national_id || "", date: r.request_date || (r.created_date || "").slice(0, 10), sort: r.request_date || r.created_date,
              kind: t.loan || (isAr ? "سلفة" : "Loan"), detail: formatCurrency(r.amount), status: r.status,
              doc: r.statement_pdf_url, docLabel: isAr ? "كشف السلفة" : "Loan statement", proof: r.finance_proof_url,
            })),
            ...(data?.tripHistory || []).map((r) => ({
              key: "T" + r.id, emp: r.employee_name, nat: r.national_id || "", date: r.start_date, sort: r.start_date,
              kind: r.trip_type === "external" ? (t.tripExt || (isAr ? "انتداب خارجي" : "External trip")) : (t.tripInt || (isAr ? "انتداب داخلي" : "Internal trip")),
              detail: r.destination || "", status: r.status,
              doc: r.approval_pdf_url, docLabel: isAr ? "موافقة الانتداب" : "Trip approval", proof: r.finance_proof_url,
            })),
          ].sort((a, b) => (b.sort || "").localeCompare(a.sort || ""));
          if (rows.length === 0) return null;
          const q = histSearch.trim();
          const filtered = q ? rows.filter((r) => (r.nat || "").includes(q) || (r.emp || "").includes(q)) : rows;
          return (
            <>
              <h3 className="text-sm font-semibold text-muted-foreground mt-6 mb-2 flex items-center gap-1.5">
                <Download size={14} /> {isAr ? "سجل معاملات المرؤوسين" : "Subordinates' transactions log"}
              </h3>
              <div className="mb-2 flex items-center gap-2">
                <div className="relative">
                  <Input
                    value={histSearch}
                    onChange={(e) => setHistSearch(e.target.value)}
                    placeholder={isAr ? "بحث برقم الهوية أو الاسم" : "Search by ID or name"}
                    className="h-8 w-56 text-xs"
                  />
                </div>
                {histSearch && (
                  <button onClick={() => setHistSearch("")} className="text-xs text-muted-foreground hover:text-foreground">{isAr ? "مسح" : "Clear"}</button>
                )}
              </div>
              <div className="border rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-muted/50 text-xs font-semibold text-muted-foreground">
                  <div className="col-span-3">{isAr ? "الموظف" : "Employee"}</div>
                  <div className="col-span-2">{isAr ? "التاريخ" : "Date"}</div>
                  <div className="col-span-2">{isAr ? "النوع" : "Type"}</div>
                  <div className="col-span-2">{isAr ? "التفاصيل" : "Details"}</div>
                  <div className="col-span-1">{isAr ? "الحالة" : "Status"}</div>
                  <div className="col-span-2 text-center">{isAr ? "المستند" : "Document"}</div>
                </div>
                {filtered.map((r) => {
                  const b = badge(r.status);
                  return (
                  <div key={r.key} className="grid grid-cols-12 gap-2 px-3 py-2.5 text-xs border-t items-center">
                    <div className="col-span-3 font-medium truncate">{r.emp}</div>
                    <div className="col-span-2 text-muted-foreground">{r.date || "—"}</div>
                    <div className="col-span-2">{r.kind}</div>
                    <div className="col-span-2 text-muted-foreground truncate">{r.detail}</div>
                    <div className="col-span-1"><span className={cn("px-1.5 py-0.5 rounded-full whitespace-nowrap", b.cls)}>{b.label}</span></div>
                    <div className="col-span-2 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {docBtn(r.doc, r.docLabel)}
                        {proofBtn(r.proof)}
                        {!r.doc && !r.proof && <span className="text-muted-foreground">—</span>}
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        <Dialog open={!!acting} onOpenChange={() => setActing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">{t.rejectReason}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setActing(null)}>{t.cancel}</Button>
              <Button variant="destructive" onClick={confirmReject} disabled={busy} className="gap-1">
                {busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} {t.confirmReject}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ===== المدير المالي =====
  const leaves = data?.leaves || [];
  const loans = data?.loans || [];
  const trips = data?.trips || [];
  const settlements = data?.settlements || [];

  const leaveActions = (r) => {
    const a = [{ label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openFinance("leaves", r) },
               { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("leaves", r) }];
    if (r.settlement_pdf_url) a.push({ label: t.settlement, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", doc: r.settlement_pdf_url });
    if (r.finance_proof_url) a.push({ label: t.finProof, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", doc: r.finance_proof_url });
    return a;
  };
  const loanActions = (r) => {
    const a = [{ label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openFinance("loans", r) },
               { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("loans", r) }];
    if (r.statement_pdf_url) a.push({ label: t.statement, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", doc: r.statement_pdf_url });
    return a;
  };
  const tripActions = (r) => {
    const a = [{ label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openFinance("trips", r) },
               { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("trips", r) }];
    if (r.approval_pdf_url) a.push({ label: t.tripDoc, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", doc: r.approval_pdf_url });
    return a;
  };
  const settlementActions = (r) => {
    const a = [{ label: isAr ? "معاينة/طباعة المخالصة" : "View/Print settlement", cls: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100", onClick: () => printSet(r) },
               { label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openFinance("settlements", r) },
               { label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("settlements", r) }];
    if (r.finance_proof_url) a.push({ label: t.finProof, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", doc: r.finance_proof_url });
    return a;
  };

  return (
    <div dir={portalDir(lang)} className="animate-fade-in">
      <PageHeader title={t.fTitle} subtitle={t.fSub} />
      <div className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl p-4 sm:p-5">
      <Tabs defaultValue="leaves">
        <TabsList className="mb-4 bg-white/50 backdrop-blur-md border border-white/60 rounded-2xl">
          <TabsTrigger value="leaves">{t.tabLeaves(leaves.length)}</TabsTrigger>
          <TabsTrigger value="loans">{t.tabLoans(loans.length)}</TabsTrigger>
          <TabsTrigger value="trips">{t.tabTrips(trips.length)}</TabsTrigger>
          <TabsTrigger value="settlements">{t.tabSettlements(settlements.length)}</TabsTrigger>
        </TabsList>

        <TabsContent value="leaves">
          <div className="space-y-3">
            {leaves.length === 0 ? <Empty /> : leaves.map((r) => (
              <Card key={r.id} r={r} actions={leaveActions(r)}>
                {r.leave_type === "annual" && (
                  <span className={cn("text-xs px-2 py-0.5 rounded-full", r.annual_leave_mode === "encash_continue" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700")}>
                    {isAr ? (r.annual_leave_mode === "encash_continue" ? "تصفية مع مواصلة العمل" : "إجازة سفر فعلي") : (r.annual_leave_mode === "encash_continue" ? "Encash & continue" : "Travel leave")}
                  </span>
                )}
                {r.is_full_clearance && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{t.fullClear}</span>}
                {Number(r.ticket_amount) > 0 && <span className="text-xs text-muted-foreground">{t.ticket(r.ticket_amount)}</span>}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="loans">
          <div className="space-y-3">
            {loans.length === 0 ? <Empty /> : loans.map((r) => (
              <Card key={r.id} r={r} actions={loanActions(r)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="trips">
          <div className="space-y-3">
            {trips.length === 0 ? <Empty /> : trips.map((r) => (
              <Card key={r.id} r={r} actions={tripActions(r)}
                kindBadge={<span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 flex items-center gap-1"><Plane size={11} /> {r.trip_type === "external" ? t.tripExt : t.tripInt}</span>}>
                {Number(r.total_cost) > 0 && <span className="text-xs text-muted-foreground">{t.tripCost(r.total_cost)}</span>}
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="settlements">
          <div className="space-y-3">
            {settlements.length === 0 ? <Empty /> : settlements.map((r) => (
              <div key={r.id} className="bg-white/50 backdrop-blur-md rounded-2xl border border-white/60 shadow-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div>
                        <div className="font-medium text-sm">{r.employee_name || "—"}</div>
                        {r.national_id && <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{r.national_id}</div>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{t.eosBadge}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.totalSettleLabel}<b className="text-foreground">{formatCurrency(r.total_settlement)}</b> · {r.last_working_date || ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                    {settlementActions(r).map((a, i) => a.doc ? (
                      <StoredDocButton key={i} value={a.doc} className={cn("inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium", a.cls)}>
                        <Download size={14} /> {a.label}
                      </StoredDocButton>
                    ) : (
                      <Button key={i} size="sm" onClick={a.onClick} disabled={busy} className={cn("h-8 text-xs gap-1", a.cls)}>
                        {a.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      </div>

      {/* سجل المعاملات المالي الدائم — كل ما صُرف أو اعتمد عبر المالية */}
      {(() => {
        const docBtn = (url, label) => url ? (
          <StoredDocButton value={url}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-violet-700 text-white hover:bg-violet-800 whitespace-nowrap">
            <Download size={13} /> {label}
          </StoredDocButton>
        ) : null;
        const proofBtn = (url) => url ? (
          <StoredDocButton value={url}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 whitespace-nowrap">
            <Download size={13} /> {t.finProof}
          </StoredDocButton>
        ) : null;
        const printBtn = (rec) => rec ? (
          <button type="button" onClick={() => printSet(rec)}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 whitespace-nowrap">
            <Printer size={13} /> {isAr ? "المخالصة" : "Settlement"}
          </button>
        ) : null;
        const rows = [
          ...(data?.leaveHistory || []).map((r) => ({
            key: "L" + r.id, emp: r.employee_name, nat: r.national_id || "",
            date: r.finance_paid_date || r.start_date || (r.created_date || "").slice(0, 10),
            sort: r.finance_paid_date || r.start_date || r.created_date,
            kind: leaveTypeLabel(r.leave_type),
            detail: isAr ? `${r.start_date} → ${r.end_date}` : `${r.start_date} → ${r.end_date}`,
            status: r.status, paidDate: r.finance_paid_date || "—",
            doc: r.settlement_pdf_url, docLabel: isAr ? "المخالصة" : "Settlement",
            proof: r.finance_proof_url,
          })),
          ...(data?.loanHistory || []).map((r) => ({
            key: "N" + r.id, emp: r.employee_name, nat: r.national_id || "",
            date: r.finance_paid_date || r.request_date || (r.created_date || "").slice(0, 10),
            sort: r.finance_paid_date || r.request_date || r.created_date,
            kind: t.loan || (isAr ? "سلفة" : "Loan"), detail: formatCurrency(r.amount),
            status: r.status, paidDate: r.finance_paid_date || "—",
            doc: r.statement_pdf_url, docLabel: isAr ? "كشف السلفة" : "Loan statement",
            proof: r.finance_proof_url,
          })),
          ...(data?.tripHistory || []).map((r) => ({
            key: "T" + r.id, emp: r.employee_name, nat: r.national_id || "",
            date: r.finance_paid_date || r.start_date || (r.created_date || "").slice(0, 10),
            sort: r.finance_paid_date || r.start_date || r.created_date,
            kind: r.trip_type === "external" ? (t.tripExt || (isAr ? "انتداب خارجي" : "External trip")) : (t.tripInt || (isAr ? "انتداب داخلي" : "Internal trip")),
            detail: r.destination || "", status: r.status,
            paidDate: r.finance_paid_date || "—",
            doc: r.approval_pdf_url, docLabel: isAr ? "موافقة الانتداب" : "Trip approval",
            proof: r.finance_proof_url,
          })),
          ...(data?.settlementHistory || []).map((r) => ({
            key: "S" + r.id, emp: r.employee_name, nat: r.national_id || "",
            date: r.finance_paid_date || r.generated_date || (r.created_date || "").slice(0, 10),
            sort: r.finance_paid_date || r.generated_date || r.created_date,
            kind: isAr ? "مخالصة نهاية خدمة" : "End-of-service",
            detail: formatCurrency(r.total_settlement), status: r.status,
            paidDate: r.finance_paid_date || "—",
            doc: null, docLabel: "", proof: r.finance_proof_url, isSettle: true, rec: r,
          })),
        ].sort((a, b) => (b.sort || "").localeCompare(a.sort || ""));
        if (rows.length === 0) return null;
        const q = finHistSearch.trim();
        const filtered = q ? rows.filter((r) => (r.nat || "").includes(q) || (r.emp || "").includes(q)) : rows;
        return (
          <div className="mt-6 rounded-3xl bg-white/40 backdrop-blur-xl border border-white/60 shadow-xl p-4 sm:p-5">
            <h3 className="text-base font-bold mb-1 flex items-center gap-2">
              <ClipboardCheck size={18} className="text-violet-600" /> {t.finHistoryTitle}
            </h3>
            <p className="text-xs text-muted-foreground mb-3">{t.finHistorySub}</p>
            <div className="mb-3 flex items-center gap-2">
              <Input
                value={finHistSearch}
                onChange={(e) => setFinHistSearch(e.target.value)}
                placeholder={t.finSearchPh}
                className="h-9 w-64 text-sm"
              />
              {finHistSearch && (
                <button onClick={() => setFinHistSearch("")} className="text-xs text-muted-foreground hover:text-foreground">{isAr ? "مسح" : "Clear"}</button>
              )}
            </div>
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground text-sm">{t.finHistoryEmpty}</div>
            ) : (
              <div className="rounded-2xl bg-white border border-violet-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse" style={{ tableLayout: "fixed" }}>
                    <colgroup>
                      <col style={{ width: "22%" }} />
                      <col style={{ width: "14%" }} />
                      <col style={{ width: "13%" }} />
                      <col style={{ width: "18%" }} />
                      <col style={{ width: "10%" }} />
                      <col style={{ width: "11%" }} />
                      <col style={{ width: "12%" }} />
                    </colgroup>
                    <thead>
                      <tr className="bg-violet-50 text-muted-foreground">
                        <th className="text-right font-semibold px-3 py-3 border-b border-violet-100">{isAr ? "الموظف" : "Employee"}</th>
                        <th className="text-right font-semibold px-3 py-3 border-b border-violet-100">{isAr ? "التاريخ" : "Date"}</th>
                        <th className="text-right font-semibold px-3 py-3 border-b border-violet-100">{isAr ? "النوع" : "Type"}</th>
                        <th className="text-right font-semibold px-3 py-3 border-b border-violet-100">{isAr ? "التفاصيل" : "Details"}</th>
                        <th className="text-center font-semibold px-2 py-3 border-b border-violet-100">{isAr ? "الحالة" : "Status"}</th>
                        <th className="text-right font-semibold px-3 py-3 border-b border-violet-100">{t.finPaidDate}</th>
                        <th className="text-center font-semibold px-2 py-3 border-b border-violet-100">{isAr ? "المستند" : "Document"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((r, i) => {
                        const b = badge(r.status);
                        return (
                          <tr key={r.key} className={cn("align-middle", i % 2 === 0 ? "bg-white" : "bg-slate-50/70")}>
                            <td className="px-3 py-2.5 border-b border-slate-100">
                              <div className="font-medium text-foreground truncate">{r.emp}</div>
                              {r.nat && <div className="text-muted-foreground tabular-nums mt-0.5" dir="ltr">{r.nat}</div>}
                            </td>
                            <td className="px-3 py-2.5 border-b border-slate-100">
                              <span className="text-muted-foreground whitespace-nowrap" dir="ltr">{r.date || "—"}</span>
                            </td>
                            <td className="px-3 py-2.5 border-b border-slate-100">
                              <span className="text-foreground">{r.kind}</span>
                            </td>
                            <td className="px-3 py-2.5 border-b border-slate-100">
                              <span className="text-muted-foreground block truncate" dir="auto">{r.detail}</span>
                            </td>
                            <td className="px-2 py-2.5 border-b border-slate-100 text-center">
                              <span className={cn("inline-block px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap", b.cls)}>{b.label}</span>
                            </td>
                            <td className="px-3 py-2.5 border-b border-slate-100">
                              <span className="text-muted-foreground whitespace-nowrap" dir="ltr">{r.paidDate}</span>
                            </td>
                            <td className="px-2 py-2.5 border-b border-slate-100 text-center">
                              <div className="flex flex-col items-center gap-1">
                                {docBtn(r.doc, r.docLabel)}
                                {r.isSettle && printBtn(r.rec)}
                                {proofBtn(r.proof)}
                                {!r.doc && !r.proof && !r.isSettle && <span className="text-muted-foreground">—</span>}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* رفض */}
      <Dialog open={acting?.action === "reject"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">{t.rejectReason}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)}>{t.cancel}</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={busy} className="gap-1">
              {busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} {t.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* صرف */}
      <Dialog open={acting?.action === "confirm"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.payTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {acting.type === "leaves" ? t.leavePay(acting.req.ticket_amount || 0) : acting.type === "loans" ? t.loanPay(acting.req.amount) : acting.type === "settlements" ? t.settlePay(acting.req.total_settlement) : t.tripPay()}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.finNote}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t.finNotePh} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.proof}</Label>
                <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0])} />
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{acting.type === "settlements" ? t.payNoteSettle : t.payNote}</div>
              {!proofFile && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-2">{isAr ? "يجب إرفاق مستند السداد قبل التأكيد" : "Payment proof is required to confirm"}</div>
              )}
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)}>{t.cancel}</Button>
                <Button onClick={confirmFinance} disabled={busy || !proofFile} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.confirmPay}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {printing && createPortal(
        <div className="print-mount" aria-hidden="true">
          <SettlementSheet record={printing} org={data?.org} />
        </div>,
        document.body
      )}
    </div>
  );
}