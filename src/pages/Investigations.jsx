import React, { useEffect, useMemo, useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { listCurrentOrg } from "@/lib/currentOrg";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { FileSearch, Plus, Loader2, Printer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import { todayISO } from "@/lib/hr";
import { VIOLATION_CATEGORIES } from "@/lib/laborPolicy";
import { makeInvestigationRef, nextInvestigationStatus, parseParties } from "@/lib/investigation";
import VaultDocLink from "@/components/VaultDocLink";

const STATUS = {
  awaiting_subjects: { ar: "بانتظار رد الموظفين", en: "Awaiting employees", cls: "bg-amber-50 text-amber-700" },
  awaiting_witnesses: { ar: "بانتظار الشهود", en: "Awaiting witnesses", cls: "bg-blue-50 text-blue-700" },
  ready: { ar: "اكتملت الإفادات", en: "Statements complete", cls: "bg-emerald-50 text-emerald-700" },
  closed: { ar: "مغلق", en: "Closed", cls: "bg-slate-100 text-slate-600" },
};

function typeName(id, custom, isAr) {
  if (id === "other") return custom || (isAr ? "أخرى" : "Other");
  const cat = VIOLATION_CATEGORIES.find((c) => c.id === id);
  return cat ? (isAr ? cat.ar : cat.en) : (id || "—");
}

function escapeHtml(str) {
  if (!str && str !== 0) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function Investigations() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "محضر التحقيق",
    subtitle: "مخالفة في مكان العمل: اختر الموظفين، صف الادعاء، ثم اجمع الردود وإفادات الشهود قبل أي إنذار",
    newBtn: "إنشاء محضر تحقيق",
    empty: "لا توجد محاضر تحقيق",
    loading: "جارٍ التحميل...",
    type: "نوع المخالفة",
    other: "أخرى",
    custom: "صف نوع المخالفة",
    employees: "الموظفون المشمولون",
    search: "ابحث بالاسم أو رقم الهوية",
    allegations: "الادعاءات والإشكالية",
    send: "إرسال للموظفين",
    cancel: "إلغاء",
    need: "اختر موظفاً واحداً على الأقل واكتب الادعاء",
    ref: "رقم المحضر",
    subjects: "الموظفون المعنيون",
    witnesses: "الشهود",
    pending: "بانتظار الرد",
    replied: "تم الرد",
    reply: "الرد",
    evidence: "الإثبات",
    named: "أسماء شهود ذكرها الموظف",
    addWitnesses: "إضافة الشهود",
    pickWitnesses: "اختر شاهداً أو أكثر من موظفي المنشأة",
    sendWitnesses: "إرسال طلب الإفادة",
    close: "إغلاق المحضر وكتابة التوصية",
    recommendation: "التوصية",
    saveClose: "إغلاق المحضر",
    hint: "عند إصدار إنذار لاحقاً اكتب في وصف الإنذار: بناءً على محضر التحقيق رقم",
    back: "كل المحاضر",
    copy: "نسخ الرقم",
    copied: "تم النسخ",
    print: "طباعة المحضر",
  } : {
    title: "Investigation report",
    subtitle: "Workplace incident: choose the employees, describe the allegation, then collect replies and witness statements",
    newBtn: "New investigation",
    empty: "No investigation reports",
    loading: "Loading...",
    type: "Violation type",
    other: "Other",
    custom: "Describe the type",
    employees: "Employees included",
    search: "Search by name or ID",
    allegations: "Allegations",
    send: "Send to employees",
    cancel: "Cancel",
    need: "Choose at least one employee and write the allegation",
    ref: "Report no.",
    subjects: "Employees concerned",
    witnesses: "Witnesses",
    pending: "Awaiting reply",
    replied: "Replied",
    reply: "Reply",
    evidence: "Evidence",
    named: "Witness names mentioned",
    addWitnesses: "Add witnesses",
    pickWitnesses: "Choose one or more employees as witnesses",
    sendWitnesses: "Send statement request",
    close: "Close the report and write the recommendation",
    recommendation: "Recommendation",
    saveClose: "Close report",
    hint: "When you later issue a warning, write in its description: based on investigation report",
    back: "All reports",
    copy: "Copy number",
    copied: "Copied",
    print: "Print report",
  };

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ type: "", custom: "", allegations: "", ids: [] });
  const [empQ, setEmpQ] = useState("");
  const [witnessOpen, setWitnessOpen] = useState(false);
  const [witnessIds, setWitnessIds] = useState([]);
  const [recommendation, setRecommendation] = useState("");
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [list, emps] = await Promise.all([
        base44.entities.Investigation.list("-created_date", 500),
        base44.entities.Employee.list("-created_date", 1000),
      ]);
      const items = Array.isArray(list) ? list : [];
      setRows(items);
      setEmployees(Array.isArray(emps) ? emps : []);
      setSelected((cur) => (cur ? items.find((r) => r.id === cur.id) || null : null));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const empOf = (id) => employees.find((e) => e.id === id);
  const labelOf = (id, fallback) => {
    const e = empOf(id);
    const name = e?.full_name || fallback || "—";
    const nid = e?.national_id ? ` — ${e.national_id}` : "";
    return name + nid;
  };

  const employed = useMemo(
    () => employees.filter((e) => e.status !== "terminated" && e.status !== "resigned"),
    [employees]
  );
  const filteredEmps = employed.filter((e) => {
    const q = empQ.trim();
    if (!q) return true;
    return `${e.full_name || ""} ${e.national_id || ""} ${e.employee_number || ""}`.includes(q);
  });

  const toggle = (list, id, setList) => {
    setList(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  };

  const notifyEmployee = async (employeeId, refNo, role) => {
    const title = role === "witness" ? `طلب إفادة — محضر ${refNo}` : `محضر تحقيق ${refNo}`;
    const body = role === "witness"
      ? `طُلبت إفادتك شاهداً في محضر التحقيق رقم ${refNo}. افتح بوابة الموظف واكتب ما شاهدته.`
      : `وصلك محضر تحقيق رقم ${refNo}. المطلوب الرد على الادعاءات، ويمكنك إرفاق إثبات وذكر أسماء الشهود.`;
    await base44.entities.Notification.create({
      title, body, type: "investigation", employee_id: employeeId, link: "/portal", is_read: false,
    });
  };

  const createReport = async () => {
    if (!form.ids.length || !form.allegations.trim() || !form.type) return;
    setBusy(true);
    try {
      const org = (await listCurrentOrg())[0];
      const refNo = makeInvestigationRef();
      const parties = form.ids.map((id) => ({
        employee_id: id,
        employee_name: empOf(id)?.full_name || "",
        role: "subject",
        status: "pending",
        reply: "",
        evidence_ref: "",
        witness_names: "",
        requested_at: new Date().toISOString(),
      }));
      const created = await base44.entities.Investigation.create({
        ref_no: refNo,
        violation_type: form.type,
        custom_type: form.type === "other" ? form.custom.trim() : "",
        allegations: form.allegations.trim(),
        parties: JSON.stringify(parties),
        status: "awaiting_subjects",
        unified_number: org?.unified_number || "",
      });
      await Promise.all(form.ids.map((id) => notifyEmployee(id, refNo, "subject").catch(() => {})));
      setOpen(false);
      setForm({ type: "", custom: "", allegations: "", ids: [] });
      if (created?.id) setSelected(created);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const addWitnesses = async () => {
    if (!selected || !witnessIds.length) return;
    setBusy(true);
    try {
      const parties = parseParties(selected.parties);
      const now = new Date().toISOString();
      for (const id of witnessIds) {
        if (parties.some((p) => p.employee_id === id)) continue;
        parties.push({
          employee_id: id,
          employee_name: empOf(id)?.full_name || "",
          role: "witness",
          status: "pending",
          reply: "",
          evidence_ref: "",
          witness_names: "",
          requested_at: now,
        });
      }
      await base44.entities.Investigation.update(selected.id, {
        parties: JSON.stringify(parties),
        status: nextInvestigationStatus(parties),
      });
      await Promise.all(witnessIds.map((id) => notifyEmployee(id, selected.ref_no, "witness").catch(() => {})));
      setWitnessOpen(false);
      setWitnessIds([]);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const closeReport = async () => {
    if (!selected || !recommendation.trim()) return;
    setBusy(true);
    try {
      await base44.entities.Investigation.update(selected.id, {
        status: "closed",
        recommendation: recommendation.trim(),
        closed_at: todayISO(),
      });
      setRecommendation("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const copyRef = async (refNo) => {
    try {
      await navigator.clipboard.writeText(refNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* النسخ اختياري */ }
  };

  // Build a clean print-only HTML in the requested order:
  // 1. سبب الادعاء (allegations)
  // 2. إفادة الموظف/الموظفين المشمولين (their replies)
  // 3. إفادات الشهود
  // 4. التوصية (recommendation)
  const printInvestigation = () => {
    if (!selected) { alert(isAr ? 'لا يوجد محضر مختار للطباعة.' : 'No investigation selected to print.'); return; }

    const parties = parseParties(selected.parties || '[]');
    const subjects = parties.filter((p) => p.role !== 'witness');
    const witnesses = parties.filter((p) => p.role === 'witness');

    const docTitle = isAr ? 'محضر التحقيق' : 'Investigation Report';
    const ref = escapeHtml(selected.ref_no || '');
    const violation = escapeHtml(typeName(selected.violation_type, selected.custom_type, isAr));
    const allegations = escapeHtml(selected.allegations || '');
    const rec = escapeHtml(selected.recommendation || '');

    let body = '';
    body += `<div class="header"><h1>${escapeHtml(docTitle)}</h1><div><strong>${escapeHtml(t.ref)}:</strong> ${ref}</div><div><strong>${escapeHtml(isAr? 'نوع المخالفة' : 'Violation')}:</strong> ${violation}</div><hr/></div>`;

    // 1. السبب / الادعاء
    body += `<section><h2>${escapeHtml(isAr? 'الادعاء / سبب المحضر' : 'Allegation')}</h2><div class="allegations">${allegations || '—'}</div></section>`;

    // 2. إفادات الموظفين (subjects)
    body += `<section><h2>${escapeHtml(t.subjects)}</h2>`;
    if (subjects.length === 0) {
      body += `<div>—</div>`;
    } else {
      for (const p of subjects) {
        const name = escapeHtml(labelOf(p.employee_id, p.employee_name));
        const reply = escapeHtml(p.reply || '—');
        body += `<div class="party"><div class="party-name"><strong>${name}</strong></div><div class="party-reply"><strong>${escapeHtml(t.reply)}:</strong> ${reply}</div></div>`;
      }
    }
    body += `</section>`;

    // 3. إفادات الشهود
    body += `<section><h2>${escapeHtml(t.witnesses)}</h2>`;
    if (witnesses.length === 0) {
      body += `<div>—</div>`;
    } else {
      for (const p of witnesses) {
        const name = escapeHtml(labelOf(p.employee_id, p.employee_name));
        const reply = escapeHtml(p.reply || '—');
        body += `<div class="party"><div class="party-name"><strong>${name}</strong></div><div class="party-reply"><strong>${escapeHtml(t.reply)}:</strong> ${reply}</div></div>`;
      }
    }
    body += `</section>`;

    // 4. التوصية
    body += `<section><h2>${escapeHtml(t.recommendation)}</h2><div class="recommendation">${rec || '—'}</div></section>`;

    // Footer with date
    const dateStr = escapeHtml(new Date().toLocaleString(isAr ? 'ar-SA' : 'en-US'));
    body += `<footer style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:8px;font-size:12px;color:#6b7280;">${escapeHtml(isAr? 'تاريخ الطباعة' : 'Printed')}: ${dateStr}</footer>`;

    const style = `
      <style>
        @media print { @page { size: A4; margin: 20mm; } }
        body { font-family: "Tajawal", "Arial", sans-serif; direction: ${isAr ? 'rtl' : 'ltr'}; color: #111827; padding: 20px; }
        h1 { font-size: 20px; margin-bottom: 6px; }
        h2 { font-size: 14px; margin-top: 14px; margin-bottom: 6px; }
        .allegations, .recommendation { white-space: pre-wrap; }
        .party { border: 1px solid #e6e6e6; padding: 10px; border-radius: 6px; margin-bottom: 8px; }
        .party-name { margin-bottom: 6px; }
      </style>`;

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.open();
    win.document.write(`<html><head><meta charset="utf-8"/>${style}</head><body>${body}</body></html>`);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 500);
  };

  const parties = parseParties(selected?.parties || '[]');
  const subjects = parties.filter((p) => p.role !== "witness");
  const witnesses = parties.filter((p) => p.role === "witness");
  const taken = new Set(parties.map((p) => p.employee_id));

  const PartyBlock = ({ person }) => (
    <div className="rounded-xl border border-border p-3 space-y-1.5 party-block">
      <div className="flex items-center justify-between gap-2">
        <div className="font-medium text-sm">{labelOf(person.employee_id, person.employee_name)}</div>
        <span className={cn("text-[11px] px-2 py-0.5 rounded-full", person.status === "replied" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
          {person.status === "replied" ? t.replied : t.pending}
        </span>
      </div>
      {person.reply ? <div className="text-sm whitespace-pre-wrap"><b>{t.reply}: </b>{person.reply}</div> : null}
      {person.witness_names ? <div className="text-xs text-muted-foreground"><b>{t.named}: </b>{person.witness_names}</div> : null}
      {person.evidence_ref ? <VaultDocLink value={person.evidence_ref} label={t.evidence} /> : null}
    </div>
  );

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader
        title={t.title}
        subtitle={t.subtitle}
        action={<Button onClick={() => setOpen(true)} className="gap-2"><Plus size={18} /> {t.newBtn}</Button>}
      />

      {loading ? <div className="py-16 text-center text-muted-foreground">{t.loading}</div> : selected ? (
        <div className="bg-white rounded-2xl border border-border p-5 space-y-4" id="investigation-print-area">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button type="button" className="text-sm text-violet-700" onClick={() => setSelected(null)}>{t.back}</button>
            <span className={cn("text-xs px-2.5 py-1 rounded-full", (STATUS[selected.status] || STATUS.awaiting_subjects).cls)}>
              {isAr ? (STATUS[selected.status] || STATUS.awaiting_subjects).ar : (STATUS[selected.status] || STATUS.awaiting_subjects).en}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <FileSearch size={18} className="text-amber-700" />
            <div className="font-bold">{t.ref}: {selected.ref_no}</div>
            <Button type="button" size="sm" variant="outline" onClick={() => copyRef(selected.ref_no)}>{copied ? t.copied : t.copy}</Button>
            <Button type="button" size="sm" variant="outline" onClick={printInvestigation} className="no-print"><Printer size={16} style={{ marginLeft: 6 }} /> {t.print}</Button>
          </div>
          <div className="text-sm text-muted-foreground">{typeName(selected.violation_type, selected.custom_type, isAr)}</div>
          <div className="text-sm whitespace-pre-wrap leading-relaxed">{selected.allegations}</div>
          <div className="text-xs text-violet-800 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">{t.hint} {selected.ref_no}</div>

          <div className="font-semibold text-sm">{t.subjects}</div>
          <div className="space-y-2">{subjects.map((p) => <PartyBlock key={p.employee_id} person={p} />)}</div>
          <div className="font-semibold text-sm">{t.witnesses}</div>
          {witnesses.length === 0 ? <div className="text-xs text-muted-foreground">—</div> : <div className="space-y-2">{witnesses.map((p) => <PartyBlock key={p.employee_id} person={p} />)}</div>}

          {selected.status !== "closed" && (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => { setWitnessIds([]); setWitnessOpen(true); }}>{t.addWitnesses}</Button>
            </div>
          )}
          {selected.status !== "closed" && (
            <div className="space-y-2 border-t border-border pt-4">
              <Label>{t.recommendation}</Label>
              <Textarea value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={4} />
              <Button type="button" disabled={busy || !recommendation.trim()} onClick={closeReport}>{busy ? <Loader2 className="animate-spin" size={16} /> : t.saveClose}</Button>
            </div>
          )}
          {selected.status === "closed" && selected.recommendation && (
            <div className="rounded-xl bg-slate-50 border border-border p-3 text-sm whitespace-pre-wrap"><b>{t.recommendation}: </b>{selected.recommendation}</div>
          )}
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-border py-16 text-center text-muted-foreground">{t.empty}</div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const names = parseParties(r.parties).filter((p) => p.role !== "witness").map((p) => labelOf(p.employee_id, p.employee_name)).join(" · ");
            const st = STATUS[r.status] || STATUS.awaiting_subjects;
            return (
              <button key={r.id} type="button" onClick={() => { setSelected(r); setRecommendation(r.recommendation || ""); }} className="w-full text-right bg-white rounded-2xl border border-border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-bold">{r.ref_no}</div>
                  <span className={cn("text-[11px] px-2 py-0.5 rounded-full", st.cls)}>{isAr ? st.ar : st.en}</span>
                </div>
                <div className="text-sm mt-1">{typeName(r.violation_type, r.custom_type, isAr)}</div>
                <div className="text-xs text-muted-foreground mt-1">{names}</div>
              </button>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t.newBtn}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>{t.type}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VIOLATION_CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{isAr ? c.ar : c.en}</SelectItem>)}
                  <SelectItem value="other">{t.other}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.type === "other" && (
              <div className="space-y-1.5">
                <Label>{t.custom}</Label>
                <Input value={form.custom} onChange={(e) => setForm({ ...form, custom: e.target.value })} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t.employees}</Label>
              <Input value={empQ} onChange={(e) => setEmpQ(e.target.value)} placeholder={t.search} />
              <div className="max-h-48 overflow-y-auto border border-border rounded-xl p-2 space-y-1">
                {filteredEmps.map((e) => (
                  <label key={e.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                    <input type="checkbox" checked={form.ids.includes(e.id)} onChange={() => toggle(form.ids, e.id, (ids) => setForm({ ...form, ids }))} />
                    <span>{e.full_name}{e.national_id ? ` — ${e.national_id}` : ""}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{t.allegations}</Label>
              <Textarea rows={5} value={form.allegations} onChange={(e) => setForm({ ...form, allegations: e.target.value })} />
            </div>
            {(!form.ids.length || !form.allegations.trim() || !form.type) && <div className="text-xs text-amber-700">{t.need}</div>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button type="button" disabled={busy || !form.ids.length || !form.allegations.trim() || !form.type} onClick={createReport}>
              {busy ? <Loader2 className="animate-spin" size={16} /> : t.send}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={witnessOpen} onOpenChange={setWitnessOpen}>
        <DialogContent className="max-w-lg max-h-[88vh] overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
          <DialogHeader><DialogTitle>{t.addWitnesses}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t.pickWitnesses}</p>
          <Input value={empQ} onChange={(e) => setEmpQ(e.target.value)} placeholder={t.search} />
          <div className="max-h-64 overflow-y-auto border border-border rounded-xl p-2 space-y-1">
            {filteredEmps.filter((e) => !taken.has(e.id)).map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                <input type="checkbox" checked={witnessIds.includes(e.id)} onChange={() => toggle(witnessIds, e.id, setWitnessIds)} />
                <span>{e.full_name}{e.national_id ? ` — ${e.national_id}` : ""}</span>
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setWitnessOpen(false)}>{t.cancel}</Button>
            <Button type="button" disabled={busy || !witnessIds.length} onClick={addWitnesses}>{t.sendWitnesses}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
