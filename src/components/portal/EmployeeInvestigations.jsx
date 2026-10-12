import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { StoredDocButton } from "@/components/VaultDocLink";

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || "").split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function EmployeeInvestigations({ items = [], isAr = true, portalArgs, onDone }) {
  const [openId, setOpenId] = useState(null);
  const [reply, setReply] = useState("");
  const [names, setNames] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const t = isAr ? {
    title: "محاضر التحقيق",
    empty: "لا يوجد محضر تحقيق مطلوب منك",
    subject: "أنت من الموظفين المعنيين",
    witness: "طُلبت إفادتك شاهداً",
    allegations: "الادعاءات",
    reply: "ردك على مطالب التحقيق",
    witnesses: "إن كان لديك شهود، اكتب أسماءهم",
    file: "إرفاق صورة أو إثبات",
    send: "إرسال الرد",
    sent: "تم إرسال الرد",
    fileMiss: "حُفظ الرد. تعذر حفظ المرفق، أعد الإرسال مع ملف أصغر إن لزم.",
    pending: "بانتظار ردك",
    done: "تم الرد",
    yourReply: "ردك",
    evidence: "الإثبات",
  } : {
    title: "Investigation reports",
    empty: "No investigation report is waiting for you",
    subject: "You are named in this report",
    witness: "Your witness statement was requested",
    allegations: "Allegations",
    reply: "Your reply",
    witnesses: "If you have witnesses, write their names",
    file: "Attach a photo or proof",
    send: "Send reply",
    sent: "Reply sent",
    fileMiss: "The reply was saved. The attachment could not be stored.",
    pending: "Awaiting your reply",
    done: "Replied",
    yourReply: "Your reply",
    evidence: "Evidence",
  };

  const submit = async (item) => {
    if (!reply.trim() || !portalArgs?.token) return;
    setBusy(true);
    setMsg("");
    try {
      let fileBase64 = "";
      let fileName = "";
      let mimeType = "";
      if (file) {
        if (file.size > 2_500_000) throw new Error(isAr ? "الملف أكبر من ٢٫٥ ميغابايت" : "File is larger than 2.5 MB");
        fileBase64 = await fileToBase64(file);
        fileName = file.name || "evidence";
        mimeType = file.type || "application/octet-stream";
      }
      const res = await base44.functions.invoke("portalData", {
        ...portalArgs,
        action: "reply_investigation",
        id: item.id,
        reply: reply.trim(),
        witness_names: names.trim(),
        file_base64: fileBase64,
        file_name: fileName,
        mime_type: mimeType,
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || "failed");
      setMsg(data.evidence_saved === false && file ? t.fileMiss : t.sent);
      setReply("");
      setNames("");
      setFile(null);
      setOpenId(null);
      if (onDone) onDone();
    } catch (e) {
      setMsg(e?.message || "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-6 bg-white rounded-2xl border border-border p-5">
      <div className="font-bold mb-3">{t.title}</div>
      {items.length === 0 ? <div className="text-sm text-muted-foreground">{t.empty}</div> : (
        <div className="space-y-3">
          {items.map((item) => {
            const open = openId === item.id;
            const pending = item.reply_status !== "replied" && item.status !== "closed";
            return (
              <div key={item.id} className="rounded-xl border border-border p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm">{item.ref_no}</div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100">{pending ? t.pending : t.done}</span>
                </div>
                <div className="text-xs text-muted-foreground">{item.role === "witness" ? t.witness : t.subject}</div>
                <div className="text-sm whitespace-pre-wrap"><b>{t.allegations}: </b>{item.allegations}</div>
                {item.reply ? <div className="text-sm whitespace-pre-wrap"><b>{t.yourReply}: </b>{item.reply}</div> : null}
                {item.evidence_ref ? <StoredDocButton value={item.evidence_ref} className="text-xs text-violet-700 underline">{t.evidence}</StoredDocButton> : null}
                {pending && (
                  <button type="button" className="text-xs text-violet-700" onClick={() => { setOpenId(open ? null : item.id); setReply(""); setNames(""); setFile(null); setMsg(""); }}>
                    {open ? t.done : t.reply}
                  </button>
                )}
                {open && pending && (
                  <div className="space-y-2">
                    <Textarea rows={4} value={reply} onChange={(e) => setReply(e.target.value)} placeholder={t.reply} />
                    <Textarea rows={2} value={names} onChange={(e) => setNames(e.target.value)} placeholder={t.witnesses} />
                    <label className="block text-xs text-muted-foreground">
                      {t.file}
                      <input type="file" accept="image/*,.pdf" className="block mt-1 text-sm" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                    </label>
                    <Button type="button" size="sm" disabled={busy || !reply.trim()} onClick={() => submit(item)}>
                      {busy ? <Loader2 size={14} className="animate-spin" /> : t.send}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
          {msg && <div className="text-xs text-emerald-700">{msg}</div>}
        </div>
      )}
    </div>
  );
}
