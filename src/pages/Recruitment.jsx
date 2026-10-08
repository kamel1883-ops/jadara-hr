import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users, CalendarCheck, Share2, ClipboardList, FileCheck, Printer } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useI18n } from "@/lib/i18n";
import JobFormDialog from "@/components/recruitment/JobFormDialog";
import ApplicantsDialog from "@/components/recruitment/ApplicantsDialog";
import TrialEvaluationDialog from "@/components/recruitment/TrialEvaluationDialog";
import { safeHref } from "@/lib/utils";
import ShareJobDialog from "@/components/recruitment/ShareJobDialog";
import JobCardDoc from "@/components/docs/JobCardDoc";
import { safePrint } from "@/lib/safePrint";

const plus90 = (d) => d ? new Date(new Date(d).getTime() + 90 * 24 * 3600 * 1000).toISOString().slice(0, 10) : "";
const todayISO = () => new Date().toISOString().slice(0, 10);

export default function Recruitment() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const { toast } = useToast();
  const t = isAr ? {
    title: "إدارة التوظيف",
    subtitle: "إدارة الوظائف الشاغرة والوصف الوظيفي والمتقدمين والتعيين وتقييم فترة التجربة",
    newJob: "وظيفة جديدة",
    reportTitle: "تقرير: الموظفون المعيّنون خلال آخر ٩٠ يوماً (فترة التجربة)",
    reportSub: "موظف — مع تاريخ التعيين ونهاية فترة التجربة وإجراء التقييم",
    noHired: "لا يوجد موظفون توظّفوا خلال آخر ٩٠ يوم.",
    thEmp: "الموظف", thId: "الهوية/الإقامة", thJob: "الوظيفة", thHired: "تاريخ التعيين",
    thProbEnd: "نهاية فترة التجربة (٩٠ يوماً)", thStatus: "الحالة", thAction: "إجراء",
    confirmed: "مثبّت — موظف ثابت", dismissed: "مستبعد (مادة 53)", extended: "تمديد التجربة",
    inTrial: "في فترة التجربة", awaitEval: "أكمل التجربة — بانتظار التقييم",
    evaluate: "التقييم", apptDoc: "قرار التعيين",
    jobsTitle: "الوظائف", loading: "جارٍ التحميل...",
    noJobs: "لا توجد وظائف شاغرة — ابدأ بإنشاء وظيفة.",
    jobOpen: "شاغرة", jobClosed: "مغلقة",
    fullTime: "دوام كامل", partTime: "دوام جزئي", contract: "عقد",
    sar: "ريال", hiredAs: "تم التعيين",
    applicants: "المتقدمون", share: "مشاركة",
    confirmDel: "حذف هذه الوظيفة؟", delOk: "تم الحذف", delErr: "تعذر الحذف", loadErr: "تعذر التحميل",
    print: "طباعة البطاقة",
    pStatus: "الحالة", pProf: "المهنة", pType: "نوع الوظيفة", pGrade: "الدرجة", pSalary: "الراتب",
    pVac: "عدد الشواغر", pDept: "الإدارة", pNatReq: "المطلوب", pQual: "المؤهلات المطلوبة",
    pTasks: "المهام والمسؤوليات", pDesc: "الوصف الوظيفي", pPublished: "تاريخ النشر", pClosed: "تاريخ الإغلاق",
    pHired: "الموظف المعيّن", pCardTitle: "البطاقة الوظيفية",
  } : {
    title: "Recruitment Management",
    subtitle: "Manage vacancies, job descriptions, applicants, hiring and probation evaluation",
    newJob: "New job",
    reportTitle: "Report: Hires in the last 90 days (probation)",
    reportSub: "employee — with hire date, probation end and evaluation action",
    noHired: "No hires in the last 90 days.",
    thEmp: "Employee", thId: "ID / Iqama", thJob: "Job title", thHired: "Hiring date",
    thProbEnd: "Probation end (90 days)", thStatus: "Status", thAction: "Actions",
    confirmed: "Confirmed — permanent", dismissed: "Dismissed (Article 53)", extended: "Extend probation",
    inTrial: "In probation", awaitEval: "Completed probation — awaiting evaluation",
    evaluate: "Evaluate", apptDoc: "Hiring decision",
    jobsTitle: "Jobs", loading: "Loading...",
    noJobs: "No vacancies yet — start by creating a job.",
    jobOpen: "Open", jobClosed: "Closed",
    fullTime: "Full-time", partTime: "Part-time", contract: "Contract",
    sar: "SAR", hiredAs: "Hired:",
    applicants: "Applicants", share: "Share",
    confirmDel: "Delete this job?", delOk: "Deleted", delErr: "Could not delete", loadErr: "Could not load",
    print: "Print card",
    pStatus: "Status", pProf: "Profession", pType: "Type", pGrade: "Grade", pSalary: "Salary",
    pVac: "Vacancies", pDept: "Department", pNatReq: "Required", pQual: "Qualifications",
    pTasks: "Tasks & responsibilities", pDesc: "Job description", pPublished: "Published", pClosed: "Closed",
    pHired: "Hired employee", pCardTitle: "Job Card",
  };

  const [jobs, setJobs] = useState([]);
  const [hiredRecent, setHiredRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobDialog, setJobDialog] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [applicantsJob, setApplicantsJob] = useState(null);
  const [evalApplicant, setEvalApplicant] = useState(null);
  const [evalJob, setEvalJob] = useState(null);
  const [shareJob, setShareJob] = useState(null);

  const [evalMap, setEvalMap] = useState({});
  const [employees, setEmployees] = useState([]);
  const [printJobCard, setPrintJobCard] = useState(null);
  const [org, setOrg] = useState(null);
  const load = async () => {
    setLoading(true);
    try {
      const [j, apps, evals, emps, orgs] = await Promise.all([
        base44.entities.Job.list("-created_date", 200),
        base44.entities.JobApplication.filter({ status: "hired" }, "-hired_date", 500),
        base44.entities.TrialEvaluation.list("-created_date", 500),
        base44.entities.Employee.list("-created_date", 1000),
        listCurrentOrg(),
      ]);
      setJobs(j || []);
      setEmployees(emps || []);
      const orgObj = orgs?.[0] || null;
      setOrg(orgObj);
      if (orgObj?.logo_url) { try { const pre = new Image(); pre.crossOrigin = "anonymous"; pre.src = orgObj.logo_url; } catch (e) {} }
      const em = {};
      (evals || []).forEach((tt) => {
        const k = tt.applicant_id;
        if (!k) return;
        if (!em[k] || new Date(tt.updated_date || tt.created_date) > new Date(em[k].updated_date || em[k].created_date)) em[k] = tt;
      });
      setEvalMap(em);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - 90);
      setHiredRecent((apps || []).filter((a) => new Date(a.hired_date || a.created_date) >= cutoff));
    } catch (e) { toast({ title: t.loadErr, description: e.message, variant: "destructive" }); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const empNat = (a) => employees.find((e) => e.id === a.hired_employee_id)?.national_id || "";

  const openNew = () => { setEditingJob(null); setJobDialog(true); };
  const openEdit = (j) => { setEditingJob(j); setJobDialog(true); };
  const del = async (j) => {
    if (!confirm(t.confirmDel)) return;
    try { await base44.entities.Job.delete(j.id); toast({ title: t.delOk }); load(); }
    catch (e) { toast({ title: t.delErr, description: e.message, variant: "destructive" }); }
  };

  const openHiredEval = (app) => {
    const job = jobs.find((x) => x.id === app.job_id) || null;
    setEvalApplicant(app);
    setEvalJob(job);
  };

  const printJob = (j) => {
    setPrintJobCard(j);
    safePrint();
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={
        <Button onClick={openNew}><Plus size={16} /> {t.newJob}</Button>
      } />

      <Card className="p-4 mb-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center"><CalendarCheck size={22} /></div>
          <div>
            <div className="font-semibold">{t.reportTitle}</div>
            <div className="text-sm text-muted-foreground">{hiredRecent.length} {t.reportSub}</div>
          </div>
        </div>
        {hiredRecent.length === 0 ? (
          <div className="text-sm text-muted-foreground py-3">{t.noHired}</div>
        ) : (
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thEmp}</th>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thId}</th>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thJob}</th>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thHired}</th>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thProbEnd}</th>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thStatus}</th>
                  <th className="text-right font-semibold px-3 py-2.5">{t.thAction}</th>
                </tr>
              </thead>
              <tbody>
                {hiredRecent.map((a) => {
                  const end = plus90(a.hired_date);
                  const inTrial = end >= todayISO();
                  const ev = evalMap[a.id];
                  const rec = ev?.recommendation;
                  return (
                    <tr key={a.id} className="border-t hover:bg-muted/40">
                      <td className="px-3 py-2.5 font-medium">{a.full_name}</td>
                      <td className="px-3 py-2.5 text-xs tabular-nums" dir="ltr">{empNat(a) || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{a.job_title}</td>
                      <td className="px-3 py-2.5">{a.hired_date}</td>
                      <td className="px-3 py-2.5">{end}</td>
                      <td className="px-3 py-2.5">
                        {rec === "confirm" ? <Badge className="bg-emerald-100 text-emerald-800 border-0">{t.confirmed}</Badge>
                          : rec === "dismiss_probation" ? <Badge className="bg-rose-100 text-rose-700 border-0">{t.dismissed}</Badge>
                          : rec === "extend" ? <Badge className="bg-blue-100 text-blue-800 border-0">{t.extended}</Badge>
                          : inTrial ? <Badge className="bg-amber-100 text-amber-800 border-0">{t.inTrial}</Badge>
                          : <Badge className="bg-violet-100 text-violet-800 border-0">{t.awaitEval}</Badge>}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openHiredEval(a)}><ClipboardList size={14} /> {t.evaluate}</Button>
                          {a.appointment_doc_url && <a href={safeHref(a.appointment_doc_url)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-emerald-700 underline"><FileCheck size={13} /> {t.apptDoc}</a>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t.jobsTitle}</h3>
      {loading ? (
        <div className="py-24 text-center text-muted-foreground">{t.loading}</div>
      ) : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center py-24 rounded-2xl border bg-card">
          <Users className="text-muted-foreground mb-4" size={48} />
          <p className="text-muted-foreground mb-4">{t.noJobs}</p>
          <Button onClick={openNew}><Plus size={16} /> {t.newJob}</Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {jobs.map((j) => (
            <Card key={j.id} className="p-4 flex flex-col gap-2">
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-foreground">{j.title}</div>
                {j.status === "open" ? <Badge className="bg-emerald-100 text-emerald-800 border-0">{t.jobOpen}</Badge> : <Badge className="bg-slate-200 text-slate-700 border-0">{t.jobClosed}</Badge>}
              </div>
              <div className="text-xs text-muted-foreground">{j.profession} · {j.job_type === "full_time" ? t.fullTime : j.job_type === "part_time" ? t.partTime : t.contract} {j.salary ? `· ${j.salary} ${t.sar}` : ""}</div>
              {j.hired_applicant_name && <div className="text-xs text-emerald-700">{t.hiredAs} {j.hired_applicant_name}</div>}
              {(j.prepared_by_name || j.prepared_by_id) && (
                <div className="text-[11px] text-muted-foreground">{isAr ? "أُعدّ بواسطة" : "Prepared by"}: {j.prepared_by_name}{j.prepared_by_id ? ` — ${j.prepared_by_id}` : ""}</div>
              )}
              <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t">
                <Button size="sm" variant="outline" onClick={() => setApplicantsJob(j)}><Users size={14} /> {t.applicants}</Button>
                <Button size="sm" variant="ghost" onClick={() => setShareJob(j)}><Share2 size={14} /> {t.share}</Button>
                <Button size="icon" variant="ghost" onClick={() => printJob(j)} title={t.print}><Printer size={15} /></Button>
                <Button size="icon" variant="ghost" onClick={() => openEdit(j)}><Pencil size={15} /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
      <JobFormDialog open={jobDialog} onOpenChange={setJobDialog} onSaved={load} job={editingJob} />
      <ApplicantsDialog open={!!applicantsJob} onOpenChange={(o) => !o && setApplicantsJob(null)} job={applicantsJob} onHired={load} onEvaluate={(a) => { setEvalApplicant(a); setEvalJob(applicantsJob); }} />
      <TrialEvaluationDialog open={!!evalApplicant} onOpenChange={(o) => !o && setEvalApplicant(null)} applicant={evalApplicant} job={evalJob} onSaved={load} />
      <ShareJobDialog open={!!shareJob} onOpenChange={(o) => !o && setShareJob(null)} job={shareJob} />

      {createPortal(
        <div className="print-jobcard hidden print:block" aria-hidden>
          {printJobCard && <JobCardDoc job={printJobCard} isAr={isAr} org={org} />}
        </div>,
        document.body
      )}
    </div>
  );
}