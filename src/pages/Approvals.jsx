import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { ClipboardCheck, Check, X, Loader2, Search, Download, RefreshCw, Wallet, Plane } from "lucide-react";
import { cn, safeHref } from "@/lib/utils";
import { leaveTypeLabel, formatCurrency, todayISO } from "@/lib/hr";
import { badge, leaveTicketAmount, needsFinance } from "@/lib/approvals";
import { getEmployeeAnnualDays, computeLeaveEntitlement, usedLeaveTotal } from "@/lib/leaveBalance";
import { useI18n } from "@/lib/i18n";
import { generateLeaveSettlement, generateLoanStatement, generateBusinessTripApproval } from "@/lib/docGenerators";
import PullToRefresh from "@/components/PullToRefresh";
import VaultDocLink from "@/components/VaultDocLink";
import { uploadFileToVault } from "@/lib/vaultDocuments";
import { enrichRecordsWithVault, VAULT_MODULES } from "@/lib/vaultGeneric";

export default function Approvals() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "الموافقات والطلبات", subtitle: "مسار الاعتماد: المدير المباشر ← الموارد البشرية ← المالية ← السداد بإثبات",
    loading: "جارٍ التحميل...", tabLeaves: (n) => `الإجازات (${n})`, tabLoans: (n) => `السلف (${n})`,
    searchPh: "ابحث برقم هوية الموظف لعرض كل طلباته…",
    mgrApprove: "موافقة المدير", hrApprove: "موافقة الموارد البشرية", reject: "رفض", pay: "تأكيد الصرف",
    fullClear: "تصفية كاملة", ticket: (v) => `تذكرة: ${formatCurrency(v)}`, deduct: (n) => `خصم رصيد: ${n} يوم`,
    loan: "سلفة", days: (s, e, n) => `${s} ← ${e} · ${n} يوم`, loanLine: (v, r) => `${formatCurrency(v)} · ${r}`,
    settlement: "المخالصة", genSettlement: "توليد المخالصة",
    statement: "كشف السلفة", genStatement: "توليد الكشف",
    loanPayBtn: "سداد جزئي", loanPayTitle: "تسجيل سداد السلفة — الموارد البشرية",
    paidLabel: "مبلغ السداد هذه المرة (ر.س)", paidHint: "يُسجّل مدير الموارد البشرية المبالغ التي استلمها من الموظف لسداد السلفة. يُضاف هذا المبلغ إلى المسدَّد مسبقاً ويُحدّث المتبقي، وعند بلوغ إجمالي السلفة تُغلق تلقائياً (الحالة: مغلقة) ويتحدّث كشف السلفة فوراً ليعكس نفس الوضع كما هو في سجل الموارد البشرية — المسدد = قيمة السلفة والمتبقي 0.", alreadyPaidLabel: "تم سداد مسبقاً",
    remaining: "المتبقي", totalLoan: "إجمالي السلفة", save: "حفظ",
    empty: "لا توجد طلبات", rejectTitle: "رفض الطلب", rejectReason: "سبب الرفض", cancel: "إلغاء", confirmReject: "تأكيد الرفض",
    payTitle: "تأكيد الصرف — المالية/المحاسبة", leavePay: (v) => <>تصفية إجازة كاملة — تعويض التذكرة: <b className="text-foreground">{formatCurrency(v)}</b></>,
    loanPay: (v) => <>سلفة بقيمة <b className="text-foreground">{formatCurrency(v)}</b></>, proof: "إثبات التحويل (صورة)",
    payNoteL: "عند التأكيد تُقفل العملية ويُسجّل إثبات التحويل. ويُحدّث آخر استخدام للتذكرة.",
    payNote: "عند التأكيد تُقفل العملية ويُسجّل إثبات التحويل.", confirmPay: "تأكيد الصرف",
    tabTrips: (n) => `الانتدابات (${n})`, hrTripApprove: "اعتماد الموارد البشرية", tripReject: "رفض",
    tripApproveTitle: "اعتماد انتداب — إدارة الموارد البشرية", tripNote: "ملاحظات/وصف الموارد البشرية",
    tripNotePh: "متى السفر والعودة، ترتيبات التذاكر/الفندق، التكلفة، …. تُسجّل على الطلب وتظهر في المستند.",
    tripDoc: "مستندات إضافية (سداد/حجوزات)", tripRejectTitle: "رفض انتداب",
    tripPayNote: "عند الاعتماد يُولّد مستند الموافقة آلياً ويُحفظ في ملف الموظف.", tripApproveBtn: "اعتماد وتوليد المستند",
    tripExt: "خارجية", tripInt: "داخلية", tripCost: (c) => `التكلفة: ${formatCurrency(c)}`, tripDocBtn: "مستند الانتداب",
    tripLine: (d, p) => d ? `${d} — ${p}` : "—",
    leaveHrTitle: "احتساب التصفية ومراجعة الإجازة", leaveHrNote: "ملاحظات الموارد البشرية",
    leaveHrNotePh: "حجز تذاكر الطيران، تأكيد التواريخ، …. تُسجّل على الطلب وتظهر في المخالصة ومسار الطلب.",
    leaveHrDoc: "مرفقات الموارد البشرية (تذاكر طيران/حجوزات)", leaveHrBtn: "احتساب وحفظ كمسودة",
    leaveHrWarn: "عند الحفظ يُحسب تعويض التذكرة/التصفية ويُولّد مستند المخالصة (PDF) للمعاينة والطباعة لأخذ الموافقة الورقية أولاً. يُحفظ الطلب كمسودة ولن يُحوّل للمالية حتى تعتمده لاحقاً من القائمة.",
    forwardBtn: "اعتماد وتحويل للمالية", printSettle: "معاينة/طباعة المخالصة",
    deductionLabel: "مستحقات دائنة (تُخصم)", deductionPh: "بيان الخصم",
    additionLabel: "مستحقات إضافية (تُضاف للموظف)", additionPh: "بيان الإضافة", settleTotal: "إجمالي التصفية المتوقع",
    entitledLabel: "إجمالي المستحق", usedLabel: "المستخدم", remainingLabel: "المتبقي",
    grantedLabel: "الأيام الممنوحة", dailyWageLabel: "الأجر اليومي (راتب ÷ 30)", grantedHint: "عدد الأيام التي تعتمدها لهذه الإجازة",
    loanHrTitle: "اعتماد السلفة — الموارد البشرية", loanAmountL: "مبلغ السلفة (ر.س)", loanInstL: "عدد الأقساط",
    loanHrWarn: "عند الاعتماد يُحدّث المبلغ/الأقساط ويُحوّل الطلب للمالية للصرف. يبقى نشطاً حتى يكتمل السداد لاحقاً.", loanHrBtn: "اعتماد وتحويل للمالية",
    finNote: "ملاحظات/وصف المالية", finNotePh: "تحويل بنكي / سند توقيع / …. يُسجّل على الطلب.",
    tripFinTitle: "صرف الانتداب — المالية/المحاسبة", tripFinWarn: "عند التأكيد تُقفل العملية ويُسجّل إثبات التحويل ويصبح الطلب مكتملًا.",
    finProof: "إثبات التحويل",
  } : {
    title: "Approvals & Requests", subtitle: "Approval flow: Direct manager ← HR ← Finance ← Settlement with proof",
    loading: "Loading...", tabLeaves: (n) => `Leaves (${n})`, tabLoans: (n) => `Loans (${n})`,
    searchPh: "Search by employee national ID to show all requests…",
    mgrApprove: "Manager approve", hrApprove: "HR approve", reject: "Reject", pay: "Confirm payment",
    fullClear: "Full clearance", ticket: (v) => `Ticket: ${formatCurrency(v)}`, deduct: (n) => `Balance deducted: ${n} days`,
    loan: "Loan", days: (s, e, n) => `${s} ← ${e} · ${n} days`, loanLine: (v, r) => `${formatCurrency(v)} · ${r}`,
    settlement: "Settlement", genSettlement: "Generate settlement",
    statement: "Loan statement", genStatement: "Generate statement",
    loanPayBtn: "Partial payment", loanPayTitle: "Record loan payment — HR",
    paidLabel: "This payment (SAR)", paidHint: "HR records amounts received from the employee. This adds to what's already paid and updates the remaining balance. When it reaches the loan total it closes automatically and the statement refreshes instantly.", alreadyPaidLabel: "Already paid",
    remaining: "Remaining", totalLoan: "Loan total", save: "Save",
    empty: "No requests", rejectTitle: "Reject request", rejectReason: "Rejection reason", cancel: "Cancel", confirmReject: "Confirm rejection",
    payTitle: "Confirm payment — Finance/Accounting", leavePay: (v) => <>Full leave clearance — ticket compensation: <b className="text-foreground">{formatCurrency(v)}</b></>,
    loanPay: (v) => <>Loan of <b className="text-foreground">{formatCurrency(v)}</b></>, proof: "Transfer proof (image)",
    payNoteL: "On confirmation the process closes and the transfer proof is recorded. Last ticket usage is updated.",
    payNote: "On confirmation the process closes and the transfer proof is recorded.", confirmPay: "Confirm payment",
    tabTrips: (n) => `Trips (${n})`, hrTripApprove: "HR approve", tripReject: "Reject",
    tripApproveTitle: "Trip approval — HR", tripNote: "HR notes/description",
    tripNotePh: "Travel/return dates, ticket/hotel arrangements, cost, …. Recorded on the request and shown in the document.",
    tripDoc: "Additional documents (payment/bookings)", tripRejectTitle: "Reject trip",
    tripPayNote: "On approval the approval document is generated automatically and saved to the employee file.", tripApproveBtn: "Approve & generate doc",
    tripExt: "External", tripInt: "Internal", tripCost: (c) => `Cost: ${formatCurrency(c)}`, tripDocBtn: "Trip doc",
    tripLine: (d, p) => d ? `${d} — ${p}` : "—",
    leaveHrTitle: "Leave review & settlement preview", leaveHrNote: "HR notes",
    leaveHrNotePh: "Flight tickets booking, confirm dates, …. Recorded on the request and shown in the clearance.",
    leaveHrDoc: "HR attachments (tickets/bookings)", leaveHrBtn: "Calculate & save as draft",
    leaveHrWarn: "On save the ticket/settlement is calculated and a clearance PDF is generated for preview/print to get the paper approval first. The request is saved as draft and won't be sent to finance until you approve it later.",
    forwardBtn: "Approve & forward to finance", printSettle: "Preview/print settlement",
    deductionLabel: "Debit dues (deducted)", deductionPh: "Deduction note",
    additionLabel: "Additional dues (added)", additionPh: "Addition note", settleTotal: "Expected settlement total",
    entitledLabel: "Total entitled", usedLabel: "Used", remainingLabel: "Remaining",
    grantedLabel: "Granted days", dailyWageLabel: "Daily wage (salary ÷ 30)", grantedHint: "Days to grant for this leave",
    loanHrTitle: "Loan approval — HR", loanAmountL: "Loan amount (SAR)", loanInstL: "Installments",
    loanHrWarn: "On approval the amount/installments update and the request moves to finance for disbursement. It stays active until fully repaid.", loanHrBtn: "Approve & forward to finance",
    finNote: "Finance notes/description", finNotePh: "Bank transfer / receipt / …. Recorded on the request.",
    tripFinTitle: "Trip payout — Finance/Accounting", tripFinWarn: "On confirmation the process closes, the transfer proof is recorded and the request is completed.",
    finProof: "Transfer proof",
  };

  const [leaves, setLeaves] = useState([]);
  const [loans, setLoans] = useState([]);
  const [trips, setTrips] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [org, setOrg] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(null);
  const [note, setNote] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");
  const [loanPayAmount, setLoanPayAmount] = useState("");
  const [genBusy, setGenBusy] = useState(null);
  const [deductionAmount, setDeductionAmount] = useState("");
  const [deductionNote, setDeductionNote] = useState("");
  const [additionAmount, setAdditionAmount] = useState("");
  const [additionNote, setAdditionNote] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [loanInstallments, setLoanInstallments] = useState("");
  // عدد الأيام التي اعتمدتها الموارد البشرية — يتيح الموافقة على جزء من الأيام فقط وخصمها من الرصيد.
  const [grantedDays, setGrantedDays] = useState("");

  const load = async () => {
    setLoading(true);
    const [lv, ln, tr, emps, orgs] = await Promise.all([
      base44.entities.LeaveRequest.list("-created_date", 500),
      base44.entities.LoanRequest.list("-created_date", 500),
      base44.entities.BusinessTrip.list("-created_date", 500),
      base44.entities.Employee.list("-created_date", 500),
      listCurrentOrg(),
    ]);
    // جلب النصوص الحسّاسة من الخزنة (سبب الإجازة / غرض الرحلة / الملاحظات) ودمجها للعرض
    const [lvEnriched, trEnriched] = await Promise.all([
      enrichRecordsWithVault(lv, VAULT_MODULES.leaves, "leave_ref", ["reason", "manager_note", "hr_note", "finance_note"]),
      enrichRecordsWithVault(tr, VAULT_MODULES.businessTrips, "trip_ref", ["purpose", "employee_note", "notes", "hr_note", "finance_note"]),
    ]);
    setLeaves(lvEnriched); setLoans(ln); setTrips(trEnriched); setEmployees(emps); setOrg(orgs[0]);
    try { setMe(await base44.auth.me()); } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const empOf = (id) => employees.find((e) => e.id === id);
  const myEmployee = employees.find((e) => e.user_id && e.user_id === me?.id) || null;
  const isAdmin = me?.role === "admin";
  const isHR = isAdmin || !!myEmployee?.is_approver_hr;
  const isFinance = !!myEmployee?.is_approver_finance; // تأكيد الصرف حصري لمعتمد المالية فقط — الأدمن لا يكسر الفصل
  // المدير المباشر حصراً: لا يُمنح الأدمن/الموارد البشرية صلاحية اعتماد مرحلة المدير المباشر.
  const isManager = !!myEmployee?.is_approver_manager;
  const isManagerOf = (r) => isManager && !!r.manager_id && r.manager_id === myEmployee?.id;

  // فلترة بالهوية الوطنية
  const query = q.trim();
  const matchedIds = query
    ? new Set(employees.filter((e) => (e.national_id || "").replace(/\s/g, "").includes(query.replace(/\s/g, ""))).map((e) => e.id))
    : null;
  const visLeaves = matchedIds ? leaves.filter((l) => matchedIds.has(l.employee_id)) : leaves;
  const visLoans = matchedIds ? loans.filter((l) => matchedIds.has(l.employee_id)) : loans;
  const visTrips = matchedIds ? trips.filter((l) => matchedIds.has(l.employee_id)) : trips;

  const actionsFor = (type, r) => {
    const s = r.status;
    if (type === "trips") {
      const tb = [];
      // الموارد البشرية لا تعتمد الانتداب إلا بعد موافقة المدير المباشر.
      if ((s === "pending_manager" || s === "pending" || s === "draft") && isManagerOf(r)) {
        tb.push({ label: t.mgrApprove, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove(type, r) });
        tb.push({ label: t.tripReject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openTripReject(r) });
      } else if (s === "manager_approved" && isHR) {
        tb.push({ label: t.hrTripApprove, cls: "bg-violet-600 hover:bg-violet-700", onClick: () => openTripApprove(r) });
        tb.push({ label: t.tripReject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openTripReject(r) });
      } else if (s === "awaiting_finance" && isFinance) {
        tb.push({ label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openTripFinance(r) });
      }
      if (r.approval_pdf_url) tb.push({ label: t.tripDocBtn, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", docRef: r.approval_pdf_url, icon: "download" });
      if (r.finance_proof_url) tb.push({ label: t.finProof, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", docRef: r.finance_proof_url, icon: "download" });
      return tb;
    }

    // السلف: تمرّ بالمدير المباشر ← الموارد البشرية ← المالية
    // الموارد البشرية لا تعتمد السلفة إلا بعد موافقة المدير المباشر.
    if (type === "loans") {
      const btns = [];
      if ((s === "pending_manager" || s === "pending") && isManagerOf(r)) {
        btns.push({ label: t.mgrApprove, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove(type, r) });
        btns.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("loans", r, "manager") });
      } else if (s === "manager_approved" && isHR) {
        btns.push({ label: t.hrApprove, cls: "bg-violet-600 hover:bg-violet-700", onClick: () => openLoanHr(r) });
        btns.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject("loans", r, "hr") });
      } else if ((s === "awaiting_finance" || s === "hr_approved") && isFinance) {
        btns.push({ label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openFinance("loans", r) });
      }
      const closed = (Number(r.amount) || 0) > 0 && (Number(r.paid_amount) || 0) >= (Number(r.amount) || 0);
      if (s === "paid" && !closed && isHR) btns.push({ label: t.loanPayBtn, cls: "bg-amber-100 text-amber-700 hover:bg-amber-200", onClick: () => openLoanPay(r) });
      if (r.statement_pdf_url) {
        btns.push({ label: t.statement, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", docRef: r.statement_pdf_url, icon: "download" });
      } else {
        btns.push({ label: t.genStatement, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", onClick: () => makeLoanStatement(r), icon: "refresh", busyKey: "loan" + r.id });
      }
      return btns;
    }

    // الإجازات: المدير المباشر ← الموارد البشرية ← المالية
    // الموارد البشرية لا تتصرف على الطلب إلا بعد موافقة المدير المباشر (manager_approved).
    const btns = [];
    if ((s === "pending_manager" || s === "pending") && isManagerOf(r)) {
      btns.push({ label: t.mgrApprove, cls: "bg-emerald-600 hover:bg-emerald-700", onClick: () => managerApprove(type, r) });
      btns.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject(type, r, "manager") });
    } else if (s === "manager_approved" && isHR) {
      if (needsFinance(r, empOf(r.employee_id), org)) {
        btns.push({ label: t.leaveHrBtn, cls: "bg-violet-600 hover:bg-violet-700", onClick: () => openLeaveHr(r) });
      } else {
        btns.push({ label: isAr ? "اعتماد وإكمال" : "Approve & complete", cls: "bg-violet-600 hover:bg-violet-700", onClick: () => hrCompleteLeave(r) });
      }
      btns.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject(type, r, "hr") });
    } else if (s === "hr_settled" && isHR) {
      btns.push({ label: t.forwardBtn, cls: "bg-violet-600 hover:bg-violet-700", onClick: () => forwardToFinance(r) });
      btns.push({ label: t.reject, cls: "bg-rose-50 text-rose-600 hover:bg-rose-100", onClick: () => openReject(type, r, "hr") });
    } else if ((s === "awaiting_finance" || s === "hr_approved") && isFinance) {
      btns.push({ label: t.pay, cls: "bg-blue-600 hover:bg-blue-700", onClick: () => openFinance(type, r) });
    }

    if (r.settlement_pdf_url) {
      btns.push({ label: t.printSettle, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", docRef: r.settlement_pdf_url, icon: "download" });
    } else if (s === "completed" || s === "paid") {
      btns.push({ label: t.genSettlement, cls: "bg-slate-100 text-slate-700 hover:bg-slate-200", onClick: () => makeSettlement(r), icon: "refresh", busyKey: "l" + r.id });
    }
    return btns;
  };

  const managerApprove = async (type, r) => {
    await update(type, r.id, { manager_status: "approved", manager_id: me?.id, manager_name: me?.full_name, manager_date: todayISO(), status: "manager_approved" });
    // تنبيه الموارد البشرية بوجود طلب انتقل لمرحلة اعتمادها
    try { await base44.functions.invoke("notifyApprover", { type: type === "leaves" ? "leave" : type === "trips" ? "trip" : "loan", employeeId: r.employee_id, employeeName: r.employee_name, status: "manager_approved" }); } catch (e) {}
    load();
  };
  const hrApprove = async (type, r) => {
    if (type === "leaves") {
      const emp = empOf(r.employee_id);
      const balance = Number(emp?.leave_balance) || 0;
      const deduct = Math.min(r.days_count, balance);
      const fin = needsFinance(r, emp, org);
      const ticket = fin ? leaveTicketAmount(emp, org) : 0;
      // جميع أنواع الإجازات تنتقل لبانتظار المالية — لا تكتمل إلا بعد اعتماد معتمد المالية.
      const finalStatus = "awaiting_finance";
      const patchL = {
        hr_status: "approved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(),
        balance_deducted: deduct, ticket_amount: ticket, settlement_amount: ticket,
        status: finalStatus, finance_status: "pending",
      };
      setLeaves((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patchL } : x)));
      await base44.entities.LeaveRequest.update(r.id, patchL);
      if (emp) {
        await base44.entities.Employee.update(emp.id, { leave_balance: Math.max(0, balance - deduct), status: "on_leave" });
      }
      if (!fin) { try { await generateLeaveSettlement(r, empOf(r.employee_id), org, leaves); } catch (e) {} }
      // تنبيه المالية بوجود إجازة بانتظار الصرف
      try { await base44.functions.invoke("notifyApprover", { type: "leave", employeeId: r.employee_id, employeeName: r.employee_name, status: "awaiting_finance" }); } catch (e) {}
    } else {
      const patchLoan = { hr_status: "approved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(), status: "awaiting_finance" };
      setLoans((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patchLoan } : x)));
      await base44.entities.LoanRequest.update(r.id, patchLoan);
      // تنبيه المالية بوجود سلفة بانتظار الصرف
      try { await base44.functions.invoke("notifyApprover", { type: "loan", employeeId: r.employee_id, employeeName: r.employee_name, status: "awaiting_finance" }); } catch (e) {}
    }
    load();
  };
  const openLeaveHr = (r) => { setActing({ type: "leaves", req: r, action: "leavehr" }); setNote(""); setProofFile(null); setDeductionAmount(""); setDeductionNote(""); setAdditionAmount(""); setAdditionNote(""); setGrantedDays(String(r.days_count || 0)); };
  const confirmLeaveHr = async () => {
    if (!acting) return;
    setBusy(true);
    let url = "";
    if (proofFile) { url = await uploadFileToVault(proofFile, { empRef: empOf(acting.req.employee_id)?.emp_ref || null, docType: "attachment" }) || ""; }
    try {
      const r = acting.req;
      const emp = empOf(r.employee_id);
      // مصدر واحد للحقيقة: الإجمالي المستحق تراكمياً + المستخدم من طلبات الإجازة السنوية
      // المعتمدة الأخرى — مطابق لما يعرضه ملف الموظف والمخالصة (بلا تضاعف عبر prior_used_leave).
      const asOf = r.start_date ? new Date(r.start_date) : new Date();
      const entitled = computeLeaveEntitlement(emp?.hire_date, org, asOf);
      // المستخدم الكلي (غير مشمول هذا الطلب) = الرصيد الافتتاحي + المعتمد داخل النظام.
      const otherUsed = usedLeaveTotal(emp, (leaves || []).filter((l) => l.id !== r.id && l.employee_id === r.employee_id));
      const before = Math.max(0, Math.round((entitled - otherUsed) * 10) / 10);
      // الموارد البشرية قد تعتمد جزءاً من الأيام المطلوبة فقط — ما يُخصم من الرصيد هو ما اعتمدته.
      const requested = Math.max(0, Number(r.days_count) || 0);
      const gr = Number(grantedDays);
      const granted = Math.max(0, Math.min(Number.isFinite(gr) && gr > 0 ? gr : requested, requested));
      const after = Math.max(0, Math.round((before - granted) * 10) / 10);
      const mw = (Number(emp?.base_salary) || 0) + (Number(emp?.housing_allowance) || 0) + (Number(emp?.transport_allowance) || 0) + (Number(emp?.other_allowances) || 0);
      const dailyWage = mw / 30;
      const ticket = r.is_full_clearance ? leaveTicketAmount(emp, org) : 0;
      const base = (r.leave_type === "annual" || r.is_full_clearance) ? Math.round(granted * dailyWage * 100) / 100 : 0;
      const ded = Math.max(0, Number(deductionAmount) || 0);
      const add = Math.max(0, Number(additionAmount) || 0);
      const total = Math.max(0, base + ticket + add - ded);
      const patch = {
        hr_status: "settled", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(),
        hr_note: note, hr_document_url: url,
        balance_before: before, balance_after: after, balance_deducted: granted,
        ticket_amount: ticket,
        deduction_amount: ded, deduction_note: deductionNote,
        addition_amount: add, addition_note: additionNote,
        settlement_amount: total, status: "hr_settled",
      };
      setLeaves((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patch } : x)));
      await base44.entities.LeaveRequest.update(r.id, patch);
      try { await generateLeaveSettlement({ ...r, ...patch }, emp, org, leaves); } catch (e) {}
    } catch (e) { load(); }
    setBusy(false); setActing(null); setNote(""); setProofFile(null);
    setDeductionAmount(""); setDeductionNote(""); setAdditionAmount(""); setAdditionNote("");
    load();
  };
  const forwardToFinance = async (r) => {
    try {
      const emp = empOf(r.employee_id);
      const consume = (r.leave_type === "annual" || r.is_full_clearance);
      const granted = consume ? (Number(r.balance_deducted) || 0) : 0;
      // المستخدم الكلي (غير مشمول هذا الطلب) = الرصيد الافتتاحي + المعتمد داخل النظام.
      const otherUsed = usedLeaveTotal(emp, (leaves || []).filter((l) => l.id !== r.id && l.employee_id === r.employee_id));
      const totalUsed = otherUsed + granted;
      const entitled = computeLeaveEntitlement(emp?.hire_date, org);
      // جميع الإجازات تنتقل لبانتظار المالية بعد اعتماد الموارد البشرية — لا تكتمل إلا باعتماد المالية.
      const patchFin = { hr_status: "approved", status: "awaiting_finance", finance_status: "pending" };
      setLeaves((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patchFin } : x)));
      await base44.entities.LeaveRequest.update(r.id, patchFin);
      // تنبيه المالية بوجود إجازة بانتظار الصرف
      try { await base44.functions.invoke("notifyApprover", { type: "leave", employeeId: r.employee_id, employeeName: r.employee_name, status: "awaiting_finance" }); } catch (e) {}
      if (emp) {
        await base44.entities.Employee.update(emp.id, {
          leave_balance: Math.max(0, Math.round((entitled - totalUsed) * 10) / 10),
          status: "on_leave",
        });
      }
    } catch (e) {}
    load();
  };
  // إكمال الإجازات غير المالية (مرضية / بدون راتب / استئذان) — تكتمل عند اعتماد الموارد البشرية دون مرور بالمالية.
  const hrCompleteLeave = async (r) => {
    try {
      const emp = empOf(r.employee_id);
      const patchDone = {
        hr_status: "approved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(),
        hr_note: note || "", finance_status: "pending",
        status: "completed",
      };
      setLeaves((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...patchDone } : x)));
      await base44.entities.LeaveRequest.update(r.id, patchDone);
      if (r.leave_type === "permission" && emp) {
        // الاستئذان لا يغيّر حالة الموظف الوظيفية ولا يخصم رصيد الإجازات
      }
    } catch (e) {}
    setNote(""); load();
  };
  const openReject = (type, r, stage) => { setActing({ type, req: r, action: "reject", stage }); setNote(""); };
  const reject = async () => {
    if (!acting) return;
    const { type, req, stage } = acting;
    const patch = { status: "rejected", [`${stage}_status`]: "rejected", [`${stage}_note`]: note };
    await update(type, req.id, patch);
    setActing(null); setNote(""); load();
  };
  const openFinance = (type, r) => {
    setActing({ type, req: r, action: "finance" }); setProofFile(null); setNote("");
    if (type === "loans") { setLoanAmount(String(r.amount || "")); setLoanInstallments(String(r.installment_count || 1)); }
  };
  const confirmFinance = async () => {
    if (!acting) return;
    setBusy(true);
    let url = "";
    if (proofFile) { url = await uploadFileToVault(proofFile, { empRef: empOf(acting.req.employee_id)?.emp_ref || null, docType: "attachment" }) || ""; }
    const isLoan = acting.type === "loans";
    const patch = {
      finance_status: "paid", finance_paid_date: todayISO(), finance_proof_url: url,
      finance_proof_date: todayISO(), finance_note: note,
      status: isLoan ? "paid" : "completed",
    };
    if (isLoan) patch.paid_amount = Number(acting.req.paid_amount) || 0;
    await update(acting.type, acting.req.id, patch);
    if (isLoan) { try { await generateLoanStatement({ ...acting.req, ...patch }, empOf(acting.req.employee_id), org); } catch (e) {} }
    if (acting.type === "leaves" && acting.req.ticket_amount > 0) {
      const emp = empOf(acting.req.employee_id);
      if (emp) await base44.entities.Employee.update(emp.id, { ticket_last_used_year: new Date().getFullYear() });
    }
    if (acting.type === "leaves") { try { await generateLeaveSettlement(acting.req, empOf(acting.req.employee_id), org, leaves); } catch (e) {} }
    setBusy(false); setActing(null); setNote(""); setProofFile(null); setLoanAmount(""); setLoanInstallments(""); load();
  };
  // Optimistic UI: patch local state instantly, then persist; rollback via reload on error.
  const update = async (type, id, patch) => {
    const setter = type === "leaves" ? setLeaves : type === "trips" ? setTrips : setLoans;
    setter((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    try {
      if (type === "leaves") await base44.entities.LeaveRequest.update(id, patch);
      else if (type === "trips") await base44.entities.BusinessTrip.update(id, patch);
      else await base44.entities.LoanRequest.update(id, patch);
    } catch (e) {
      load(); // rollback to server truth
    }
  };

  const makeSettlement = async (r) => {
    setGenBusy("l" + r.id);
    try { await generateLeaveSettlement(r, empOf(r.employee_id), org, leaves); } catch (e) {}
    finally { setGenBusy(null); load(); }
  };
  const makeLoanStatement = async (r) => {
    setGenBusy("loan" + r.id);
    try { await generateLoanStatement(r, empOf(r.employee_id), org); } catch (e) {}
    finally { setGenBusy(null); load(); }
  };
  const openLoanHr = (r) => { setActing({ type: "loans", req: r, action: "loanhr" }); setNote(""); setLoanAmount(String(r.amount || "")); setLoanInstallments(String(r.installment_count || 1)); };
  const confirmLoanHr = async () => {
    if (!acting) return;
    setBusy(true);
    try {
      const req = acting.req;
      const amt = Math.max(0, Number(loanAmount) || 0);
      const inst = Math.max(1, Number(loanInstallments) || 1);
      const patchLh = {
        hr_status: "approved", hr_id: me?.id, hr_name: me?.full_name, hr_date: todayISO(), hr_note: note,
        requested_amount: Number(req.requested_amount) || Number(req.amount) || 0,
        requested_installments: Number(req.requested_installments) || Number(req.installment_count) || 1,
        amount: amt, installment_count: inst,
        monthly_installment: amt ? Math.round((amt / inst) * 100) / 100 : 0,
        request_date: req.request_date || (req.created_date || "").slice(0, 10),
        status: "awaiting_finance",
      };
      setLoans((prev) => prev.map((x) => (x.id === req.id ? { ...x, ...patchLh } : x)));
      await base44.entities.LoanRequest.update(req.id, patchLh);
      try { await generateLoanStatement({ ...req, ...patchLh }, empOf(req.employee_id), org); } catch (e) {}
      // تنبيه المالية بوجود سلفة بانتظار الصرف
      try { await base44.functions.invoke("notifyApprover", { type: "loan", employeeId: req.employee_id, employeeName: req.employee_name, status: "awaiting_finance" }); } catch (e) {}
    } catch (e) { load(); }
    setBusy(false); setActing(null); setNote(""); load();
  };
  const openLoanPay = (r) => { setActing({ type: "loans", req: r, action: "loanpay" }); setLoanPayAmount(""); };
  const confirmLoanPay = async () => {
    if (!acting) return;
    setBusy(true);
    const amt = Math.max(0, Number(loanPayAmount) || 0);
    const alreadyPaid = Number(acting.req.paid_amount) || 0;
    const total = Number(acting.req.amount) || 0;
    const totalPaid = Math.min(total, alreadyPaid + amt);
    const closed = total > 0 && totalPaid >= total;
    let log = [];
    try { log = JSON.parse(acting.req.payment_log || "[]"); } catch { log = []; }
    if (amt > 0) log = [...log, { date: todayISO(), amount: amt, by: me?.full_name || "" }];
    const payment_log = JSON.stringify(log);
    const updated = { ...acting.req, paid_amount: totalPaid, payment_log, status: closed ? "completed" : acting.req.status };
    await update("loans", acting.req.id, {
      paid_amount: totalPaid,
      payment_log,
      finance_status: "paid",
      status: closed ? "completed" : acting.req.status,
    });
    try { await generateLoanStatement(updated, empOf(acting.req.employee_id), org); } catch (e) {}
    setBusy(false); setActing(null); setLoanPayAmount(""); load();
  };
  const openTripApprove = (r) => { setActing({ type: "trips", req: r, action: "tripapprove" }); setNote(""); setProofFile(null); };
  const openTripReject = (r) => { setActing({ type: "trips", req: r, action: "tripreject" }); setNote(""); };
  const confirmTripApprove = async () => {
    if (!acting) return;
    setBusy(true);
    let url = "";
    if (proofFile) { url = await uploadFileToVault(proofFile, { empRef: empOf(acting.req.employee_id)?.emp_ref || null, docType: "attachment" }) || ""; }
    try {
      const r = acting.req;
      const emp = empOf(r.employee_id);
      const patch = {
        status: "awaiting_finance", finance_status: "pending",
        approver_id: me?.id, approver_name: me?.full_name, approved_date: todayISO(),
        hr_note: note, hr_document_url: url,
      };
      setTrips((prev) => prev.map((t) => (t.id === r.id ? { ...t, ...patch } : t)));
      await base44.entities.BusinessTrip.update(r.id, patch);
      try { await generateBusinessTripApproval({ ...r, ...patch }, emp, org); } catch (e) {}
      // تنبيه المالية بوجود انتداب بانتظار الصرف
      try { await base44.functions.invoke("notifyApprover", { type: "trip", employeeId: r.employee_id, employeeName: r.employee_name, status: "awaiting_finance" }); } catch (e) {}
    } catch (e) { load(); }
    setBusy(false); setActing(null); setNote(""); setProofFile(null); load();
  };
  const confirmTripReject = async () => {
    if (!acting) return;
    setBusy(true);
    try {
      const rejPatch = { status: "rejected", hr_note: note };
      setTrips((prev) => prev.map((t) => (t.id === acting.req.id ? { ...t, ...rejPatch } : t)));
      await base44.entities.BusinessTrip.update(acting.req.id, rejPatch);
    } catch (e) { load(); }
    setBusy(false); setActing(null); setNote(""); load();
  };
  const openTripFinance = (r) => { setActing({ type: "trips", req: r, action: "tripfinance" }); setNote(""); setProofFile(null); };
  const confirmTripFinance = async () => {
    if (!acting) return;
    setBusy(true);
    let url = "";
    if (proofFile) { url = await uploadFileToVault(proofFile, { empRef: empOf(acting.req.employee_id)?.emp_ref || null, docType: "attachment" }) || ""; }
    try {
      const finPatch = {
        status: "completed", finance_status: "paid", finance_note: note,
        finance_paid_date: todayISO(), finance_proof_url: url, finance_proof_date: todayISO(),
      };
      setTrips((prev) => prev.map((t) => (t.id === acting.req.id ? { ...t, ...finPatch } : t)));
      await base44.entities.BusinessTrip.update(acting.req.id, finPatch);
    } catch (e) { load(); }
    setBusy(false); setActing(null); setNote(""); setProofFile(null); load();
  };

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
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.searchPh}
              className="pr-9 max-w-md"
            />
          </div>

          <Tabs defaultValue="leaves">
            <TabsList className="mb-4">
              <TabsTrigger value="leaves">{t.tabLeaves(visLeaves.length)}</TabsTrigger>
              <TabsTrigger value="loans">{t.tabLoans(visLoans.length)}</TabsTrigger>
              <TabsTrigger value="trips">{t.tabTrips(visTrips.length)}</TabsTrigger>
            </TabsList>

            <TabsContent value="leaves">
              <div className="space-y-3">
                {visLeaves.length === 0 ? <Empty t={t} /> : visLeaves.map((r) => (
                  <RequestCard key={r.id} r={r} emp={empOf(r.employee_id)} actions={actionsFor("leaves", r)} t={t} genBusy={genBusy}>
                    {r.is_full_clearance && <span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600">{t.fullClear}</span>}
                    {r.ticket_amount > 0 && <span className="text-xs text-muted-foreground">{t.ticket(r.ticket_amount)}</span>}
                    {r.balance_deducted > 0 && <span className="text-xs text-muted-foreground">{t.deduct(r.balance_deducted)}</span>}
                    {r.hr_document_url && <VaultDocLink value={r.hr_document_url} label="تذاكر الموارد البشرية" className="text-xs h-6 px-2 rounded-full bg-violet-50 text-violet-600 border-0" />}
                    {r.finance_proof_url && <VaultDocLink value={r.finance_proof_url} label="إثبات المالية" className="text-xs h-6 px-2 rounded-full bg-blue-50 text-blue-600 border-0" />}
                  </RequestCard>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="loans">
              <div className="space-y-3">
                {visLoans.length === 0 ? <Empty t={t} /> : visLoans.map((r) => {
                   const paid = Number(r.paid_amount) || 0;
                   const remaining = Math.max(0, (Number(r.amount) || 0) - paid);
                   const closed = (Number(r.amount) || 0) > 0 && paid >= (Number(r.amount) || 0);
                   return (
                     <RequestCard key={r.id} r={r} emp={empOf(r.employee_id)} actions={actionsFor("loans", r)} t={t} genBusy={genBusy} statusBadgeOverride={closed ? { label: "مغلقة", cls: "bg-rose-50 text-rose-600" } : null} extra={
                       <div className="text-xs text-muted-foreground mt-1">
                         {t.totalLoan}: <b className="text-foreground">{formatCurrency(r.amount)}</b> · تم سداد: <b className="text-emerald-600">{formatCurrency(paid)}</b> · {t.remaining}: <b className="text-amber-600">{formatCurrency(remaining)}</b>
                       </div>
                     }>
                       <span className="text-xs text-muted-foreground">{r.installment_count} · {formatCurrency(r.monthly_installment)}</span>
                     </RequestCard>
                   );
                 })}
              </div>
            </TabsContent>

            <TabsContent value="trips">
              <div className="space-y-3">
                {visTrips.length === 0 ? <Empty t={t} /> : visTrips.map((r) => {
                  const emp = empOf(r.employee_id);
                  const rc = { ...r, employee_name: emp?.full_name || r.employee_name };
                  return (
                    <RequestCard key={r.id} r={rc} emp={emp} actions={actionsFor("trips", r)} t={t} genBusy={genBusy}
                      kindBadge={<span className="text-xs px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 flex items-center gap-1"><Plane size={11} /> {r.trip_type === "external" ? t.tripExt : t.tripInt}</span>}
                      extra={<div className="text-xs text-muted-foreground mt-1">{t.tripLine(r.destination, r.purpose)} · {t.days(r.start_date, r.end_date, r.days_count)}</div>}>
                      {r.total_cost > 0 && <span className="text-xs text-muted-foreground">{t.tripCost(r.total_cost)}</span>}
                      {r.employee_document_url && <VaultDocLink value={r.employee_document_url} label="مرفق الموظف" className="text-xs h-6 px-2 rounded-full bg-blue-50 text-blue-600 border-0" />}
                      {r.hr_document_url && <VaultDocLink value={r.hr_document_url} label="مرفق المالية" className="text-xs h-6 px-2 rounded-full bg-emerald-50 text-emerald-600 border-0" />}
                    </RequestCard>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </>
        </PullToRefresh>
      )}

      <Dialog open={acting?.action === "reject"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.rejectTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="pb-3">
              <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
              <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
            </div>
          )}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">{t.rejectReason}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)}>{t.cancel}</Button>
            <Button variant="destructive" onClick={reject} className="gap-1">
              <X size={16} /> {t.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "finance"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.payTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="pb-1">
                <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
                <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {acting.type === "leaves" ? t.leavePay(acting.req.ticket_amount) : t.loanPay(acting.req.amount)}
              </div>
              {acting.type === "loans" && (
                <div className="text-xs text-muted-foreground bg-slate-50 border border-border rounded-lg p-3">
                  {isAr ? <>المبلغ المعتمد من الموارد البشرية: <b className="text-foreground">{formatCurrency(acting.req.amount)}</b> · الأقساط: <b className="text-foreground">{acting.req.installment_count || 1}</b> × {formatCurrency(acting.req.monthly_installment)}<br />تاريخ الطلب: <b className="text-foreground">{acting.req.request_date || (acting.req.created_date || "").slice(0, 10)}</b></> : <>Approved amount: <b className="text-foreground">{formatCurrency(acting.req.amount)}</b> · {acting.req.installment_count || 1} × {formatCurrency(acting.req.monthly_installment)}<br />Request date: <b className="text-foreground">{acting.req.request_date || (acting.req.created_date || "").slice(0, 10)}</b></>}
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.finNote}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t.finNotePh} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.proof} <span className="text-rose-500">*</span></Label>
                <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0])} />
                {!proofFile && <span className="text-xs text-rose-500">{isAr ? "إرفاق المستند مطلوب للتأكيد" : "Attachment required to confirm"}</span>}
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                {acting.type === "leaves" ? t.payNoteL : t.payNote}
              </div>
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

      <Dialog open={acting?.action === "loanpay"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.loanPayTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="pb-1">
                <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
                <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="rounded-lg bg-slate-50 p-2.5">
                  <div className="text-xs text-muted-foreground">{t.totalLoan}</div>
                  <div className="font-bold">{formatCurrency(acting.req.amount)}</div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2.5">
                  <div className="text-xs text-muted-foreground">{t.alreadyPaidLabel}</div>
                  <div className="font-bold text-emerald-700">{formatCurrency(Number(acting.req.paid_amount) || 0)}</div>
                </div>
                <div className="rounded-lg bg-amber-50 p-2.5">
                  <div className="text-xs text-muted-foreground">{t.remaining}</div>
                  <div className="font-bold text-amber-700">{formatCurrency(Math.max(0, (Number(acting.req.amount) || 0) - (Number(acting.req.paid_amount) || 0) - (Number(loanPayAmount) || 0)))}</div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.paidLabel}</Label>
                <Input type="number" min={0} dir="ltr" value={loanPayAmount} onChange={(e) => setLoanPayAmount(e.target.value)} placeholder="0" />
              </div>
              <div className="text-xs text-muted-foreground bg-slate-50 border border-border rounded-lg p-2.5">{t.paidHint}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmLoanPay} disabled={busy} className="gap-1 bg-violet-600 hover:bg-violet-700">
                  {busy && <Loader2 size={16} className="animate-spin" />} {t.save}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "leavehr"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.leaveHrTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="pb-1">
                <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
                <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
              </div>
              <div className="text-sm text-muted-foreground">{leaveTypeLabel(acting.req.leave_type)} · {t.days(acting.req.start_date, acting.req.end_date, acting.req.days_count)}</div>
              {acting.req.medical_report_url && <VaultDocLink value={acting.req.medical_report_url} label="تقرير طبي مرفق" className="text-xs h-6 px-2 rounded-full bg-rose-50 text-rose-600 border-0" />}
              {(() => {
                const emp = empOf(acting.req.employee_id);
                const entitled = computeLeaveEntitlement(emp?.hire_date, org);
                const used = usedLeaveTotal(emp, (leaves || []).filter((l) => l.id !== acting.req.id && l.employee_id === acting.req.employee_id));
                const remaining = Math.max(0, Math.round((entitled - used) * 10) / 10);
                const mw = (Number(emp?.base_salary) || 0) + (Number(emp?.housing_allowance) || 0) + (Number(emp?.transport_allowance) || 0) + (Number(emp?.other_allowances) || 0);
                const dailyWage = mw / 30;
                const requested = Math.max(0, Number(acting.req.days_count) || 0);
                const gr = Number(grantedDays);
                const granted = Math.max(0, Math.min(Number.isFinite(gr) && gr > 0 ? gr : requested, requested));
                const ticket = acting.req.is_full_clearance ? leaveTicketAmount(emp, org) : 0;
                const base = (acting.req.leave_type === "annual" || acting.req.is_full_clearance) ? Math.round(granted * dailyWage * 100) / 100 : 0;
                const total = Math.max(0, base + ticket + (Number(additionAmount) || 0) - (Number(deductionAmount) || 0));
                return (
                  <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="rounded-lg bg-slate-50 p-2.5"><div className="text-xs text-muted-foreground">{t.entitledLabel}</div><div className="font-bold">{entitled}</div></div>
                    <div className="rounded-lg bg-amber-50 p-2.5"><div className="text-xs text-muted-foreground">{t.usedLabel}</div><div className="font-bold">{used}</div></div>
                    <div className="rounded-lg bg-emerald-50 p-2.5"><div className="text-xs text-muted-foreground">{t.remainingLabel}</div><div className="font-bold text-emerald-700">{remaining}</div></div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{isAr ? "عدد الأيام الموافق عليها" : "Approved days"}</Label>
                      <div className="flex items-center gap-2">
                        <Input type="number" min={1} max={Math.max(1, acting.req.days_count || 1)} dir="ltr"
                          value={grantedDays} onChange={(e) => setGrantedDays(e.target.value)}
                          className="w-24 font-bold text-violet-700" />
                        <div className="flex flex-col text-[11px] leading-tight text-muted-foreground">
                          {isAr ? "اكتب عدداً أقل من المطلوب لحصر الموافقة على جزء — لا يُخصم من الرصيد إلا هذا العدد فقط." : "Enter fewer days to approve only part — only these days are deducted."}
                        </div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{isAr ? "الأيام المطلوبة من الموظف" : "Requested"}: <b className="text-foreground">{acting.req.days_count} {isAr ? "يوم" : "days"}</b></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">{t.dailyWageLabel}</Label>
                      <div className="text-sm font-bold pt-1.5">{formatCurrency(dailyWage)}</div>
                    </div>
                  </div>
                  {ticket > 0 && <div className="text-xs text-muted-foreground">{isAr ? "تعويض التذكرة" : "Ticket"}: <b className="text-foreground">{formatCurrency(ticket)}</b></div>}
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
                  <div className="text-xs text-muted-foreground">{t.settleTotal}: <b className="text-foreground">{formatCurrency(total)}</b></div>
                  </>
                );
              })()}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.leaveHrNote}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder={t.leaveHrNotePh} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.leaveHrDoc}</Label>
                <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0])} />
              </div>
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3">{t.leaveHrWarn}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmLeaveHr} disabled={busy} className="gap-1 bg-violet-600 hover:bg-violet-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.leaveHrBtn}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "loanhr"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.loanHrTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name} <span className="text-xs text-muted-foreground tabular-nums">· {empOf(acting.req.employee_id)?.national_id || "—"}</span></div>
              <div className="text-xs text-muted-foreground bg-slate-50 rounded-lg p-3">
                {isAr ? <>المبلغ المطلوب من الموظف: <b className="text-foreground">{formatCurrency(acting.req.requested_amount || acting.req.amount)}</b> · الأقساط المطلوبة: <b className="text-foreground">{acting.req.requested_installments || acting.req.installment_count || 1}</b><br />تاريخ تقديم الطلب: <b className="text-foreground">{acting.req.request_date || (acting.req.created_date || "").slice(0, 10)}</b></> : <>Requested: <b className="text-foreground">{formatCurrency(acting.req.requested_amount || acting.req.amount)}</b> · Inst: <b className="text-foreground">{acting.req.requested_installments || acting.req.installment_count || 1}</b><br />Request date: <b className="text-foreground">{acting.req.request_date || (acting.req.created_date || "").slice(0, 10)}</b></>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{isAr ? "المبلغ المعتمد (ر.س)" : "Approved amount (SAR)"} <span className="text-rose-500">*</span></Label>
                  <Input type="number" min={0} dir="ltr" value={loanAmount} onChange={(e) => setLoanAmount(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">{isAr ? "عدد أشهر السداد" : "Repayment months"} <span className="text-rose-500">*</span></Label>
                  <Input type="number" min={1} dir="ltr" value={loanInstallments} onChange={(e) => setLoanInstallments(e.target.value)} />
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {isAr ? "القسط الشهري" : "Monthly installment"}: <b className="text-foreground">{formatCurrency((Number(loanAmount) || 0) / Math.max(1, Number(loanInstallments) || 1))}</b>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.leaveHrNote}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3">{t.loanHrWarn}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmLoanHr} disabled={busy || !(Number(loanAmount) > 0)} className="gap-1 bg-violet-600 hover:bg-violet-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.loanHrBtn}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "tripapprove"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.tripApproveTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="pb-1">
                <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
                <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {acting.req.trip_type === "external" ? t.tripExt : t.tripInt} — {acting.req.destination} · {t.days(acting.req.start_date, acting.req.end_date, acting.req.days_count)}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.tripNote}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder={t.tripNotePh} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.tripDoc}</Label>
                <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0])} />
              </div>
              <div className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg p-3">{t.tripPayNote}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmTripApprove} disabled={busy} className="gap-1 bg-violet-600 hover:bg-violet-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.tripApproveBtn}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "tripreject"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.tripRejectTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="pb-3">
              <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
              <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
            </div>
          )}
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground">{t.rejectReason}</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
            <Button variant="destructive" onClick={confirmTripReject} disabled={busy} className="gap-1">
              {busy && <Loader2 size={16} className="animate-spin" />} <X size={16} /> {t.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={acting?.action === "tripfinance"} onOpenChange={() => setActing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t.tripFinTitle}</DialogTitle></DialogHeader>
          {acting && (
            <div className="space-y-4">
              <div className="pb-1">
                <div className="font-medium text-sm">{empOf(acting.req.employee_id)?.full_name || acting.req.employee_name}</div>
                <div className="text-xs text-muted-foreground tabular-nums" dir="ltr">{empOf(acting.req.employee_id)?.national_id || "—"}</div>
              </div>
              <div className="text-sm text-muted-foreground">
                {acting.req.destination} · {t.days(acting.req.start_date, acting.req.end_date, acting.req.days_count)}
                {acting.req.total_cost > 0 && <> · {t.tripCost(acting.req.total_cost)}</>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.finNote}</Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder={t.finNotePh} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">{t.proof} <span className="text-rose-500">*</span></Label>
                <Input type="file" onChange={(e) => setProofFile(e.target.files?.[0])} />
                {!proofFile && <span className="text-xs text-rose-500">{isAr ? "إرفاق المستند مطلوب للتأكيد" : "Attachment required to confirm"}</span>}
              </div>
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">{t.tripFinWarn}</div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setActing(null)} disabled={busy}>{t.cancel}</Button>
                <Button onClick={confirmTripFinance} disabled={busy || !proofFile} className="gap-1 bg-blue-600 hover:bg-blue-700">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} {t.confirmPay}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RequestCard({ r, emp, actions, onReject, t, children, genBusy, extra, kindBadge, statusBadgeOverride }) {
  const stBadge = statusBadgeOverride || badge(r.status);
  return (
    <div className="bg-white rounded-2xl border border-border p-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div>
              <div className="font-medium text-sm">{emp?.full_name || r.employee_name}</div>
              {emp?.national_id && <div className="text-xs text-muted-foreground tabular-nums">{emp.national_id}</div>}
            </div>
            {kindBadge || (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {r.leave_type ? leaveTypeLabel(r.leave_type) : t.loan}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {r.start_date ? t.days(r.start_date, r.end_date, r.days_count) : t.loanLine(r.amount, r.reason || "")}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            تاريخ الطلب: <b className="text-foreground tabular-nums">{r.request_date || (r.created_date || "").slice(0, 10) || "—"}</b>
          </div>
          {extra}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium", stBadge.cls)}>{stBadge.label}</span>
            {children}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {actions.map((a, i) => {
            if (a.docRef) {
              return <VaultDocLink key={i} value={a.docRef} label={a.label} className={cn("inline-flex items-center h-8 px-3 rounded-md text-xs font-medium", a.cls)} />;
            }
            if (a.href) {
              return (
                <a key={i} href={a.href} target="_blank" rel="noreferrer"
                  className={cn("inline-flex items-center gap-1 h-8 px-3 rounded-md text-xs font-medium", a.cls)}>
                  <Download size={14} /> {a.label}
                </a>
              );
            }
            return (
              <Button key={i} size="sm" onClick={a.onClick} disabled={a.busyKey && genBusy === a.busyKey}
                className={cn("h-8 text-xs gap-1", a.cls)}>
                {a.busyKey && genBusy === a.busyKey ? <Loader2 size={14} className="animate-spin" /> : a.icon === "refresh" ? <RefreshCw size={14} /> : null}
                {a.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Empty({ t }) {
  return (
    <div className="p-14 text-center bg-white rounded-2xl border border-border">
      <ClipboardCheck size={40} className="mx-auto text-slate-300 mb-3" />
      <p className="text-muted-foreground">{t.empty}</p>
    </div>
  );
}