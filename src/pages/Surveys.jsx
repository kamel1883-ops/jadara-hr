import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { ClipboardList, Plus, Pencil, Trash2, BarChart3, Send, Eye, Star } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const TYPES = ["engagement","exit","onboarding","pulse"];
const QTYPES = ["rating","text","choice"];

export default function Surveys() {
  const { lang } = useI18n();
  const isAr = lang === "ar";
  const t = isAr ? {
    title: "استبيانات الموظفين", subtitle: "استبيانات الالتزام ورضا الموظفين والاستبقاء", add: "استبيان جديد",
    newT: "استبيان جديد", editT: "تعديل الاستبيان", empty: "لا توجد استبيانات", del: "حذف الاستبيان؟", loading: "جارٍ التحميل...",
    name: "العنوان", type: "النوع", desc: "الوصف", anon: "استبيان مجهول", start: "تاريخ البدء", end: "تاريخ الانتهاء",
    dep: "الإدارة المستهدفة", qs: "الأسئلة", qNew: "أضف سؤالاً", qText: "نص السؤال", qType: "نوع الإجابة", qOpts: "الخيارات (بفاصلة)",
    save: "حفظ", cancel: "إلغاء", status: "الحالة", responses: "الردود",
    activeBtn: "تفعيل", closeBtn: "إغلاق", draftBtn: "مسودة", respond: "تعبئة رد", results: "النتائج", none: "بدون",
  } : {
    title: "Employee Surveys", subtitle: "Engagement, satisfaction and retention surveys", add: "New survey",
    newT: "New survey", editT: "Edit survey", empty: "No surveys", del: "Delete survey?", loading: "Loading...",
    name: "Title", type: "Type", desc: "Description", anon: "Anonymous", start: "Start date", end: "End date",
    dep: "Target department", qs: "Questions", qNew: "Add question", qText: "Question text", qType: "Answer type", qOpts: "Options (comma)",
    save: "Save", cancel: "Cancel", status: "Status", responses: "Responses",
    activeBtn: "Activate", closeBtn: "Close", draftBtn: "Draft", respond: "Respond", results: "Results", none: "None",
  };
  const tyL = (k) => isAr ? ({ engagement:"التزام", exit:"مغادرة", onboarding:"الالتحاق", pulse:"نبضة" }[k]) : ({ engagement:"Engagement", exit:"Exit", onboarding:"Onboarding", pulse:"Pulse" }[k]);
  const stL = (k) => isAr ? ({ draft:"مسودة", active:"نشط", closed:"مغلق" }[k]) : ({ draft:"Draft", active:"Active", closed:"Closed" }[k]);
  const stCls = { draft: "bg-slate-100 text-slate-600", active: "bg-emerald-100 text-emerald-700", closed: "bg-slate-200 text-slate-500" };

  const emptyQ = () => ({ id: Math.random().toString(36).slice(2,8), text: "", type: "rating", options: "" });
  const emptySurvey = () => ({ title: "", type: "engagement", description: "", is_anonymous: false, start_date: "", end_date: "", target_department: "", status: "draft", questions: JSON.stringify([emptyQ()]), notes: "" });

  const [items, setItems] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptySurvey());
  const [openForm, setOpenForm] = useState(false);
  const [qs, setQs] = useState([emptyQ()]);
  const [resultsFor, setResultsFor] = useState(null);
  const [responses, setResponses] = useState([]);
  const [respondFor, setRespondFor] = useState(null);
  const [rForm, setRForm] = useState({ employee_id: "", anonymous: false, answers: {} });

  const load = async () => {
    const [s, e] = await Promise.all([
      base44.entities.Survey.list("-created_date", 500),
      base44.entities.Employee.filter({ status: "active" }, "-created_date", 500),
    ]);
    setItems(s); setEmployees(e); setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const parseQs = (str) => { try { return JSON.parse(str || "[]"); } catch { return []; } };

  const startAdd = () => { setEditing(null); setForm(emptySurvey()); setQs([emptyQ()]); setOpenForm(true); };
  const startEdit = (s) => { setEditing(s); setForm({ ...emptySurvey(), ...s }); setQs(parseQs(s.questions)); setOpenForm(true); };
  const addQ = () => setQs((q) => [...q, emptyQ()]);
  const updQ = (id, k, v) => setQs((q) => q.map((x) => x.id === id ? { ...x, [k]: v } : x));
  const delQ = (id) => setQs((q) => q.filter((x) => x.id !== id));

  const save = async (e) => {
    e.preventDefault();
    const payload = { ...form, questions: JSON.stringify(qs.filter((q) => q.text.trim())) };
    if (editing) await base44.entities.Survey.update(editing.id, payload);
    else await base44.entities.Survey.create(payload);
    setOpenForm(false); load();
  };
  const remove = async (s) => { if (!confirm(t.del)) return; await base44.entities.Survey.delete(s.id); load(); };
  const changeStatus = async (s, status) => { await base44.entities.Survey.update(s.id, { status }); load(); };

  const openResults = async (s) => {
    setResultsFor(s);
    const r = await base44.entities.SurveyResponse.filter({ survey_id: s.id }, "-submitted_date", 500);
    setResponses(r);
  };
  const openRespond = (s) => { setRespondFor(s); setRForm({ employee_id: "", anonymous: s.is_anonymous, answers: {} }); };
  const submitResponse = async (e) => {
    e.preventDefault();
    const s = respondFor;
    const emp = employees.find((x) => x.id === rForm.employee_id);
    const ratings = Object.values(rForm.answers).filter((v) => typeof v === "number");
    const avg = ratings.length ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 100) / 100 : 0;
    const sentiment = avg >= 4 ? "positive" : avg >= 3 ? "neutral" : avg > 0 ? "negative" : "neutral";
    const payload = {
      survey_id: s.id, survey_title: s.title,
      employee_id: rForm.anonymous ? "" : rForm.employee_id,
      employee_name: rForm.anonymous ? "" : (emp ? emp.full_name : ""),
      department: rForm.anonymous ? "" : (emp?.department || ""),
      is_anonymous: rForm.anonymous, submitted_date: new Date().toISOString().slice(0,10),
      responses: JSON.stringify(rForm.answers), avg_rating: avg, overall_sentiment: sentiment,
    };
    await base44.entities.SurveyResponse.create(payload);
    await base44.entities.Survey.update(s.id, { responses_count: (s.responses_count || 0) + 1 });
    setRespondFor(null); if (resultsFor?.id === s.id) openResults(await base44.entities.Survey.get(s.id) || s); load();
  };
  const setAns = (qid, v) => setRForm((f) => ({ ...f, answers: { ...f.answers, [qid]: v } }));

  return (
    <div dir={isAr ? "rtl" : "ltr"}>
      <PageHeader title={t.title} subtitle={t.subtitle} action={<Button onClick={startAdd} className="gap-2"><Plus size={18} /> {t.add}</Button>} />
      {loading ? <div className="p-10 text-center text-muted-foreground">{t.loading}</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.length === 0 && <div className="col-span-full p-14 text-center bg-white rounded-2xl border border-border"><ClipboardList size={40} className="mx-auto text-slate-300 mb-3" /><p className="text-muted-foreground">{t.empty}</p></div>}
          {items.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-border p-5 flex flex-col">
              <div className="flex items-start justify-between">
                <div className="font-bold">{s.title}</div>
                <span className={cn("text-xs px-2 py-1 rounded-lg", stCls[s.status])}>{stL(s.status)}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">{tyL(s.type)} · {t.responses}: {s.responses_count || 0}</div>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{s.description || "—"}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <IconBtn onClick={() => openRespond(s)} icon={Send} label={t.respond} cls="text-violet-600" />
                <IconBtn onClick={() => openResults(s)} icon={Eye} label={t.results} cls="text-blue-600" />
                <IconBtn onClick={() => startEdit(s)} icon={Pencil} label={t.editT} cls="text-slate-600" />
                {s.status === "draft" && <IconBtn onClick={() => changeStatus(s, "active")} icon={Star} label={t.activeBtn} cls="text-emerald-600" />}
                {s.status === "active" && <IconBtn onClick={() => changeStatus(s, "closed")} icon={Star} label={t.closeBtn} cls="text-amber-600" />}
              </div>
            </div>
          ))}
        </div>
      )}

      {openForm && (
        <Modal title={editing ? t.editT : t.newT} onClose={() => setOpenForm(false)}>
          <form onSubmit={save} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <In label={t.name}><Input value={form.title} onChange={(e) => set("title", e.target.value)} required /></In>
              <In label={t.type}>
                <MobileSelect value={form.type} onValueChange={(v) => set("type", v)}>
                  {TYPES.map((x) => <MobileSelectItem key={x} value={x}>{tyL(x)}</MobileSelectItem>)}
                </MobileSelect>
              </In>
            </div>
            <In label={t.desc}><Textarea rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} /></In>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <In label={t.start}><Input type="date" value={form.start_date} onChange={(e) => set("start_date", e.target.value)} /></In>
              <In label={t.end}><Input type="date" value={form.end_date} onChange={(e) => set("end_date", e.target.value)} /></In>
              <In label={t.dep}><Input value={form.target_department} onChange={(e) => set("target_department", e.target.value)} /></In>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.is_anonymous} onChange={(e) => set("is_anonymous", e.target.checked)} className="accent-violet-600" /> {t.anon}</label>

            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-semibold">{t.qs}</Label>
                <Button type="button" size="sm" variant="outline" onClick={addQ} className="gap-1"><Plus size={14} /> {t.qNew}</Button>
              </div>
              <div className="space-y-3">
                {qs.map((q) => (
                  <div key={q.id} className="rounded-xl border border-border p-3 space-y-2">
                    <div className="flex gap-2">
                      <Input placeholder={t.qText} value={q.text} onChange={(e) => updQ(q.id, "text", e.target.value)} />
                      <div className="w-32 shrink-0">
                        <MobileSelect value={q.type} onValueChange={(v) => updQ(q.id, "type", v)}>
                          {QTYPES.map((x) => <MobileSelectItem key={x} value={x}>{isAr ? ({rating:"تقييم 1-5",text:"نص حر",choice:"اختيار"}[x]) : ({rating:"Rating 1-5",text:"Open text",choice:"Choice"}[x])}</MobileSelectItem>)}
                        </MobileSelect>
                      </div>
                      <button type="button" onClick={() => delQ(q.id)} className="p-2 text-red-500"><Trash2 size={16} /></button>
                    </div>
                    {q.type === "choice" && <Input placeholder={t.qOpts} value={q.options} onChange={(e) => updQ(q.id, "options", e.target.value)} />}
                  </div>
                ))}
                {qs.length === 0 && <p className="text-xs text-muted-foreground">—</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenForm(false)}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </div>
          </form>
        </Modal>
      )}

      {respondFor && (
        <Modal title={`${t.respond}: ${respondFor.title}`} onClose={() => setRespondFor(null)}>
          <form onSubmit={submitResponse} className="space-y-4">
            {!respondFor.is_anonymous && (
              <In label={t.dep === "Target department" ? "Employee" : "الموظف"}>
                <MobileSelect value={rForm.employee_id} onValueChange={(v) => setRForm((f) => ({ ...f, employee_id: v }))} placeholder="—">
                  {employees.map((e) => <MobileSelectItem key={e.id} value={e.id}>{e.full_name} — {e.national_id || "—"}</MobileSelectItem>)}
                </MobileSelect>
              </In>
            )}
            <div className="space-y-4">
              {parseQs(respondFor.questions).map((q) => (
                <div key={q.id} className="rounded-xl border border-border p-3">
                  <div className="text-sm font-medium mb-2">{q.text}</div>
                  {q.type === "rating" && (
                    <div className="flex items-center gap-3">
                      {[1,2,3,4,5].map((n) => (
                        <button key={n} type="button" onClick={() => setAns(q.id, n)} className={cn("w-9 h-9 rounded-lg border font-bold", rForm.answers[q.id] === n ? "bg-violet-600 text-white border-violet-600" : "border-border")}>{n}</button>
                      ))}
                    </div>
                  )}
                  {q.type === "text" && <Textarea rows={2} value={rForm.answers[q.id] || ""} onChange={(e) => setAns(q.id, e.target.value)} />}
                  {q.type === "choice" && (
                    <div className="flex flex-wrap gap-2">
                      {(q.options || "").split(",").map((o) => o.trim()).filter(Boolean).map((o) => (
                        <button key={o} type="button" onClick={() => setAns(q.id, o)} className={cn("px-3 py-1.5 rounded-lg border text-sm", rForm.answers[q.id] === o ? "bg-violet-600 text-white border-violet-600" : "border-border")}>{o}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRespondFor(null)}>{t.cancel}</Button>
              <Button type="submit">{t.save}</Button>
            </div>
          </form>
        </Modal>
      )}

      {resultsFor && (
        <Modal title={`${t.results}: ${resultsFor.title}`} onClose={() => setResultsFor(null)} wide>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <Stat label={t.responses} v={responses.length} />
              <Stat label={isAr ? "متوسط الرضا" : "Avg rating"} v={(() => { const a = responses.filter((r) => r.avg_rating); return a.length ? (a.reduce((s, r) => s + r.avg_rating, 0) / a.length).toFixed(2) : "—"; })()} />
              <Stat label={isAr ? "انطباع عام" : "Sentiment"} v={(() => { const p = responses.filter((r) => r.overall_sentiment === "positive").length, n = responses.filter((r) => r.overall_sentiment === "negative").length; return `🙂 ${p} · 😐 ${responses.length - p - n} · 😞 ${n}`; })()} />
            </div>
            {parseQs(resultsFor.questions).map((q) => {
              const vals = responses.map((r) => { try { return JSON.parse(r.responses || "{}")[q.id]; } catch { return null; } });
              return (
                <div key={q.id} className="rounded-xl border border-border p-3">
                  <div className="text-sm font-medium mb-2">{q.text}</div>
                  {q.type === "rating" && (() => { const arr = vals.filter((v) => typeof v === "number"); const avg = arr.length ? (arr.reduce((a,b)=>a+b,0)/arr.length).toFixed(2) : "—"; return <div className="text-sm text-muted-foreground">{isAr ? "المتوسط" : "Avg"}: <b className="text-foreground">{avg}/5</b> · {isAr ? "عدد" : "count"}: {arr.length}</div>; })()}
                  {q.type === "choice" && (() => {
                    const map = {}; vals.forEach((v) => v && (map[v] = (map[v]||0)+1));
                    return <div className="space-y-1">{Object.entries(map).map(([o,c]) => <div key={o} className="flex justify-between text-sm"><span>{o}</span><span className="font-bold">{c}</span></div>)}</div>;
                  })()}
                  {q.type === "text" && <div className="space-y-1 max-h-40 overflow-y-auto">{vals.filter(Boolean).map((v, i) => <div key={i} className="text-sm text-muted-foreground border-b border-border/60 py-1">{v}</div>)}{vals.filter(Boolean).length === 0 && <p className="text-xs text-muted-foreground">—</p>}</div>}
                </div>
              );
            })}
            <div className="text-xs text-muted-foreground">{responses.length === 0 && (isAr ? "لا توجد ردود بعد" : "No responses yet")}</div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose, wide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={cn("bg-white rounded-2xl w-full max-h-[90vh] overflow-y-auto p-5", wide ? "max-w-3xl" : "max-w-2xl")}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">{title}</h3><button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button></div>
        {children}
      </div>
    </div>
  );
}
function In({ label, children }) { return <div className="space-y-1.5"><label className="text-xs font-medium text-muted-foreground">{label}</label>{children}</div>; }
function IconBtn({ onClick, icon: Icon, label, cls }) { return <button onClick={onClick} className={cn("inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs font-medium", cls)}><Icon size={14} /> {label}</button>; }
function Stat({ label, v }) { return <div className="rounded-xl bg-slate-50 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="text-lg font-bold mt-0.5">{v}</div></div>; }