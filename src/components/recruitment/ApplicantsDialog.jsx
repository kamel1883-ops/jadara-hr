import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import { renderToPdfBlob, uploadPdfBlob } from "@/lib/pdfDocs";
import AppointmentLetterDoc from "@/components/docs/AppointmentLetterDoc";
import VaultDocLink from "@/components/VaultDocLink";
import { archiveBlobToVault } from "@/lib/vaultDocuments";
import { CheckCircle2, XCircle, CalendarClock, UserCheck, ClipboardList, Loader2, FileCheck } from "lucide-react";

export default function ApplicantsDialog({ open, onOpenChange, job, onHired, onEvaluate }) {
  const { toast } = useToast();
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: (label) => `المتقدمون — ${label}`,
    onlySuit: "عرض المناسبين للوظيفة فقط",
    count: (n) => `${n} متقدم`,
    loading: "جارٍ التحميل...", empty: "لا يوجد متقدمون.",
    suitable: "مناسب", notSuit: "غير مطابق",
    yrs: "سنوات خبرة", qual: "المؤهلات",
    cv: "عرض السيرة الذاتية", apptDoc: "قرار التعيين",
    screen: "ترشيح", interview: "استدعاء للمقابلة",
    hire: "تعيين وإصدار قرار", reject: "رفض", eval: "تقييم فترة التجربة",
    rejectReasonLbl: "سبب الرفض",
    hireAsk: (n) => `تعيين ${n}؟ سيتم إنشاء ملف موظف ومستند قرار تعيين ومعتمد، وإغلاق الوظيفة ورفض بقية الطلبات تلقائياً.`,
    notifTitle: "تعيين موظف جديد",
    notifBody: (n, j, no) => `تم تعيين ${n} كـ${j} (رقم ${no})، وتم إصدار قرار التعيين. الرجاء استكمال كافة بياناته لاعتماده ضمن الموظفين الثابتين.`,
    ok: "تم التحديث", fail: "تعذر التحديث",
    hiredOk: "تم التعيين وإغلاق الوظيفة", hiredOkDesc: "تم إنشاء ملف الموظف وقرار التعيين وإشعار المسؤول",
    hireFail: "تعذر إتمام التعيين",
    needReason: "يرجى كتابة سبب الرفض", rejectedOk: "تم الرفض", rejectFail: "تعذر الرفض",
    rejectHdr: (n) => `رفض: ${n}`,
    rejectPh: "اكتب سبب الرفض", confirmReject: "تأكيد الرفض", cancel: "إلغاء",
    otherHired: "تم تعيين مرشّح آخر",
  } : {
    title: (label) => `Applicants — ${label}`,
    onlySuit: "Show only suitable candidates",
    count: (n) => `${n} applicants`,
    loading: "Loading...", empty: "No applicants.",
    suitable: "Suitable", notSuit: "Not matching",
    yrs: "years exp", qual: "Qualifications",
    cv: "View CV", apptDoc: "Appointment letter",
    screen: "Shortlist", interview: "Invite to interview",
    hire: "Hire & issue", reject: "Reject", eval: "Trial evaluation",
    rejectReasonLbl: "Reject reason",
    hireAsk: (n) => `Hire ${n}? An employee record and appointment letter will be created, the job closed, and the rest of the applications rejected automatically.`,
    notifTitle: "New hire",
    notifBody: (n, j, no) => `${n} has been hired as ${j} (no. ${no}); the appointment letter has been issued. Please complete their data to confirm them as a permanent employee.`,
    ok: "Updated", fail: "Update failed",
    hiredOk: "Hired and job closed", hiredOkDesc: "Employee record, appointment letter and admin notification created",
    hireFail: "Hire failed",
    needReason: "Please enter the rejection reason", rejectedOk: "Rejected", rejectFail: "Reject failed",
    rejectHdr: (n) => `Reject: ${n}`,
    rejectPh: "Type the rejection reason", confirmReject: "Confirm reject", cancel: "Cancel",
    otherHired: "Another candidate was hired",
  };
  const statusMap = {
    applied: { ar: "قُدمت", en: "Applied", cls: "bg-slate-100 text-slate-700" },
    screened: { ar: "مرشّح", en: "Shortlisted", cls: "bg-blue-100 text-blue-800" },
    interview: { ar: "مقابلة", en: "Interview", cls: "bg-amber-100 text-amber-800" },
    hired: { ar: "معيّن", en: "Hired", cls: "bg-emerald-100 text-emerald-800" },
    rejected: { ar: "مرفوض", en: "Rejected", cls: "bg-red-100 text-red-700" },
  };

  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [onlySuitable, setOnlySuitable] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  const load = async () => {
    if (!job) return;
    setLoading(true);
    try { const a = await base44.entities.JobApplication.filter({ job_id: job.id }, "-created_date", 500); setApps(a || []); }
    catch (e) { toast({ title: t.fail, description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open) load(); }, [open, job?.id]);

  const suitable = (a) => {
    if (!job || job.nationality_req === "any") return true;
    if (job.nationality_req === "saudi") return (a.nationality || "").includes("سعود") || /saudi/i.test(a.nationality || "");
    if (job.nationality_req === "resident") return !(a.nationality || "").includes("سعود") && !/saudi/i.test(a.nationality || "");
    return true;
  };
  const list = onlySuitable ? apps.filter(suitable) : apps;

  const setStatus = async (a, status, extra = {}) => {
    try { await base44.entities.JobApplication.update(a.id, { status, ...extra }); toast({ title: t.ok }); load(); }
    catch (e) { toast({ title: t.fail, description: e.message, variant: "destructive" }); }
  };

  const hire = async (a) => {
    if (!confirm(t.hireAsk(a.full_name))) return;
    setBusy(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      let org = null;
      try { const orgs = await listCurrentOrg(); org = orgs[0] || null; } catch {}

      let docUrl = "";
      try {
        const blob = await renderToPdfBlob(<AppointmentLetterDoc applicant={{ ...a, hired_date: today }} job={job} org={org} />);
        docUrl = await archiveBlobToVault(blob, { fileName: `appointment_${a.id}.pdf`, docType: "appointment_letter" }) || "";
      } catch (e) { console.error(e); }

      const empNo = "JDR-" + Date.now().toString().slice(-6);
      const emp = await base44.entities.Employee.create({
        full_name: a.full_name, employee_number: empNo, department: job.department || "",
        position: job.title, hire_date: today, base_salary: job.salary || 0,
        phone: a.phone, nationality: a.nationality, status: "active", termination_reason: "none",
      });
      await base44.entities.JobApplication.update(a.id, { status: "hired", hired_date: today, appointment_doc_url: docUrl, appointment_approved: true, hired_employee_id: emp.id });
      await base44.entities.Job.update(job.id, { status: "closed", closed_date: today, hired_applicant_name: a.full_name });
      await base44.entities.JobApplication.updateMany(
        { job_id: job.id, status: { $in: ["applied", "screened", "interview"] } },
        { $set: { status: "rejected", reject_reason: t.otherHired } }
      );
      await base44.entities.Notification.create({
        title: t.notifTitle,
        body: t.notifBody(a.full_name, job.title, empNo),
        type: "hired", link: "/employees", is_read: false,
      });

      toast({ title: t.hiredOk, description: t.hiredOkDesc });
      onHired?.();
      load();
    } catch (e) { toast({ title: t.hireFail, description: e.message, variant: "destructive" }); }
    finally { setBusy(false); }
  };

  const doReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { toast({ title: t.needReason, variant: "destructive" }); return; }
    try { await base44.entities.JobApplication.update(rejectTarget.id, { status: "rejected", reject_reason: rejectReason }); toast({ title: t.rejectedOk }); setRejectTarget(null); setRejectReason(""); load(); }
    catch (e) { toast({ title: t.rejectFail, description: e.message, variant: "destructive" }); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{t.title(job?.title || "")}</DialogTitle></DialogHeader>
        <div className="flex items-center justify-between py-2">
          <label className="text-sm text-muted-foreground flex items-center gap-2">
            <input type="checkbox" checked={onlySuitable} onChange={(e) => setOnlySuitable(e.target.checked)} />
            {t.onlySuit}
          </label>
          <span className="text-xs text-muted-foreground">{t.count(list.length)}</span>
        </div>
        {loading ? <div className="py-12 text-center text-muted-foreground">{t.loading}</div> :
          list.length === 0 ? <div className="py-12 text-center text-muted-foreground">{t.empty}</div> :
          <div className="space-y-3">
            {list.map((a) => {
              const st = statusMap[a.status] || statusMap.applied;
              const ok = suitable(a);
              return (
                <div key={a.id} className="border rounded-xl p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {a.full_name}
                        {ok ? <Badge className="bg-emerald-100 text-emerald-800 border-0">{t.suitable}</Badge> : <Badge className="bg-red-100 text-red-700 border-0">{t.notSuit}</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{a.email} · {a.phone} · {a.nationality} · {a.experience_years} {t.yrs}</div>
                    </div>
                    <Badge className={st.cls + " border-0"}>{isAr ? st.ar : st.en}</Badge>
                  </div>
                  {a.qualifications && <div className="text-sm text-muted-foreground">{t.qual}: {a.qualifications}</div>}
                  <div className="flex flex-wrap items-center gap-2">
                    {a.cv_url && <VaultDocLink value={a.cv_url} label={t.cv} className="text-xs h-7 px-2 text-violet-700" />}
                    {a.appointment_doc_url && <VaultDocLink value={a.appointment_doc_url} label={t.apptDoc} className="text-xs h-7 px-2 text-emerald-700" />}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {a.status === "applied" && <Button size="sm" variant="outline" onClick={() => setStatus(a, "screened")}><UserCheck size={14} /> {t.screen}</Button>}
                    {a.status !== "interview" && a.status !== "hired" && a.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(a, "interview", { interview_date: new Date().toISOString().slice(0, 10) })}><CalendarClock size={14} /> {t.interview}</Button>}
                    {job && job.status === "open" && a.status !== "hired" && a.status !== "rejected" && <Button size="sm" variant="default" onClick={() => hire(a)} disabled={busy}>{busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />} {t.hire}</Button>}
                    {a.status !== "hired" && a.status !== "rejected" && <Button size="sm" variant="destructive" onClick={() => { setRejectTarget(a); setRejectReason(""); }}><XCircle size={14} /> {t.reject}</Button>}
                    {a.status === "hired" && <Button size="sm" variant="outline" onClick={() => onEvaluate?.(a)}><ClipboardList size={14} /> {t.eval}</Button>}
                  </div>
                  {a.reject_reason && <div className="text-xs text-red-700">{isAr ? "سبب الرفض" : "Reject reason"}: {a.reject_reason}</div>}
                </div>
              );
            })}
          </div>}
        {rejectTarget && (
          <div className="border-t pt-3 mt-3 space-y-2">
            <div className="font-medium">{t.rejectHdr(rejectTarget.full_name)}</div>
            <Label>{t.rejectReasonLbl} *</Label>
            <Textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t.rejectPh} />
            <div className="flex gap-2">
              <Button variant="destructive" onClick={doReject}>{t.confirmReject}</Button>
              <Button variant="outline" onClick={() => setRejectTarget(null)}>{t.cancel}</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}