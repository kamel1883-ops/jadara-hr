import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { SUPPORT_CATEGORIES } from "@/lib/supportCategories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { MobileSelect, MobileSelectItem } from "@/components/ui/mobile-select";
import { Image } from "@/components/ui/image";
import {
  Loader2, Search, Headphones, Send, FileQuestion, CheckCircle2, XCircle,
  RotateCcw, Flag, MessageSquare, Clock, Mail, Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS = {
  open: { ar: "مفتوحة", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  pending_info: { ar: "بانتظار معلومات", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  resolved: { ar: "تم الحل", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  closed: { ar: "مغلقة", cls: "bg-slate-100 text-slate-500 border-slate-200" },
};
const PRIORITY = {
  low: { ar: "منخفضة", cls: "bg-slate-100 text-slate-600" },
  medium: { ar: "متوسطة", cls: "bg-sky-100 text-sky-700" },
  high: { ar: "عالية", cls: "bg-orange-100 text-orange-700" },
  urgent: { ar: "عاجلة", cls: "bg-rose-100 text-rose-700" },
};

export default function SupportTicketsManager({ session, isAr = true }) {
  const [tickets, setTickets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [detail, setDetail] = useState(null); // ticket object
  const [busy, setBusy] = useState(false);

  const callManage = useCallback(async (action, extra = {}) => {
    const res = await base44.functions.invoke("manageSupportTicket", {
      token: session.token, employee_id: session.employee_id, action, ...extra,
    });
    const d = res?.data || res;
    if (!d?.ok) throw new Error(d?.error || "fail");
    return d;
  }, [session?.token, session?.employee_id]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await callManage("list", { q, status: statusFilter });
      setTickets(d.tickets || []);
    } catch { setTickets([]); }
    finally { setLoading(false); }
  }, [callManage, q, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const refreshDetail = async (id) => {
    try {
      const d = await callManage("list", {});
      const t = (d.tickets || []).find((x) => x.id === id);
      if (t) setDetail(t);
      setTickets(d.tickets || []);
    } catch {}
  };

  const counts = (tickets || []).reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center"><Headphones size={20} className="text-violet-700" /></div>
        <div>
          <h2 className="font-bold text-lg">{isAr ? "الدعم الفني — تذاكر العملاء" : "Support Tickets"}</h2>
          <p className="text-xs text-muted-foreground">{isAr ? "ردّ على العميل، اطلب مستندات، أو أغلق التذكرة — يصل العميل بريداً." : "Reply, request info, or close — client is notified by email."}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute top-1/2 -translate-y-1/2 right-3 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={isAr ? "بحث: رقم، اسم، بريد…" : "Search: number, name, email…"} className="pr-9" />
        </div>
        <div className="w-40">
          <MobileSelect
            value={statusFilter || "all"}
            onValueChange={(v) => setStatusFilter(v === "all" ? "" : v)}
            placeholder={isAr ? "كل الحالات" : "All statuses"}
          >
            {/* قيمة محايدة «all» بدل النص الفارغ: قائمة الاختيار في واجهة الحاسوب
                (Radix Select) ترفض القيمة الفارغة وتُسقط الصفحة بالشاشة البيضاء. */}
            <MobileSelectItem value="all">{isAr ? "كل الحالات" : "All"}</MobileSelectItem>
            <MobileSelectItem value="open">{isAr ? "مفتوحة" : "Open"}</MobileSelectItem>
            <MobileSelectItem value="pending_info">{isAr ? "بانتظار معلومات" : "Pending info"}</MobileSelectItem>
            <MobileSelectItem value="resolved">{isAr ? "تم الحل" : "Resolved"}</MobileSelectItem>
            <MobileSelectItem value="closed">{isAr ? "مغلقة" : "Closed"}</MobileSelectItem>
          </MobileSelect>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {["open", "pending_info", "resolved", "closed"].map((s) => (
          <div key={s} className={cn("rounded-xl border p-3 text-center", STATUS[s].cls)}>
            <div className="text-2xl font-bold">{counts[s] || 0}</div>
            <div className="text-xs">{STATUS[s].ar}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-600" /></div>
      ) : (tickets || []).length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">{isAr ? "لا توجد تذاكر بعد" : "No tickets yet"}</div>
      ) : (
        <div className="space-y-2">
          {(tickets || []).map((tk) => (
            <button key={tk.id} onClick={() => setDetail(tk)} className="w-full text-start bg-white border border-border rounded-2xl p-4 hover:border-violet-300 hover:shadow-sm transition">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-violet-700 tracking-wide">{tk.ticket_number}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full border", STATUS[tk.status]?.cls)}>{STATUS[tk.status]?.ar}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full", PRIORITY[tk.priority]?.cls)}>{PRIORITY[tk.priority]?.ar}</span>
                  </div>
                  <div className="font-semibold mt-1 truncate">{tk.subject || tk.category_label}</div>
                  <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                    <span className="truncate">{tk.client_name}</span>
                    <span dir="ltr" className="truncate">{tk.client_email}</span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{(tk.created_date || "").slice(0, 10)}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      {detail && (
        <TicketDetail
          ticket={detail}
          isAr={isAr}
          onClose={() => setDetail(null)}
          callManage={callManage}
          onAfter={async () => { await refreshDetail(detail.id); }}
        />
      )}
    </div>
  );
}

function TicketDetail({ ticket, isAr, onClose, callManage, onAfter }) {
  const [mode, setMode] = useState(""); // reply | info | note
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  let history = [];
  try { history = JSON.parse(ticket.reply_history || "[]"); if (!Array.isArray(history)) history = []; } catch { history = []; }
  let atts = [];
  try { atts = JSON.parse(ticket.attachment_urls || "[]"); if (!Array.isArray(atts)) atts = []; } catch { atts = []; }

  const doAction = async (kind) => {
    if ((kind === "reply" || kind === "info") && !msg.trim()) { setErr(isAr ? "اكتب الرسالة" : "Type a message"); return; }
    setErr(""); setBusy(true);
    try {
      if (kind === "reply") await callManage("reply", { ticket_id: ticket.id, message: msg });
      else if (kind === "info") await callManage("request_info", { ticket_id: ticket.id, message: msg });
      else if (kind === "note") await callManage("add_note", { ticket_id: ticket.id, note: msg });
      else if (kind === "close") await callManage("close", { ticket_id: ticket.id });
      else if (kind === "reopen") await callManage("reopen", { ticket_id: ticket.id });
      setMsg(""); setMode("");
      await onAfter();
    } catch (e) { setErr(e?.message || "fail"); }
    finally { setBusy(false); }
  };

  const setPriority = async (p) => {
    setBusy(true);
    try { await callManage("set_priority", { ticket_id: ticket.id, priority: p }); await onAfter(); }
    catch (e) { setErr(e?.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-background w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-background border-b border-border px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-violet-700 text-lg tracking-wide">{ticket.ticket_number}</span>
            <span className={cn("text-xs px-2 py-0.5 rounded-full border", STATUS[ticket.status]?.cls)}>{STATUS[ticket.status]?.ar}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1"><XCircle size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Field label={isAr ? "العميل" : "Client"} value={ticket.client_name} />
            <Field label={isAr ? "البريد" : "Email"} value={ticket.client_email} ltr />
            <Field label={isAr ? "الجوال" : "Phone"} value={ticket.client_phone || "—"} ltr />
            <Field label={isAr ? "الفئة" : "Category"} value={ticket.category_label || ticket.category} />
            <Field label={isAr ? "النوع" : "Type"} value={ticket.subcategory_label || ticket.subcategory || "—"} />
            <Field label={isAr ? "التاريخ" : "Date"} value={(ticket.created_date || "").slice(0, 10)} />
          </div>

          <div>
            <Label className="mb-1 block">{isAr ? "العنوان" : "Subject"}</Label>
            <div className="font-semibold">{ticket.subject || ticket.category_label}</div>
          </div>
          <div>
            <Label className="mb-1 block">{isAr ? "الوصف" : "Description"}</Label>
            <div className="text-sm whitespace-pre-wrap bg-muted/50 rounded-xl p-3 leading-relaxed">{ticket.description}</div>
          </div>

          {atts.length > 0 && (
            <div>
              <Label className="mb-1 block">{isAr ? "المرفقات" : "Attachments"}</Label>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {atts.map((u, i) => (
                  <a key={i} href={u} target="_blank" rel="noreferrer" className="rounded-lg overflow-hidden border border-border bg-muted aspect-square">
                    <Image src={u} fittingType="fill" className="w-full h-full" alt={`att-${i}`} />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Label>{isAr ? "الأولوية:" : "Priority:"}</Label>
            {["low", "medium", "high", "urgent"].map((p) => (
              <button key={p} onClick={() => setPriority(p)} className={cn("text-xs px-2.5 py-1 rounded-full border transition", ticket.priority === p ? cn(PRIORITY[p].cls, "border-transparent font-semibold") : "bg-white border-border text-muted-foreground hover:border-violet-300")}>{PRIORITY[p].ar}</button>
            ))}
          </div>

          {history.length > 0 && (
            <div>
              <Label className="mb-2 block">{isAr ? "سجل المتابعة" : "History"}</Label>
              <div className="space-y-2">
                {history.map((h, i) => (
                  <div key={i} className={cn("rounded-xl p-3 text-sm border", h.type === "reply" ? "bg-emerald-50/60 border-emerald-200" : h.type === "info_request" ? "bg-amber-50/60 border-amber-200" : "bg-slate-50 border-slate-200")}>
                    <div className="text-xs font-semibold mb-1 flex items-center gap-1">
                      {h.type === "reply" ? <><Send size={12} /> {isAr ? "رد الدعم" : "Support reply"}</> : h.type === "info_request" ? <><FileQuestion size={12} /> {isAr ? "طلب معلومات" : "Info request"}</> : <><CheckCircle2 size={12} /> {isAr ? "إغلاق" : "Closed"}</>}
                      <span className="text-muted-foreground font-normal">— {(h.at || "").slice(0, 16).replace("T", " ")}</span>
                    </div>
                    {h.message ? <div className="whitespace-pre-wrap leading-relaxed">{h.message}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          )}

          {ticket.internal_note && (
            <div className="rounded-xl p-3 bg-violet-50 border border-violet-200 text-sm">
              <Label className="mb-1 block">{isAr ? "ملاحظة داخلية" : "Internal note"}</Label>
              <div className="whitespace-pre-wrap">{ticket.internal_note}</div>
            </div>
          )}

          {/* Reply / info / note composer */}
          <div className="border-t border-border pt-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant={mode === "reply" ? "default" : "outline"} onClick={() => setMode("reply")} className="gap-1.5"><Send size={14} /> {isAr ? "رد على العميل" : "Reply"}</Button>
              <Button size="sm" variant={mode === "info" ? "default" : "outline"} onClick={() => setMode("info")} className="gap-1.5"><FileQuestion size={14} /> {isAr ? "طلب مستندات" : "Request info"}</Button>
              <Button size="sm" variant={mode === "note" ? "default" : "outline"} onClick={() => setMode("note")} className="gap-1.5"><MessageSquare size={14} /> {isAr ? "ملاحظة داخلية" : "Internal note"}</Button>
              {ticket.status !== "closed" ? (
                <Button size="sm" variant="outline" onClick={() => doAction("close")} disabled={busy} className="gap-1.5"><XCircle size={14} /> {isAr ? "إغلاق" : "Close"}</Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => doAction("reopen")} disabled={busy} className="gap-1.5"><RotateCcw size={14} /> {isAr ? "إعادة فتح" : "Reopen"}</Button>
              )}
            </div>
            {mode && (mode === "reply" || mode === "info" || mode === "note") && (
              <>
                <Textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={3}
                  placeholder={mode === "reply" ? (isAr ? "اكتب ردك للعميل…" : "Reply to client…") : mode === "info" ? (isAr ? "حدد المعلومات/المستندات المطلوبة…" : "Specify what's needed…") : (isAr ? "ملاحظة داخلية لا تُرسل للعميل…" : "Internal note…")} />
                <Button size="sm" onClick={() => doAction(mode)} disabled={busy} className="gap-1.5">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  {mode === "reply" ? (isAr ? "إرسال الرد" : "Send reply") : mode === "info" ? (isAr ? "إرسال الطلب" : "Send request") : (isAr ? "حفظ الملاحظة" : "Save note")}
                </Button>
              </>
            )}
            {err && <div className="text-sm rounded-lg p-3 bg-rose-50 text-rose-700">{err}</div>}
            {busy && !mode && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> {isAr ? "جارٍ التنفيذ…" : "Working…"}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, ltr }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
      <div className={ltr ? "font-medium" : "font-medium"} dir={ltr ? "ltr" : undefined}>{value || "—"}</div>
    </div>
  );
}