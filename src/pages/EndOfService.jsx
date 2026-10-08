import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import SettlementSheet from "@/components/SettlementSheet";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, AlertTriangle, Printer, Save, User, FileText, CalendarDays, Plane, Trash2, Loader2, Check, Upload, Send, Wallet, X, Scale, ExternalLink } from "lucide-react";
import { computeSettlement, reasonMeta, terminationReasons, todayISO, isSaudiNationalId } from "@/lib/eos";
import { computeLeaveEntitlement, usedLeaveTotal } from "@/lib/leaveBalance";
import { formatCurrency } from "@/lib/hr";
import { useI18n } from "@/lib/i18n";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { enrichEmployee, fetchSensitiveByRef } from "@/lib/vaultSensitive";
import { writeRecordToVault, readRecordFromVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function EndOfService() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "نهاية الخدمة", subtitle: "حاسبة مكافأة نهاية الخدمة وفق نظام العمل السعودي (المواد 74 إلى 85) — جميع أسباب الإنهاء ومواد النظام المقابلة مع تصفية الإجازات والتذاكر",
    chooseEmp: "اختر الموظف", choosePh: "— اختر موظفاً من القائمة —", reason: "سبب الإنهاء", lwd: "تاريخ آخر يوم عمل",
    ticketAmt: "قيمة التذكرة (ريال — اختيارية)", ticketHint: "اتركها فارغة: المخالصة = مكافأة نهاية الخدمة + تصفية الإجازات فقط. أدخل مبلغاً فقط إن رغبت الشركة بإضافة تعويض تذكرة.",
    calc: "احسب المخالصة",
    empInfo: (e) => `الراتب الأساسي: ${formatCurrency(e.base_salary)} • بدل السكن: ${formatCurrency(e.housing_allowance)} • رصيد الإجازات: محسوب تلقائياً (21 يوماً لأول 5 سنوات + 30 يوماً بعدها) • استحقاق التذكرة: ${e.ticket_entitlement === "yearly" ? "سنوي" : e.ticket_entitlement === "biennial" ? "كل سنتين" : "لا يستحق"}`,
    loading: "جارٍ التحميل...", preview: "معاينة المخالصة", savePrint: "حفظ وطباعة", saving: "جارٍ الحفظ...", printOnly: "طباعة فقط",
    savedH: "المخالصات المحفوظة", print: "طباعة",
    note: "نصف شهر عن كل سنة من أول 5 سنوات ثم شهر كامل عن كل سنة بعدها. الاستقالة تُخفض المكافأة حسب المدة (مادة 85). الفصل لأسباب مشروعة (مادة 80) لا يستحق مكافأة. المخالصة تحسب مكافأة نهاية الخدمة + تصفية رصيد الإجازات المتبقي، وقيمة التذكرة مفتوحة (اختيارية) يضيفها المسؤول يدوياً إن رغبت الشركة. تُطبع المخالصة بشعار المنشأة المُعرّف في الإعدادات.",
    eosFlow: "مسار الموافقة: الموارد البشرية ← المالية (تأكيد السداد بإثبات) ← إقفال الموظف نهائياً",
    stDraft: "مسودة", stFin: "بانتظار المالية", stDone: "تم الصرف وإقفال الموظف", stRejected: "مرفوض", stSettled: "مُحوّلة",
    hrApprove: "اعتماد وتحويل للمالية", pay: "تأكيد الصرف + إثبات", reject: "رفض",
    hrDialogTitle: "اعتماد مخالصة — الموارد البشرية", finDialogTitle: "صرف المخالصة — المالية/المحاسبة",
    rejectTitle: "رفض المخالصة", cancel: "إلغاء",
    confirmPay: "تأكيد الصرف النهائي", confirmReject: "تأكيد الرفض",
    noteLabel: "ملاحظات", proof: "إثبات التحويل (صورة/ملف)", proofLink: "إثبات التحويل",
    hrWarn: "عند الاعتماد تُحوّل المخالصة إلى المالية لإثبات السداد ثم الإقفال النهائي.",
    payWarn: "عند التأكيد يُسجّل إثبات التحويل ويُقفل الموظف نهائياً (حالته تُحدّث إلى منتهي/مستقيل).",
    deductionLabel: "مستحقات دائنة (تُخصم)", deductionPh: "بيان الخصم", additionLabel: "مستحقات إضافية (تُضاف للموظف)", additionPh: "بيان الإضافة", settleTotal: "الإجمالي بعد الخصم/الإضافة",
    contractActiveWarn: "عقد هذا الموظف ساري ولم يُفسخ بعد. يمكنك احتساب المخالصة وطباعتها كمسودة فقط. لن يتاح الحفظ والإرسال للمالية إلا بعد فسخ العقد فعلياً في ملف الموظف.",
    contractTerminatedOk: "تم فسخ عقد هذا الموظف. يمكنك حفظ المخالصة وإرسالها للمالية لاعتماد الصرف.",
    draftOnly: "مسودة فقط",
    hrsdRef: "للمطابقة مع الحاسبة الرسمية لوزارة الموارد البشرية والتنمية الاجتماعية (مكتب العمل):",
    hrsdLink: "حاسبة مكافأة نهاية الخدمة — HRSD",
  } : {
    title: "End of service", subtitle: "EOS award calculator per Saudi Labor Law (Art. 74 to 85) — all termination reasons and matching articles, with leave balance and ticket compensation",
    chooseEmp: "Select employee", choosePh: "— pick an employee —", reason: "Termination reason", lwd: "Last working date",
    ticketAmt: "Ticket value (SAR — optional)", ticketHint: "Leave empty: settlement = EOS + leave balance only. Enter an amount only if the company wishes to add ticket compensation.",
    calc: "Calculate settlement",
    empInfo: (e) => `Base: ${formatCurrency(e.base_salary)} • Housing: ${formatCurrency(e.housing_allowance)} • Leave balance: auto-calculated (21 days first 5 years + 30 days after) • Ticket: ${e.ticket_entitlement === "yearly" ? "Yearly" : e.ticket_entitlement === "biennial" ? "Biennial" : "None"}`,
    loading: "Loading...", preview: "Settlement preview", savePrint: "Save & print", saving: "Saving...", printOnly: "Print only",
    savedH: "Saved settlements", print: "Print",
    note: "Half a month per year for the first 5 years, then a full month per year. Resignation reduces the award by tenure (Art. 85). Dismissal for cause (Art. 80) is not entitled. The settlement computes EOS + remaining leave balance; ticket value is open (optional) and added manually by the admin if the company wishes. Printed with the organization logo set in settings.",
    eosFlow: "Approval flow: HR ← Finance (settlement with proof) ← close the employee permanently",
    stDraft: "Draft", stFin: "Awaiting finance", stDone: "Paid & employee closed", stRejected: "Rejected", stSettled: "Transferred",
    hrApprove: "Approve & send to finance", pay: "Confirm settlement + proof", reject: "Reject",
    hrDialogTitle: "Settlement approval — HR", finDialogTitle: "Settlement payout — Finance/Accounting",
    rejectTitle: "Reject settlement", cancel: "Cancel",
    confirmPay: "Confirm final settlement", confirmReject: "Confirm rejection",
    noteLabel: "Notes", proof: "Transfer proof (image/file)", proofLink: "Transfer proof",
    hrWarn: "On approval the settlement moves to finance for payment proof and final closure.",
    payWarn: "On confirmation the transfer proof is recorded and the employee is closed permanently (status set to terminated/resigned).",
    deductionLabel: "Debit dues (deducted)", deductionPh: "Deduction note", additionLabel: "Additional dues (added)", additionPh: "Addition note", settleTotal: "Total after deduction/addition",
    contractActiveWarn: "This employee's contract is still active. You may calculate and print the settlement as a draft only. Saving and sending to finance is locked until the contract is actually terminated in the employee file.",
    contractTerminatedOk: "This employee's contract has been terminated. You can save the settlement and send it to finance for payout approval.",
    draftOnly: "Draft only",
    hrsdRef: "Verify against the official Ministry of HRSD (Labor Office) calculator:",
    hrsdLink: "End-of-Service Benefit Calculator — HRSD",
  };

  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [empId, setEmpId] = useState("");
  const [reason, setReason] = useState("end_of_contract");
  const [lwd, setLwd] = useState(todayISO());
  const [ticketAmount, setTicketAmount] = useState("");
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [settlements, setSettlements] = useState([]);
  const [empLeaves, setEmpLeaves] = useState([]);
  const [me, setMe] = useState(null);
  const [acting, setActing] = useState(null);
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionNote, setDeductionNote] = useState("");
  const [additionAmount, setAdditionAmount] = useState("");
  const [additionNote, setAdditionNote] = useState("");

  const load = async () => {
    setLoading(true);
    const [emps, orgs, sets] = await Promise.all([
      base44.entities.Employee.list("-created_date", 500),
      listCurrentOrg(),
      base44.entities.Settlement.list("-created_date", 50),
    ]);
    setEmployees(emps.filter((e) => e.role_level !== "owner"));
    setOrg(orgs[0]);
    setSettlements(sets);
    try { setMe(await base44.auth.me()); } catch {}
    setLoading(false);
  };
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const e = p.get("emp"), r = p.get("reason"), d = p.get("lwd");
    if (r) setReason(r);
    if (d) setLwd(d);
    if (e) setEmpId(e);
  }, []);
  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (!empId) { setEmpLeaves([]); return; }
    base44.entities.LeaveRequest.filter({ employee_id: empId }, "-created_date", 500)
      .then(setEmpLeaves).catch(() => setEmpLeaves([]));
  }, [empId]);

  const emp = employees.find((e) => e.id === empId);
  // جلب الهوية من الخزنة السعودية للموظف المختار (وضع احتياطي للنمط القديم)
  const [enrichedEmp, setEnrichedEmp] = useState(null);
  useEffect(() => {
    if (!emp) { setEnrichedEmp(null); return; }
    let active = true;
    enrichEmployee(emp).then((e) => { if (active) setEnrichedEmp(e); });
    return () => { active = false; };
  }, [emp?.id]);

  // التحقق من فسخ العقد فعلياً: لا يُسمح بالحفظ أو الإرسال للمالية إلا إذا كان عقد الموظف منتهياً.
  const contractTerminated = !!emp && (
    emp.status === "terminated" || emp.status === "resigned" ||
    (emp.termination_reason && emp.termination_reason !== "none") ||
    !!emp.termination_date
  );

  const liveBalance = emp ? (() => {
    const asOf = lwd ? new Date(lwd) : new Date();
    // رصيد الإجازات يتبع اختيار المنشأة من ملف الموظف (21/30) ويُلزم بـ30 بعد 5 سنوات.
    const ent = computeLeaveEntitlement(emp.hire_date, org, asOf, emp.annual_leave_entitlement);
    // المستخدم الكلي = الرصيد الافتتاحي (prior_used_leave) + المعتمد داخل النظام.
    const used = usedLeaveTotal(emp, empLeaves);
    return { ent, used, remaining: Math.max(0, Math.round((ent - used) * 100) / 100) };
  })() : null;

  const compute = () => {
    if (!emp) return;
    // رصيد الإجازات المتبقي = المستحق (حسب اختيار المنشأة 21/30 من ملف الموظف) − المستخدم الكلي
    const asOf = lwd ? new Date(lwd) : new Date();
    const ent = computeLeaveEntitlement(emp.hire_date, org, asOf, emp.annual_leave_entitlement);
    const used = usedLeaveTotal(emp, empLeaves);
    const remaining = Math.max(0, Math.round((ent - used) * 100) / 100);
    const set = computeSettlement({ employee: emp, org, lastWorkingDate: lwd, reason, ticketAmount, leaveBalance: remaining });
    // الهوية من الخزنة السعودية عند تفعيلها (عبر emp_ref)، أو من الحقل المحلي (النمط القديم)
    const idSrc = enrichedEmp || emp;
    const record = {
      employee_id: emp.id, employee_number: emp.employee_number,
      employee_name: emp.full_name,
      emp_ref: emp.emp_ref || "",
      nationality: emp.nationality || (isSaudiNationalId(idSrc.national_id) ? (isAr ? "سعودي" : "Saudi") : (isAr ? "مقيم" : "Expat")),
      national_id: idSrc.national_id, department: emp.department, position: emp.position, hire_date: emp.hire_date,
      last_working_date: lwd, years_of_service: set.years, reason, reason_note: reasonMeta(reason).note,
      basis: set.basis, monthly_wage: set.monthlyWage, daily_wage: set.dailyWage, fraction_label: set.fractionLabel,
      eos_amount: set.amount, leave_balance_days: set.leaveBalance, leave_cash: set.leaveCash,
      ticket_entitlement: set.ticketEntitlement, ticket_amount: set.ticketAmount,
      total_settlement: set.total_settlement, generated_date: todayISO(), status: "draft",
    };
    setPreview({ ...record, employee_name_full: record.employee_name });
  };

  const saveAndPrint = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      // تفريغ تفاصيل المخالصة الحسّاسة (الأساس/الأجور/النصوص) إلى الخزنة السعودية
      const vaultData = {
        reason_note: preview.reason_note, basis: preview.basis,
        monthly_wage: preview.monthly_wage, daily_wage: preview.daily_wage,
        fraction_label: preview.fraction_label, description: preview.description,
        eos_amount: preview.eos_amount, leave_cash: preview.leave_cash, ticket_amount: preview.ticket_amount,
      };
      const eosRef = await writeRecordToVault(VAULT_MODULES.eos, null, vaultData);
      // تعمية الهوية في Base44 — تُحفظ في الخزنة عبر emp_ref فقط
      const toSave = { ...preview };
      if (toSave.emp_ref) toSave.national_id = "";
      toSave.eos_ref = eosRef || "";
      toSave.basis = eosRef ? "" : preview.basis;
      toSave.reason_note = eosRef ? "" : preview.reason_note;
      toSave.fraction_label = eosRef ? "" : preview.fraction_label;
      toSave.description = eosRef ? "" : preview.description;
      const saved = await base44.entities.Settlement.create(toSave);
      setSettlements((s) => [saved, ...s]);
      // preview يبقى محتوياً على الهوية للطباعة الفورية (من الذاكرة)
      setPreview({ ...preview, id: saved.id });
      setTimeout(() => window.print(), 300);
    } finally { setSaving(false); }
  };
  const reprint = async (rec) => {
    let r = { ...rec };
    // جلب الهوية من الخزنة للمخالصات المُنشأة بعد تفعيل الخزنة (emp_ref بلا لقطة national_id)
    if (rec.emp_ref && !rec.national_id) {
      try { const s = await fetchSensitiveByRef(rec.emp_ref); if (s?.national_id) r.national_id = s.national_id; } catch {}
    }
    // جلب تفاصيل المخالصة الحسّاسة (الأساس/الأجور/النصوص) من الخزنة
    if (rec.eos_ref) {
      try {
        const v = await readRecordFromVault(VAULT_MODULES.eos, rec.eos_ref);
        if (v) {
          for (const k of ["basis", "reason_note", "fraction_label", "description", "monthly_wage", "daily_wage", "eos_amount", "leave_cash", "ticket_amount", "hr_note", "finance_note", "deduction_note", "addition_note"]) {
            if (v[k] !== undefined && v[k] !== null && v[k] !== "") r[k] = v[k];
          }
        }
      } catch {}
    }
    setPreview({ ...r, employee_name_full: r.employee_name });
    setTimeout(() => window.print(), 200);
  };
  const removeSettlement = async (id) => { await base44.entities.Settlement.delete(id); load(); };

  const settBadge = (status) => {
    const map = {
      draft: { label: t.stDraft, cls: "bg-slate-100 text-slate-600" },
      awaiting_finance: { label: t.stFin, cls: "bg-amber-100 text-amber-700" },
      completed: { label: t.stDone, cls: "bg-emerald-100 text-emerald-700" },
      rejected: { label: t.stRejected, cls: "bg-rose-100 text-rose-600" },
      settled: { label: t.stSettled, cls: "bg-blue-100 text-blue-700" },
    };
    return map[status] || { label: status, cls: "bg-slate-100 text-slate-600" };
  };

  const openEosHr = (s) => { setActing({ req: s, action: "eoshr" }); setNote(""); setDeductionAmount(""); setDeductionNote(""); setAdditionAmount(""); setAdditionNote(""); };
  const confirmEosHr = async () => {
    if (!acting) return;
    setBusy(true);
    try {
      const s = acting.req;
      const ded = Math.max(0, Number(deductionAmount) || 0);
      const add = Math.max(0, Number(additionAmount) || 0);
      const baseTotal = (Number(s.eos_amount) || 0) + (Number(s.leave_cash) || 0) + (Number(s.ticket_amount) || 0);
      const total = Math.max(0, baseTotal + add - ded);
      // تحديث السجل الحساس في الخزنة بملاحظات الموارد البشرية والخصومات
      if (s.eos_ref) {
        await writeRecordToVault(VAULT_MODULES.eos, s.eos_ref, {
          hr_note: note, deduction_note: deductionNote, addition_note: additionNote,
          deduction_amount: ded, addition_amount: add, total_settlement: total,
        });
      }
      await base44.entities.Settlement.update(s.id, {
        hr_status: "approved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(),
        hr_note: s.eos_ref ? "" : note,
        deduction_amount: ded, deduction_note: s.eos_ref ? "" : deductionNote,
        addition_amount: add, addition_note: s.eos_ref ? "" : additionNote,
        total_settlement: total,
        status: "awaiting_finance", finance_status: "pending",
      });
      // تنبيه المعتمد المالي ببريد + إشعار داخلي بوجود مخالصة نهاية خدمة بانتظار الصرف
      try {
        await base44.functions.invoke("notifyApprover", {
          type: "settlement", employeeId: s.employee_id, employeeName: s.employee_name, status: "awaiting_finance",
        });
      } catch {}
    } catch (e) {}
    setBusy(false); setActing(null); setNote("");
    setDeductionAmount(""); setDeductionNote(""); setAdditionAmount(""); setAdditionNote("");
    load();
  };

  const openEosFin = (s) => { setActing({ req: s, action: "eosfin" }); setNote(""); setProofFile(null); };
  const confirmEosFin = async () => {
    if (!acting) return;
    setBusy(true);
    let url = "";
    if (proofFile) { const { file_url } = await base44.integrations.Core.UploadFile({ file: proofFile }); url = file_url; }
    try {
      const s = acting.req;
      // تحديث السجل الحساس في الخزنة بملاحظات المالية وإثبات التحويل
      if (s.eos_ref) {
        await writeRecordToVault(VAULT_MODULES.eos, s.eos_ref, {
          finance_note: note, finance_proof_url: url, finance_paid_date: todayISO(),
        });
      }
      await base44.entities.Settlement.update(s.id, {
        finance_status: "paid", finance_id: me?.id, finance_name: me?.full_name,
        finance_paid_date: todayISO(), finance_proof_url: url, finance_proof_date: todayISO(),
        finance_note: s.eos_ref ? "" : note,
        status: "completed",
      });
      if (s.employee_id) {
        const empStatus = s.reason === "resignation" ? "resigned" : "terminated";
        const empReason = s.reason === "probation_dismissal" ? "employer_termination" : s.reason;
        await base44.entities.Employee.update(s.employee_id, {
          status: empStatus, termination_reason: empReason, termination_date: s.last_working_date,
        });
      }
    } catch (e) {}
    setBusy(false); setActing(null); setNote(""); setProofFile(null); load();
  };

  const openEosReject = (s) => { setActing({ req: s, action: "eosreject" }); setNote(""); };
  const confirmEosReject = async () => {
    if (!acting) return;
    setBusy(true);
    try {
      const s = acting.req;
      const stage = s.status === "awaiting_finance" ? "finance" : "hr";
      await base44.entities.Settlement.update(s.id, {
        status: "rejected", [`${stage}_status`]: "rejected", [`${stage}_note`]: note,
      });
    } catch (e) {}
    setBusy(false); setActing(null); setNote(""); load();
  };

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} />

      <div className="text-xs text-muted-foreground bg-slate-50 border border-border rounded-xl px-4 py-3 mb-4 flex items-center gap-2 no-print">
        <Scale size={15} className="shrink-0 text-violet-600" />
        <span>{t.hrsdRef}</span>
        <a href="https://www.hrsd.gov.sa/ministry-services/services/end-service-benefit-calculator" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-700 underline hover:text-violet-800 font-medium">
          {t.hrsdLink} <ExternalLink size={12} />
        </a>
      </div>

      <div className="bg-white rounded-2xl border border-border p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground"><User size={14} /> {t.chooseEmp}</Label>
            <Select value={empId} onValueChange={setEmpId}>
              <SelectTrigger className="w-full"><SelectValue placeholder={t.choosePh} /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name} — {e.national_id || "—"} {e.department ? `(${e.department})` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground"><FileText size={14} /> {t.reason}</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {terminationReasons.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{reasonMeta(r.value).label} <span className="text-muted-foreground">— {reasonMeta(r.value).article}</span></SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">{reasonMeta(reason).article ? `${reasonMeta(reason).article} — ` : ""}{reasonMeta(reason).note}</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground"><CalendarDays size={14} /> {t.lwd}</Label>
            <Input type="date" value={lwd} onChange={(e) => setLwd(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium flex items-center gap-1 text-muted-foreground"><Plane size={14} /> {t.ticketAmt}</Label>
            <Input type="number" dir="ltr" value={ticketAmount} placeholder="0" onChange={(e) => setTicketAmount(e.target.value)} />
            <span className="text-xs text-muted-foreground">{t.ticketHint}</span>
          </div>
          <div className="flex items-end">
            <Button onClick={compute} disabled={!emp} className="w-full gap-2"><Calculator size={18} /> {t.calc}</Button>
          </div>
        </div>

        {emp && (
          <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-3 mb-3 space-y-1">
            <div>{t.empInfo(emp)}</div>
            {liveBalance && (
              <div className="flex items-center gap-1 flex-wrap">
                <span>{isAr ? "رصيد الإجازات المتبقي:" : "Remaining leave balance:"} </span>
                <span className="font-bold text-violet-700">{liveBalance.remaining} {isAr ? "يوم" : "days"}</span>
                {liveBalance.remaining === 0 && (
                  <span className="text-rose-600"> — {isAr ? "لا توجد أيام متبقية — تصفية الإجازات = صفر" : "no days left — leave cash = 0"}</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-10 text-center text-muted-foreground">{t.loading}</div>
      ) : (
        <div className="space-y-5">
          {preview && (
            <div>
              <div className="flex items-center justify-between mb-3 no-print">
                <h3 className="text-sm font-semibold">{t.preview}</h3>
                <div className="flex gap-2">
                  {contractTerminated ? (
                    <Button onClick={saveAndPrint} disabled={saving} className="gap-2"><Save size={16} /> {saving ? t.saving : t.savePrint}</Button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200"><AlertTriangle size={13} /> {t.draftOnly}</span>
                  )}
                  <Button variant="outline" onClick={() => window.print()} className="gap-2"><Printer size={16} /> {t.printOnly}</Button>
                </div>
              </div>
              {contractTerminated ? (
                <div className="mb-3 no-print text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex gap-2">
                  <Check size={16} className="shrink-0" />
                  <span>{t.contractTerminatedOk}</span>
                </div>
              ) : (
                <div className="mb-3 no-print text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                  <AlertTriangle size={16} className="shrink-0" />
                  <span>{t.contractActiveWarn}</span>
                </div>
              )}
              <div className="border border-border rounded-2xl p-6 bg-white"><SettlementSheet record={preview} org={org} /></div>
            </div>
          )}

          {settlements.length > 0 && (
            <div>
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3 mb-3 no-print">{t.eosFlow}</div>
              <h3 className="text-sm font-semibold mb-3 no-print">{t.savedH}</h3>
              <div className="space-y-2 no-print">
                {settlements.map((s) => {
                  const b = settBadge(s.status);
                  return (
                    <div key={s.id} className="bg-white rounded-xl border border-border p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-medium text-sm">{s.employee_name}</div>
                          <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{s.national_id || "—"}</div>
                          <div className="text-xs text-muted-foreground">{s.last_working_date} • {reasonMeta(s.reason).label} • {formatCurrency(s.total_settlement)}</div>
                          {s.prepared_by_name && <div className="text-[11px] text-violet-700">{isAr ? "أُعدّت بواسطة" : "Prepared by"}: {s.prepared_by_name}{s.prepared_by_id ? ` — ${s.prepared_by_id}` : ""}</div>}
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", b.cls)}>{b.label}</span>
                            {s.hr_name && <span className="text-xs text-muted-foreground">{s.hr_name} • {s.hr_date}</span>}
                            {s.finance_proof_url && <a href={s.finance_proof_url} target="_blank" rel="noreferrer" className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{isAr ? t.proofLink : t.proofLink}</a>}
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0 flex-wrap justify-end">
                          <Button size="sm" variant="outline" onClick={() => reprint(s)} className="gap-1 h-7"><Printer size={14} /> {t.print}</Button>
                          {s.status === "draft" && (
                            <>
                              <Button size="sm" onClick={() => openEosHr(s)} className="gap-1 h-7 bg-violet-600 hover:bg-violet-700"><Send size={13} /> {t.hrApprove}</Button>
                              <Button size="sm" variant="ghost" onClick={() => openEosReject(s)} className="h-7 text-rose-500">{t.reject}</Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-2 no-print">
            <AlertTriangle size={16} className="shrink-0 text-amber-600" />
            <span>{t.note}</span>
          </div>
        </div>
      )}

      <Dialog open={acting?.action === "eoshr"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.hrDialogTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{acting.req.employee_name} <span className="text-xs tabular-nums" dir="ltr">· {acting.req.national_id || "—"}</span> • {formatCurrency(acting.req.total_settlement)}</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.noteLabel}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.deductionLabel}</Label>
                  <Input type="number" dir="ltr" value={deductionAmount} placeholder="0" onChange={(e) => setDeductionAmount(e.target.value)} />
                  <Input value={deductionNote} placeholder={t.deductionPh} onChange={(e) => setDeductionNote(e.target.value)} className="text-xs" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{t.additionLabel}</Label>
                  <Input type="number" dir="ltr" value={additionAmount} placeholder="0" onChange={(e) => setAdditionAmount(e.target.value)} />
                  <Input value={additionNote} placeholder={t.additionPh} onChange={(e) => setAdditionNote(e.target.value)} className="text-xs" />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">{t.settleTotal}: <b className="text-foreground">{formatCurrency(Math.max(0, (Number(acting.req.total_settlement) || 0) + (Number(additionAmount) || 0) - (Number(deductionAmount) || 0)))}</b></div>
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3">{t.hrWarn}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmEosHr} disabled={busy} className="gap-1 bg-violet-600 hover:bg-violet-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.hrApprove}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "eosfin"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.finDialogTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{acting.req.employee_name} <span className="text-xs tabular-nums" dir="ltr">· {acting.req.national_id || "—"}</span> • {formatCurrency(acting.req.total_settlement)}</div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.noteLabel}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.proof}</Label>
                <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0])} />
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{t.payWarn}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmEosFin} disabled={busy} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.confirmPay}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "eosreject"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-3">
              <Label className="text-xs font-medium text-muted-foreground">{t.noteLabel}</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button variant="destructive" onClick={confirmEosReject} disabled={busy} className="gap-1">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} {t.confirmReject}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}